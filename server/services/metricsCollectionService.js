import { getBlobContent } from "./githubService.js";
import {
  calculateLineMetrics,
  aggregateSourceMetrics,
} from "../utils/sourceMetricsAnalyzer.js";
import { analyzeCommentMetrics } from "../utils/commentAnalyzer.js";

export const DEFAULT_LIMITS = {
  maxFilesAnalyzed: 50,
  maxFileSizeBytes: 256 * 1024, // 256 KB
  concurrencyLimit: 4,
  perFileTimeoutMs: 6000,
  globalTimeoutMs: 20000,
};

/**
 * Validates whether a value is a valid Git Blob SHA (40-64 hex characters).
 */
export const isValidSha = (sha) => {
  return typeof sha === "string" && /^[0-9a-f]{40,64}$/i.test(sha.trim());
};

/**
 * Checks if decoded content appears to be binary.
 */
const isBinaryContent = (content) => {
  return typeof content === "string" && content.includes("\0");
};

/**
 * Strictly validates and decodes Base64 content.
 *
 * Rules:
 * - Rejects non-string input.
 * - Strips standard line breaks (\r, \n) often produced by Git/GitHub.
 * - Empty content is considered valid empty-file content.
 * - Enforces length as a multiple of 4.
 * - Enforces character set [A-Za-z0-9+/] and valid trailing padding (= or ==).
 * - Enforces canonical encoding by decoding and re-encoding to catch invalid padding bits
 *   and inputs that Node.js Buffer would otherwise decode permissively.
 * - Never returns raw file content in error messages.
 */
export const validateAndDecodeBase64 = (rawContent) => {
  if (typeof rawContent !== "string") {
    return {
      valid: false,
      reason: "Blob content must be a string.",
    };
  }

  // GitHub may format base64 with line breaks (\n or \r\n). Strip them.
  const sanitized = rawContent.replace(/[\r\n]/g, "");

  // Empty content is a valid empty file
  if (sanitized.length === 0) {
    return {
      valid: true,
      content: "",
    };
  }

  // Base64 string length must be a multiple of 4
  if (sanitized.length % 4 !== 0) {
    return {
      valid: false,
      reason: "Malformed Base64 content: length must be a multiple of 4.",
    };
  }

  // Strict structural format check: characters [A-Za-z0-9+/] with optional valid padding (= or ==)
  const BASE64_FORMAT = /^[A-Za-z0-9+/]+={0,2}$/;
  if (!BASE64_FORMAT.test(sanitized)) {
    return {
      valid: false,
      reason:
        "Malformed Base64 content: contains invalid characters or misplaced padding.",
    };
  }

  // Canonical Base64 check: decode and re-encode to catch invalid padding bits and permissive decodings
  try {
    const buffer = Buffer.from(sanitized, "base64");
    const canonical = buffer.toString("base64");

    if (canonical !== sanitized) {
      return {
        valid: false,
        reason:
          "Malformed Base64 content: non-canonical encoding or invalid padding bits.",
      };
    }

    return {
      valid: true,
      content: buffer.toString("utf-8"),
    };
  } catch {
    return {
      valid: false,
      reason: "Malformed Base64 content: decoding failed.",
    };
  }
};

/**
 * Processes items with controlled concurrency without external libraries.
 */
const runWithConcurrency = async (items, concurrencyLimit, workerFn) => {
  let currentIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrencyLimit, items.length) },
    async () => {
      while (currentIndex < items.length) {
        const itemIndex = currentIndex++;
        await workerFn(items[itemIndex]);
      }
    }
  );

  await Promise.all(workers);
};

/**
 * Orchestrates safe source-code retrieval and physical line metrics collection.
 *
 * @param {string} owner - GitHub repository owner
 * @param {string} repository - GitHub repository name
 * @param {Array} eligibleFiles - Recognized source files from repository tree
 * @param {Object} options - Configuration overrides and context (e.g. treeTruncated)
 */
export const collectSourceCodeMetrics = async (
  owner,
  repository,
  eligibleFiles = [],
  options = {}
) => {
  const limits = {
    ...DEFAULT_LIMITS,
    ...options.limits,
  };

  const getBlob = options.getBlobFn || getBlobContent;
  const files = Array.isArray(eligibleFiles) ? eligibleFiles : [];

  const limitsConfig = {
    maxFilesAnalyzed: limits.maxFilesAnalyzed,
    maxFileSizeBytes: limits.maxFileSizeBytes,
    concurrencyLimit: limits.concurrencyLimit,
    perFileTimeoutMs: limits.perFileTimeoutMs,
    globalTimeoutMs: limits.globalTimeoutMs,
  };

  if (files.length === 0) {
    const emptyResult = aggregateSourceMetrics([], [], [], {
      eligibleFilesCount: 0,
      treeTruncated: Boolean(options.treeTruncated),
      limits: limitsConfig,
    });

    return {
      success: true,
      data: emptyResult,
    };
  }

  const analyzedFiles = [];
  const skippedFiles = [];
  const failedFiles = [];
  const validCandidates = [];

  // Step 1: Pre-filter files by size validity, size ceiling, and SHA validity.
  for (const file of files) {
    const fileSize = file?.size;

    // Handle missing, invalid, or negative file sizes explicitly
    if (!Number.isFinite(fileSize) || fileSize < 0) {
      failedFiles.push({
        path: file?.path || "unknown",
        language: file?.language || "Unknown",
        reason: "Invalid or missing file size.",
      });
      continue;
    }

    // Enforce file size ceiling
    if (fileSize > limits.maxFileSizeBytes) {
      skippedFiles.push({
        path: file.path,
        language: file.language || "Unknown",
        size: fileSize,
        reason: "file_size_exceeded",
      });
      continue;
    }

    // Validate SHA before scheduling; never use file path as a substitute
    if (!isValidSha(file.sha)) {
      failedFiles.push({
        path: file.path,
        language: file.language || "Unknown",
        reason: "Missing or invalid Git Blob SHA.",
      });
      continue;
    }

    validCandidates.push(file);
  }

  // Step 2: Enforce max files limit.
  const filesToAnalyze = validCandidates.slice(0, limits.maxFilesAnalyzed);
  const excessFiles = validCandidates.slice(limits.maxFilesAnalyzed);

  for (const excess of excessFiles) {
    skippedFiles.push({
      path: excess.path,
      language: excess.language || "Unknown",
      size: Number(excess.size) || 0,
      reason: "max_files_limit_reached",
    });
  }

  // Step 3: Deduplicate by SHA while mapping back to all referencing files.
  const shaToFilesMap = new Map();
  for (const file of filesToAnalyze) {
    const sha = file.sha.trim().toLowerCase();
    if (!shaToFilesMap.has(sha)) {
      shaToFilesMap.set(sha, []);
    }
    shaToFilesMap.get(sha).push(file);
  }

  const uniqueShas = Array.from(shaToFilesMap.keys());

  // Global timeout controller ensures all in-flight requests abort when time expires.
  const globalAbortController = new AbortController();
  // Rate-limit abort controller immediately aborts all in-flight requests when a rate limit is detected.
  const rateLimitAbortController = new AbortController();

  let globalTimedOut = false;
  let rateLimitHit = false;

  const globalTimeoutId = setTimeout(() => {
    globalTimedOut = true;
    globalAbortController.abort();
  }, limits.globalTimeoutMs);

  try {
    await runWithConcurrency(
      uniqueShas,
      limits.concurrencyLimit,
      async (sha) => {
        const mappedFiles = shaToFilesMap.get(sha) || [];

        // Isolate worker execution: unexpected exceptions processing one SHA
        // must never bubble out to reject Promise.all and discard other workers' metrics.
        try {
          // Stop scheduling new requests if rate limit was triggered
          if (rateLimitHit || rateLimitAbortController.signal.aborted) {
            for (const file of mappedFiles) {
              skippedFiles.push({
                path: file.path,
                language: file.language || "Unknown",
                size: Number(file.size) || 0,
                reason: "rate_limit_exceeded",
              });
            }
            return;
          }

          // Stop scheduling if global timeout fired
          if (globalTimedOut || globalAbortController.signal.aborted) {
            for (const file of mappedFiles) {
              failedFiles.push({
                path: file.path,
                language: file.language || "Unknown",
                reason: "Metrics collection timed out or was aborted.",
              });
            }
            return;
          }

          const perFileSignal = AbortSignal.timeout(limits.perFileTimeoutMs);
          const requestSignal = AbortSignal.any([
            globalAbortController.signal,
            rateLimitAbortController.signal,
            perFileSignal,
          ]);

          let result;
          try {
            result = await getBlob(owner, repository, sha, {
              signal: requestSignal,
            });
          } catch (fetchError) {
            result = {
              success: false,
              statusCode: 502,
              timedOut: fetchError?.name === "TimeoutError",
              aborted: fetchError?.name === "AbortError",
              message: fetchError?.message || "Failed to retrieve file content.",
            };
          }

          // 1. Check for primary or secondary rate limits
          if (result.isRateLimit || result.statusCode === 429) {
            rateLimitHit = true;
            rateLimitAbortController.abort(); // Actively abort all other in-flight requests

            for (const file of mappedFiles) {
              skippedFiles.push({
                path: file.path,
                language: file.language || "Unknown",
                size: Number(file.size) || 0,
                reason: "rate_limit_exceeded",
              });
            }
            return;
          }

          // 2. Check if request was cancelled because another worker encountered a rate limit
          if (rateLimitHit || rateLimitAbortController.signal.aborted) {
            for (const file of mappedFiles) {
              skippedFiles.push({
                path: file.path,
                language: file.language || "Unknown",
                size: Number(file.size) || 0,
                reason: "rate_limit_exceeded",
              });
            }
            return;
          }

          // 3. Handle retrieval failure or timeouts
          if (!result.success) {
            let failureReason;
            if (globalTimedOut || globalAbortController.signal.aborted) {
              failureReason = "Metrics collection timed out or was aborted.";
            } else if (result.timedOut || perFileSignal.aborted) {
              failureReason = "File retrieval timed out.";
            } else {
              failureReason =
                result.message || "Failed to retrieve file content.";
            }

            for (const file of mappedFiles) {
              failedFiles.push({
                path: file.path,
                language: file.language || "Unknown",
                reason: failureReason,
              });
            }
            return;
          }

          // 4. Validate Blob response encoding and structure
          if (
            !result.data ||
            result.data.encoding !== "base64" ||
            typeof result.data.content !== "string"
          ) {
            for (const file of mappedFiles) {
              failedFiles.push({
                path: file.path,
                language: file.language || "Unknown",
                reason: "Unsupported or invalid blob content encoding.",
              });
            }
            return;
          }

          // 5. Strictly validate and decode Base64 content
          const decodeResult = validateAndDecodeBase64(result.data.content);
          if (!decodeResult.valid) {
            for (const file of mappedFiles) {
              failedFiles.push({
                path: file.path,
                language: file.language || "Unknown",
                reason: decodeResult.reason,
              });
            }
            return;
          }

          const content = decodeResult.content;

          // 6. Check for binary content
          if (isBinaryContent(content)) {
            for (const file of mappedFiles) {
              skippedFiles.push({
                path: file.path,
                language: file.language || "Unknown",
                size: Number(file.size) || 0,
                reason: "binary_file",
              });
            }
            return;
          }

          // 7. Calculate line metrics once for this SHA
          const lineMetrics = calculateLineMetrics(content);

          // 8. Attribute metrics to every file sharing this SHA, evaluating comment metrics per distinct language and file type
          const commentMetricsCache = new Map();

          for (const file of mappedFiles) {
            const lang = file.language || "Unknown";
            const filePath = file.path || "";
            const lowerPath = filePath.toLowerCase();
            const fileTypeKey = lowerPath.endsWith(".jsx")
              ? "jsx"
              : lowerPath.endsWith(".tsx")
                ? "tsx"
                : "standard";
            const cacheKey = `${lang}:${fileTypeKey}`;

            if (!commentMetricsCache.has(cacheKey)) {
              commentMetricsCache.set(
                cacheKey,
                analyzeCommentMetrics(content, lang, { filePath })
              );
            }
            const commentMetrics = commentMetricsCache.get(cacheKey);

            analyzedFiles.push({
              path: file.path,
              language: lang,
              size: Number(file.size) || 0,
              lines: lineMetrics.totalLines,
              blankLines: lineMetrics.blankLines,
              nonBlankLines: lineMetrics.nonBlankLines,
              singleLineCommentLines: commentMetrics.singleLineCommentLines,
              blockCommentLines: commentMetrics.blockCommentLines,
              totalCommentLines: commentMetrics.totalCommentLines,
              commentLinePercentage: commentMetrics.commentLinePercentage,
              commentSupport: commentMetrics.commentSupport,
              unsupportedReason: commentMetrics.unsupportedReason,
            });
          }
        } catch (unexpectedError) {
          // Isolate failure to this SHA's files; do not reject Promise.all
          for (const file of mappedFiles) {
            failedFiles.push({
              path: file.path,
              language: file.language || "Unknown",
              reason: "Unexpected error during source-code metrics processing.",
            });
          }
        }
      }
    );
  } finally {
    clearTimeout(globalTimeoutId);
  }

  const aggregated = aggregateSourceMetrics(
    analyzedFiles,
    skippedFiles,
    failedFiles,
    {
      eligibleFilesCount: files.length,
      treeTruncated: Boolean(options.treeTruncated),
      rateLimitHit,
      timedOut: globalTimedOut,
      limits: limitsConfig,
    }
  );

  return {
    success: true,
    data: aggregated,
  };
};
