import test from "node:test";
import assert from "node:assert/strict";

import { collectSourceCodeMetrics } from "../services/metricsCollectionService.js";

// Helper to encode utf-8 string as base64
const toBase64 = (str) => Buffer.from(str, "utf-8").toString("base64");

// Valid 40-character hex SHA generator for tests
const createSha = (id) => id.repeat(40).slice(0, 40);

// =========================================================================
// 1. Truncated tree with zero source files
// =========================================================================
test("collectSourceCodeMetrics (Req 1): truncated tree with zero source files returns partial and isComplete: false", async () => {
  const result = await collectSourceCodeMetrics("owner", "repo", [], {
    treeTruncated: true,
  });

  assert.equal(result.success, true);
  assert.equal(result.data.status, "partial");
  assert.equal(result.data.dataCompleteness, "partial");
  assert.equal(result.data.isComplete, false);
  assert.match(result.data.explanation, /tree was truncated by GitHub/i);
});

// =========================================================================
// 2. Complete tree with zero source files
// =========================================================================
test("collectSourceCodeMetrics (Req 2): complete tree with zero source files returns no_source_files and isComplete: true", async () => {
  const result = await collectSourceCodeMetrics("owner", "repo", [], {
    treeTruncated: false,
  });

  assert.equal(result.success, true);
  assert.equal(result.data.status, "no_source_files");
  assert.equal(result.data.dataCompleteness, "complete");
  assert.equal(result.data.isComplete, true);
  assert.match(result.data.explanation, /No source files were found/i);
});

// =========================================================================
// 3 & 4. Rate-limit detection while multiple requests are in flight & Cancellation handling
// =========================================================================
test("collectSourceCodeMetrics (Req 3 & 4): rate-limit detection aborts in-flight requests and records cancelled files as skipped", async () => {
  const sha1 = createSha("1");
  const sha2 = createSha("2");
  const sha3 = createSha("3");
  const sha4 = createSha("4");

  const eligibleFiles = [
    { path: "src/file1.js", language: "JavaScript", size: 100, sha: sha1 },
    { path: "src/file2.js", language: "JavaScript", size: 100, sha: sha2 },
    { path: "src/file3.js", language: "JavaScript", size: 100, sha: sha3 },
    { path: "src/file4.js", language: "JavaScript", size: 100, sha: sha4 },
  ];

  let sha1Resolved = false;

  const mockBlobGetter = async (owner, repo, sha, opts) => {
    if (sha === sha1) {
      // Return rate limit for sha1
      sha1Resolved = true;
      return {
        success: false,
        statusCode: 429,
        isRateLimit: true,
        message: "GitHub API rate limit exceeded.",
      };
    }

    // For other in-flight requests, wait for abort signal triggered by rateLimitAbortController
    return new Promise((resolve) => {
      opts.signal.addEventListener("abort", () => {
        resolve({
          success: false,
          statusCode: 499,
          aborted: true,
          message: "Request aborted.",
        });
      });
    });
  };

  const result = await collectSourceCodeMetrics("owner", "repo", eligibleFiles, {
    getBlobFn: mockBlobGetter,
    limits: { concurrencyLimit: 4 },
  });

  assert.equal(result.success, true);
  assert.equal(result.data.status, "unavailable"); // 0 files successfully analyzed
  assert.equal(result.data.fileCounts.analyzed, 0);

  // Intentionally cancelled in-flight requests are counted in skippedFiles, NOT failedFiles
  assert.equal(result.data.fileCounts.failed, 0);
  assert.equal(result.data.fileCounts.skipped, 4);

  for (const skipped of result.data.skippedFiles) {
    assert.equal(skipped.reason, "rate_limit_exceeded");
  }

  assert.match(result.data.explanation, /rate limit/i);
});

test("collectSourceCodeMetrics (Req 4): preserves previously collected metrics when rate limit is detected later", async () => {
  const sha1 = createSha("a");
  const sha2 = createSha("b");

  const eligibleFiles = [
    { path: "src/good.js", language: "JavaScript", size: 100, sha: sha1 },
    { path: "src/limited.js", language: "JavaScript", size: 100, sha: sha2 },
  ];

  const mockBlobGetter = async (owner, repo, sha) => {
    if (sha === sha1) {
      return {
        success: true,
        data: {
          sha,
          size: 100,
          encoding: "base64",
          content: toBase64("const a = 1;\nconst b = 2;\n"),
        },
      };
    }
    return {
      success: false,
      statusCode: 429,
      isRateLimit: true,
      message: "GitHub API rate limit exceeded.",
    };
  };

  const result = await collectSourceCodeMetrics("owner", "repo", eligibleFiles, {
    getBlobFn: mockBlobGetter,
    limits: { concurrencyLimit: 1 },
  });

  assert.equal(result.data.status, "partial");
  assert.equal(result.data.fileCounts.analyzed, 1);
  assert.equal(result.data.fileCounts.skipped, 1);
  assert.equal(result.data.fileCounts.failed, 0);
  assert.equal(result.data.summary.totalLines, 2);
  assert.equal(result.data.skippedFiles[0].reason, "rate_limit_exceeded");
});

// =========================================================================
// 5. Per-file timeout
// =========================================================================
test("collectSourceCodeMetrics (Req 5): per-file timeout records failure and does not abort batch", async () => {
  const sha1 = createSha("1");
  const sha2 = createSha("2");

  const eligibleFiles = [
    { path: "src/fast.js", language: "JavaScript", size: 50, sha: sha1 },
    { path: "src/slow.js", language: "JavaScript", size: 50, sha: sha2 },
  ];

  const mockBlobGetter = async (owner, repo, sha) => {
    if (sha === sha1) {
      return {
        success: true,
        data: {
          sha,
          size: 50,
          encoding: "base64",
          content: toBase64("const fast = true;\n"),
        },
      };
    }
    // Simulate per-file timeout
    return {
      success: false,
      statusCode: 504,
      timedOut: true,
      message: "GitHub blob request timed out.",
    };
  };

  const result = await collectSourceCodeMetrics("owner", "repo", eligibleFiles, {
    getBlobFn: mockBlobGetter,
    limits: { concurrencyLimit: 1 },
  });

  assert.equal(result.data.status, "partial");
  assert.equal(result.data.fileCounts.analyzed, 1);
  assert.equal(result.data.fileCounts.failed, 1);
  assert.equal(result.data.failedFiles[0].path, "src/slow.js");
  assert.equal(result.data.failedFiles[0].reason, "File retrieval timed out.");
});

// =========================================================================
// 6. Global timeout
// =========================================================================
test("collectSourceCodeMetrics (Req 6): global timeout actively aborts outstanding requests and stops scheduling", async () => {
  const sha1 = createSha("1");

  const eligibleFiles = [
    { path: "src/hang.js", language: "JavaScript", size: 50, sha: sha1 },
  ];

  let abortedReceived = false;

  const mockBlobGetter = async (owner, repo, sha, opts) => {
    return new Promise((resolve) => {
      opts.signal.addEventListener("abort", () => {
        abortedReceived = true;
        resolve({
          success: false,
          statusCode: 499,
          aborted: true,
          message: "Aborted by controller.",
        });
      });
    });
  };

  const result = await collectSourceCodeMetrics("owner", "repo", eligibleFiles, {
    getBlobFn: mockBlobGetter,
    limits: {
      globalTimeoutMs: 30, // 30ms global timeout
      perFileTimeoutMs: 5000,
    },
  });

  assert.equal(abortedReceived, true);
  assert.equal(result.data.status, "unavailable");
  assert.equal(result.data.fileCounts.failed, 1);
  assert.match(result.data.failedFiles[0].reason, /timed out or was aborted/i);
});

// =========================================================================
// 7. Missing or invalid Blob SHA
// =========================================================================
test("collectSourceCodeMetrics (Req 7): missing or invalid Git Blob SHA fails without network call and never uses path", async () => {
  let networkCallCount = 0;

  const eligibleFiles = [
    { path: "src/no-sha.js", language: "JavaScript", size: 100, sha: null },
    { path: "src/invalid-sha.js", language: "JavaScript", size: 100, sha: "not-a-valid-sha" },
  ];

  const mockBlobGetter = async () => {
    networkCallCount++;
    return { success: true };
  };

  const result = await collectSourceCodeMetrics("owner", "repo", eligibleFiles, {
    getBlobFn: mockBlobGetter,
  });

  assert.equal(networkCallCount, 0); // No network calls made!
  assert.equal(result.data.fileCounts.analyzed, 0);
  assert.equal(result.data.fileCounts.failed, 2);

  assert.equal(result.data.failedFiles[0].path, "src/no-sha.js");
  assert.equal(result.data.failedFiles[0].reason, "Missing or invalid Git Blob SHA.");

  assert.equal(result.data.failedFiles[1].path, "src/invalid-sha.js");
  assert.equal(result.data.failedFiles[1].reason, "Missing or invalid Git Blob SHA.");
});

// =========================================================================
// 8. Invalid file size
// =========================================================================
test("collectSourceCodeMetrics (Req 8): handles missing, NaN, or negative file sizes explicitly in failedFiles", async () => {
  let networkCallCount = 0;

  const eligibleFiles = [
    { path: "src/negative.js", language: "JavaScript", size: -50, sha: createSha("1") },
    { path: "src/nan.js", language: "JavaScript", size: NaN, sha: createSha("2") },
    { path: "src/missing.js", language: "JavaScript", size: undefined, sha: createSha("3") },
  ];

  const mockBlobGetter = async () => {
    networkCallCount++;
    return { success: true };
  };

  const result = await collectSourceCodeMetrics("owner", "repo", eligibleFiles, {
    getBlobFn: mockBlobGetter,
  });

  assert.equal(networkCallCount, 0);
  assert.equal(result.data.fileCounts.failed, 3);
  for (const failed of result.data.failedFiles) {
    assert.equal(failed.reason, "Invalid or missing file size.");
  }
});

// =========================================================================
// 10. Duplicate SHA attribution across multiple files and languages
// =========================================================================
test("collectSourceCodeMetrics (Req 10): duplicate SHA triggers 1 fetch and attributes metrics across distinct files and languages", async () => {
  let blobFetchCount = 0;
  const sharedSha = createSha("c");

  const eligibleFiles = [
    { path: "src/component.jsx", language: "JavaScript", size: 100, sha: sharedSha },
    { path: "src/types.d.ts", language: "TypeScript", size: 100, sha: sharedSha },
  ];

  const mockBlobGetter = async (owner, repo, sha) => {
    blobFetchCount++;
    return {
      success: true,
      data: {
        sha,
        size: 100,
        encoding: "base64",
        content: toBase64("// shared code\nconst count = 10;\n\nexport default count;\n"),
      },
    };
  };

  const result = await collectSourceCodeMetrics("owner", "repo", eligibleFiles, {
    getBlobFn: mockBlobGetter,
  });

  assert.equal(blobFetchCount, 1); // Exactly 1 fetch
  assert.equal(result.data.fileCounts.analyzed, 2);

  // Each file has 4 lines (3 non-blank, 1 blank)
  // Total lines = 4 * 2 = 8
  assert.equal(result.data.summary.totalLines, 8);
  assert.equal(result.data.summary.blankLines, 2);
  assert.equal(result.data.summary.nonBlankLines, 6);

  // Verify language breakdown attributes to each file's own language
  assert.deepEqual(result.data.languages.JavaScript, {
    filesAnalyzed: 1,
    totalLines: 4,
    blankLines: 1,
    nonBlankLines: 3,
  });

  assert.deepEqual(result.data.languages.TypeScript, {
    filesAnalyzed: 1,
    totalLines: 4,
    blankLines: 1,
    nonBlankLines: 3,
  });
});

// =========================================================================
// 11. Exact file accounting across analyzed, skipped, and failed outcomes
// =========================================================================
test("collectSourceCodeMetrics (Req 11): exact file accounting across analyzed, skipped, and failed outcomes", async () => {
  const validSha1 = createSha("1");
  const validSha2 = createSha("2");
  const binSha = createSha("3");

  const eligibleFiles = [
    // 2 files analyzed
    { path: "src/file1.js", language: "JavaScript", size: 100, sha: validSha1 },
    { path: "src/file2.js", language: "JavaScript", size: 100, sha: validSha2 },
    // 1 skipped: file_size_exceeded
    { path: "src/huge.js", language: "JavaScript", size: 500000, sha: createSha("4") },
    // 1 skipped: binary_file
    { path: "src/binary.dat", language: "JavaScript", size: 100, sha: binSha },
    // 1 failed: missing SHA
    { path: "src/no-sha.js", language: "JavaScript", size: 100, sha: null },
    // 1 failed: invalid file size
    { path: "src/bad-size.js", language: "JavaScript", size: -1, sha: createSha("5") },
  ];

  const mockBlobGetter = async (owner, repo, sha) => {
    if (sha === binSha) {
      return {
        success: true,
        data: {
          sha,
          size: 100,
          encoding: "base64",
          content: toBase64("binary\0data"),
        },
      };
    }
    return {
      success: true,
      data: {
        sha,
        size: 100,
        encoding: "base64",
        content: toBase64("const x = 1;\n"),
      },
    };
  };

  const result = await collectSourceCodeMetrics("owner", "repo", eligibleFiles, {
    getBlobFn: mockBlobGetter,
  });

  assert.equal(result.data.fileCounts.eligibleSourceFiles, 6);
  assert.equal(result.data.fileCounts.analyzed, 2);
  assert.equal(result.data.fileCounts.skipped, 2); // huge (size) + binary
  assert.equal(result.data.fileCounts.failed, 2);  // no-sha + bad-size

  // Exact equation check: analyzed + skipped + failed === eligibleSourceFiles
  const totalAccounted =
    result.data.fileCounts.analyzed +
    result.data.fileCounts.skipped +
    result.data.fileCounts.failed;
  assert.equal(totalAccounted, result.data.fileCounts.eligibleSourceFiles);

  // Verify limits reporting contains both timeout properties
  assert.equal(result.data.limits.perFileTimeoutMs, 6000);
  assert.equal(result.data.limits.globalTimeoutMs, 20000);
});

// =========================================================================
// 12. Unrelated response with a Retry-After header
// =========================================================================
test("collectSourceCodeMetrics (Req 12): unrelated 503 response with Retry-After header is NOT treated as rate limit", async () => {
  const sha1 = createSha("1");
  const eligibleFiles = [
    { path: "src/service-down.js", language: "JavaScript", size: 100, sha: sha1 },
  ];

  const mockBlobGetter = async () => {
    return {
      success: false,
      statusCode: 503,
      isRateLimit: false, // Correctly distinguished as NOT a rate limit
      message: "GitHub service is temporarily unavailable.",
    };
  };

  const result = await collectSourceCodeMetrics("owner", "repo", eligibleFiles, {
    getBlobFn: mockBlobGetter,
  });

  assert.equal(result.data.status, "unavailable");
  assert.equal(result.data.fileCounts.failed, 1);
  assert.equal(result.data.fileCounts.skipped, 0); // Not marked as skipped due to rate limit!
  assert.match(result.data.failedFiles[0].reason, /temporarily unavailable/i);
});

// =========================================================================
// Correction 2: Strict Base64 Validation Unit and Integration Tests
// =========================================================================
test("validateAndDecodeBase64: handles valid Base64 and valid empty content", async () => {
  const { validateAndDecodeBase64 } = await import(
    "../services/metricsCollectionService.js"
  );

  // Valid Base64
  const valid = validateAndDecodeBase64(toBase64("console.log('hello');\n"));
  assert.equal(valid.valid, true);
  assert.equal(valid.content, "console.log('hello');\n");

  // Valid empty string
  const empty = validateAndDecodeBase64("");
  assert.equal(empty.valid, true);
  assert.equal(empty.content, "");

  // Valid Base64 with GitHub newlines
  const withNewlines = validateAndDecodeBase64(
    toBase64("const a = 1;") + "\n"
  );
  assert.equal(withNewlines.valid, true);
  assert.equal(withNewlines.content, "const a = 1;");
});

test("validateAndDecodeBase64: rejects malformed characters, invalid padding, and permissive invalid content", async () => {
  const { validateAndDecodeBase64 } = await import(
    "../services/metricsCollectionService.js"
  );

  // Non-string input
  assert.equal(validateAndDecodeBase64(null).valid, false);
  assert.equal(validateAndDecodeBase64(12345).valid, false);

  // Malformed characters (e.g. contains '!' or '@')
  const malformedChars = validateAndDecodeBase64("Y29uc3!geCA9IDE7");
  assert.equal(malformedChars.valid, false);
  assert.match(malformedChars.reason, /invalid characters/i);

  // Invalid length (not a multiple of 4)
  const invalidLength = validateAndDecodeBase64("abc");
  assert.equal(invalidLength.valid, false);
  assert.match(invalidLength.reason, /multiple of 4/i);

  // Invalid padding: 3 padding characters
  const triplePadding = validateAndDecodeBase64("A===");
  assert.equal(triplePadding.valid, false);
  assert.match(triplePadding.reason, /misplaced padding/i);

  // Invalid padding: misplaced padding in the middle
  const misplacedPadding = validateAndDecodeBase64("A=AA");
  assert.equal(misplacedPadding.valid, false);
  assert.match(misplacedPadding.reason, /misplaced padding/i);

  // Permissive invalid content: 'abd=' has invalid padding bits (Node Buffer decodes it permissively)
  const invalidPaddingBits = validateAndDecodeBase64("abd=");
  assert.equal(invalidPaddingBits.valid, false);
  assert.match(invalidPaddingBits.reason, /non-canonical/i);

  // Permissive invalid content: 'AB==' has non-zero unused bits (Node Buffer decodes it permissively)
  const invalidUnusedBits = validateAndDecodeBase64("AB==");
  assert.equal(invalidUnusedBits.valid, false);
  assert.match(invalidUnusedBits.reason, /non-canonical/i);
});

test("collectSourceCodeMetrics (Correction 2): records malformed Base64 content as failed without exposing raw content", async () => {
  const sha1 = createSha("1");
  const eligibleFiles = [
    { path: "src/corrupt.js", language: "JavaScript", size: 100, sha: sha1 },
  ];

  const mockBlobGetter = async () => ({
    success: true,
    data: {
      sha: sha1,
      size: 100,
      encoding: "base64",
      content: "abd=", // Invalid canonical padding bits
    },
  });

  const result = await collectSourceCodeMetrics("owner", "repo", eligibleFiles, {
    getBlobFn: mockBlobGetter,
  });

  assert.equal(result.data.fileCounts.failed, 1);
  assert.equal(result.data.fileCounts.analyzed, 0);
  assert.equal(result.data.failedFiles[0].path, "src/corrupt.js");
  assert.match(result.data.failedFiles[0].reason, /non-canonical/i);
  // Verify raw source content is never exposed in the response
  assert.equal(JSON.stringify(result).includes("abd="), false);
});

// =========================================================================
// Correction 3: Isolate Unexpected Worker Failures
// =========================================================================
test("collectSourceCodeMetrics (Correction 3): unexpected worker exception isolates failure, allows other workers to succeed, and preserves accounting", async () => {
  const shaGood = createSha("1");
  const shaExploding = createSha("2");

  const eligibleFiles = [
    { path: "src/good.js", language: "JavaScript", size: 100, sha: shaGood },
    { path: "src/exploding.js", language: "JavaScript", size: 100, sha: shaExploding },
  ];

  const mockBlobGetter = async (owner, repo, sha) => {
    if (sha === shaGood) {
      return {
        success: true,
        data: {
          sha: shaGood,
          size: 100,
          encoding: "base64",
          content: toBase64("const good = 1;\n"),
        },
      };
    }
    // Unexpected internal throw in worker for shaExploding
    throw new Error("Catastrophic disk or memory explosion during blob retrieval!");
  };

  const result = await collectSourceCodeMetrics("owner", "repo", eligibleFiles, {
    getBlobFn: mockBlobGetter,
    limits: { concurrencyLimit: 2 },
  });

  assert.equal(result.success, true);
  // The good file succeeded
  assert.equal(result.data.fileCounts.analyzed, 1);
  assert.equal(result.data.summary.totalLines, 1);

  // The exploding file failed cleanly without crashing the batch
  assert.equal(result.data.fileCounts.failed, 1);
  assert.equal(result.data.failedFiles[0].path, "src/exploding.js");
  assert.match(result.data.failedFiles[0].reason, /Catastrophic disk or memory explosion/i);

  // Exact accounting invariant
  const totalAccounted =
    result.data.fileCounts.analyzed +
    result.data.fileCounts.skipped +
    result.data.fileCounts.failed;
  assert.equal(totalAccounted, result.data.fileCounts.eligibleSourceFiles);
  assert.equal(totalAccounted, 2);
});

// =========================================================================
// Correction 4: Correct Secondary Rate-Limit Detection Tests
// =========================================================================
test("handleGitHubResponse (Correction 4): secondary rate-limit 403 response detected from message", async () => {
  const { handleGitHubResponse } = await import("../services/githubService.js");

  const mockResponse = {
    ok: false,
    status: 403,
    headers: new Headers({
      "retry-after": "60",
    }),
    json: async () => ({
      message: "You have exceeded a secondary rate limit. Please wait a few minutes before you try again.",
      documentation_url: "https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits",
    }),
  };

  const result = await handleGitHubResponse(mockResponse);
  assert.equal(result.success, false);
  assert.equal(result.statusCode, 429);
  assert.equal(result.isRateLimit, true);
  assert.match(result.message, /secondary rate limit/i);
});

test("handleGitHubResponse (Correction 4): permission-denied 403 with Retry-After is NOT a rate limit", async () => {
  const { handleGitHubResponse } = await import("../services/githubService.js");

  const mockResponse = {
    ok: false,
    status: 403,
    headers: new Headers({
      "retry-after": "60",
      "x-ratelimit-remaining": "4950",
    }),
    json: async () => ({
      message: "Resource not accessible by integration",
    }),
  };

  const result = await handleGitHubResponse(mockResponse);
  assert.equal(result.success, false);
  assert.equal(result.statusCode, 403);
  assert.equal(result.isRateLimit, false);
  assert.match(result.message, /denied/i);
});

test("handleGitHubResponse (Correction 4): primary rate-limit 403 with x-ratelimit-remaining 0", async () => {
  const { handleGitHubResponse } = await import("../services/githubService.js");

  const mockResponse = {
    ok: false,
    status: 403,
    headers: new Headers({
      "x-ratelimit-remaining": "0",
    }),
    json: async () => ({
      message: "API rate limit exceeded for user",
    }),
  };

  const result = await handleGitHubResponse(mockResponse);
  assert.equal(result.success, false);
  assert.equal(result.statusCode, 429);
  assert.equal(result.isRateLimit, true);
  assert.match(result.message, /rate limit exceeded/i);
});

test("handleGitHubResponse (Correction 4): HTTP 429 response is always treated as rate limit", async () => {
  const { handleGitHubResponse } = await import("../services/githubService.js");

  const mockResponse = {
    ok: false,
    status: 429,
    headers: new Headers(),
    json: async () => ({
      message: "Too Many Requests",
    }),
  };

  const result = await handleGitHubResponse(mockResponse);
  assert.equal(result.success, false);
  assert.equal(result.statusCode, 429);
  assert.equal(result.isRateLimit, true);
  assert.match(result.message, /rate limit exceeded/i);
});

test("handleGitHubResponse (Correction 4): HTTP 503 with Retry-After is NOT treated as rate limit", async () => {
  const { handleGitHubResponse } = await import("../services/githubService.js");

  const mockResponse = {
    ok: false,
    status: 503,
    headers: new Headers({
      "retry-after": "30",
    }),
    json: async () => ({
      message: "Service Unavailable",
    }),
  };

  const result = await handleGitHubResponse(mockResponse);
  assert.equal(result.success, false);
  assert.equal(result.statusCode, 503);
  assert.equal(result.isRateLimit, false);
  assert.match(result.message, /temporarily unavailable/i);
});
