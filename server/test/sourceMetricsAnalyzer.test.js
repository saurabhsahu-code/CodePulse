import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateLineMetrics,
  determineCompletenessStatus,
  aggregateSourceMetrics,
} from "../utils/sourceMetricsAnalyzer.js";

// ==========================================
// 1. calculateLineMetrics Unit Tests
// ==========================================

test("calculateLineMetrics: handles empty content and non-strings as 0 lines", () => {
  assert.deepEqual(calculateLineMetrics(""), {
    totalLines: 0,
    blankLines: 0,
    nonBlankLines: 0,
  });

  assert.deepEqual(calculateLineMetrics(null), {
    totalLines: 0,
    blankLines: 0,
    nonBlankLines: 0,
  });

  assert.deepEqual(calculateLineMetrics(undefined), {
    totalLines: 0,
    blankLines: 0,
    nonBlankLines: 0,
  });
});

test("calculateLineMetrics: handles single line without trailing newline", () => {
  const result = calculateLineMetrics("const answer = 42;");
  assert.deepEqual(result, {
    totalLines: 1,
    blankLines: 0,
    nonBlankLines: 1,
  });
});

test("calculateLineMetrics: handles single line with trailing LF", () => {
  const result = calculateLineMetrics("const answer = 42;\n");
  assert.deepEqual(result, {
    totalLines: 1,
    blankLines: 0,
    nonBlankLines: 1,
  });
});

test("calculateLineMetrics: handles single line with trailing CRLF", () => {
  const result = calculateLineMetrics("const answer = 42;\r\n");
  assert.deepEqual(result, {
    totalLines: 1,
    blankLines: 0,
    nonBlankLines: 1,
  });
});

test("calculateLineMetrics: handles single line with trailing CR", () => {
  const result = calculateLineMetrics("const answer = 42;\r");
  assert.deepEqual(result, {
    totalLines: 1,
    blankLines: 0,
    nonBlankLines: 1,
  });
});

test("calculateLineMetrics: handles multiline LF with mixed blank lines", () => {
  const content = "import os\n\ndef main():\n    pass\n";
  const result = calculateLineMetrics(content);
  assert.deepEqual(result, {
    totalLines: 4,
    blankLines: 1,
    nonBlankLines: 3,
  });
});

test("calculateLineMetrics: handles multiline CRLF with mixed blank lines", () => {
  const content = "package main\r\n\r\nfunc main() {\r\n}\r\n";
  const result = calculateLineMetrics(content);
  assert.deepEqual(result, {
    totalLines: 4,
    blankLines: 1,
    nonBlankLines: 3,
  });
});

test("calculateLineMetrics: handles file with only a single newline (1 blank line)", () => {
  assert.deepEqual(calculateLineMetrics("\n"), {
    totalLines: 1,
    blankLines: 1,
    nonBlankLines: 0,
  });

  assert.deepEqual(calculateLineMetrics("\r\n"), {
    totalLines: 1,
    blankLines: 1,
    nonBlankLines: 0,
  });
});

test("calculateLineMetrics: handles file with multiple blank lines and spaces/tabs", () => {
  const content = "   \n\t\t\n   \r\n";
  const result = calculateLineMetrics(content);
  assert.deepEqual(result, {
    totalLines: 3,
    blankLines: 3,
    nonBlankLines: 0,
  });
});

test("calculateLineMetrics: handles unicode and multibyte characters accurately", () => {
  const content =
    "// こんにちは世界\nconst greeting = '👋';\n\nconsole.log(greeting);\n";
  const result = calculateLineMetrics(content);
  assert.deepEqual(result, {
    totalLines: 4,
    blankLines: 1,
    nonBlankLines: 3,
  });
});

// ==========================================
// 2. determineCompletenessStatus Precedence Tests
// ==========================================

test("determineCompletenessStatus: complete tree with zero source files produces no_source_files and isComplete: true", () => {
  const result = determineCompletenessStatus({
    eligibleFilesCount: 0,
    analyzedFilesCount: 0,
    treeTruncated: false,
  });

  assert.equal(result.status, "no_source_files");
  assert.equal(result.dataCompleteness, "complete");
  assert.equal(result.isComplete, true);
  assert.match(result.explanation, /No source files were found/i);
});

test("determineCompletenessStatus: truncated tree with zero discovered source files produces partial and isComplete: false", () => {
  const result = determineCompletenessStatus({
    eligibleFilesCount: 0,
    analyzedFilesCount: 0,
    treeTruncated: true,
  });

  assert.equal(result.status, "partial");
  assert.equal(result.dataCompleteness, "partial");
  assert.equal(result.isComplete, false);
  assert.match(result.explanation, /tree was truncated by GitHub/i);
});

test("determineCompletenessStatus: returns unavailable when analyzed is 0 and failures occurred", () => {
  const result = determineCompletenessStatus({
    eligibleFilesCount: 5,
    analyzedFilesCount: 0,
    failedFilesCount: 5,
    treeTruncated: false,
  });

  assert.equal(result.status, "unavailable");
  assert.equal(result.dataCompleteness, "unavailable");
  assert.equal(result.isComplete, false);
});

test("determineCompletenessStatus: returns unavailable with specific explanation on rate limit with 0 analyzed", () => {
  const result = determineCompletenessStatus({
    eligibleFilesCount: 10,
    analyzedFilesCount: 0,
    rateLimitHit: true,
    treeTruncated: false,
  });

  assert.equal(result.status, "unavailable");
  assert.equal(result.isComplete, false);
  assert.match(result.explanation, /rate limit/i);
});

test("determineCompletenessStatus: returns partial when rate limit is hit after analyzing some files", () => {
  const result = determineCompletenessStatus({
    eligibleFilesCount: 20,
    analyzedFilesCount: 8,
    skippedFilesCount: 12,
    rateLimitHit: true,
    treeTruncated: false,
  });

  assert.equal(result.status, "partial");
  assert.equal(result.dataCompleteness, "partial");
  assert.equal(result.isComplete, false);
  assert.match(result.explanation, /rate limit/i);
});

test("determineCompletenessStatus: truncated tree must never be reported as complete, even if all files analyzed", () => {
  const result = determineCompletenessStatus({
    eligibleFilesCount: 50,
    analyzedFilesCount: 50,
    treeTruncated: true,
  });

  assert.equal(result.status, "partial");
  assert.equal(result.dataCompleteness, "partial");
  assert.equal(result.isComplete, false);
  assert.match(result.explanation, /tree was truncated/i);
});

test("determineCompletenessStatus: returns partial when some files failed retrieval", () => {
  const result = determineCompletenessStatus({
    eligibleFilesCount: 10,
    analyzedFilesCount: 8,
    failedFilesCount: 2,
    treeTruncated: false,
  });

  assert.equal(result.status, "partial");
  assert.equal(result.isComplete, false);
  assert.match(result.explanation, /2 file\(s\) failed/i);
});

test("determineCompletenessStatus: returns partial on global timeout", () => {
  const result = determineCompletenessStatus({
    eligibleFilesCount: 30,
    analyzedFilesCount: 15,
    timedOut: true,
    treeTruncated: false,
  });

  assert.equal(result.status, "partial");
  assert.equal(result.isComplete, false);
  assert.match(result.explanation, /timed out/i);
});

test("determineCompletenessStatus: precedence - failure/truncation overrides limit_reached", () => {
  // Both limit_reached condition (skipped files) and failure condition (treeTruncated) present:
  const result = determineCompletenessStatus({
    eligibleFilesCount: 100,
    analyzedFilesCount: 40,
    skippedFilesCount: 60,
    treeTruncated: true,
  });

  assert.equal(result.status, "partial");
  assert.equal(result.dataCompleteness, "partial");
  assert.equal(result.isComplete, false);
});

test("determineCompletenessStatus: returns limit_reached when files were skipped without any errors or truncation", () => {
  const skippedFiles = Array.from({ length: 15 }, (_, i) => ({
    path: `src/extra_${i}.js`,
    reason: "max_files_limit_reached",
  }));
  const result = determineCompletenessStatus({
    eligibleFilesCount: 65,
    analyzedFilesCount: 50,
    skippedFilesCount: 15,
    failedFilesCount: 0,
    skippedFiles,
    treeTruncated: false,
    rateLimitHit: false,
  });

  assert.equal(result.status, "limit_reached");
  assert.equal(result.dataCompleteness, "partial");
  assert.equal(result.isComplete, false);
  assert.match(result.explanation, /safety limits/i);
});

test("determineCompletenessStatus: returns partial when skipped files exist without skip-reason details", () => {
  const result = determineCompletenessStatus({
    eligibleFilesCount: 2,
    analyzedFilesCount: 0,
    skippedFilesCount: 2,
  });

  assert.equal(result.status, "partial");
  assert.equal(result.dataCompleteness, "partial");
  assert.equal(result.isComplete, false);
});

test("determineCompletenessStatus: returns complete when all eligible files are analyzed with 0 errors/skips", () => {
  const result = determineCompletenessStatus({
    eligibleFilesCount: 12,
    analyzedFilesCount: 12,
    skippedFilesCount: 0,
    failedFilesCount: 0,
    treeTruncated: false,
  });

  assert.equal(result.status, "complete");
  assert.equal(result.dataCompleteness, "complete");
  assert.equal(result.isComplete, true);
  assert.match(result.explanation, /Successfully analyzed/i);
});

// ==========================================
// Correction 1: Completeness status tests
// ==========================================

test("determineCompletenessStatus (Correction 1): returns limit_reached when all files exceed the size limit", () => {
  const skippedFiles = [
    { path: "src/big1.js", reason: "file_size_exceeded" },
    { path: "src/big2.js", reason: "file_size_exceeded" },
  ];
  const result = determineCompletenessStatus({
    eligibleFilesCount: 2,
    analyzedFilesCount: 0,
    skippedFilesCount: 2,
    failedFilesCount: 0,
    skippedFiles,
    treeTruncated: false,
  });

  assert.equal(result.status, "limit_reached");
  assert.equal(result.dataCompleteness, "partial");
  assert.equal(result.isComplete, false);
  assert.match(result.explanation, /safety limits/i);
});

test("determineCompletenessStatus (Correction 1): returns limit_reached when all files exceed max file-processing count", () => {
  const skippedFiles = [
    { path: "src/file1.js", reason: "max_files_limit_reached" },
    { path: "src/file2.js", reason: "max_files_limit_reached" },
  ];
  const result = determineCompletenessStatus({
    eligibleFilesCount: 2,
    analyzedFilesCount: 0,
    skippedFilesCount: 2,
    failedFilesCount: 0,
    skippedFiles,
    treeTruncated: false,
  });

  assert.equal(result.status, "limit_reached");
  assert.equal(result.dataCompleteness, "partial");
  assert.equal(result.isComplete, false);
});

test("determineCompletenessStatus (Correction 1): returns partial (never complete) when all files are binary", () => {
  const skippedFiles = [
    { path: "src/bin1.dat", reason: "binary_file" },
    { path: "src/bin2.dat", reason: "binary_file" },
  ];
  const result = determineCompletenessStatus({
    eligibleFilesCount: 2,
    analyzedFilesCount: 0,
    skippedFilesCount: 2,
    failedFilesCount: 0,
    skippedFiles,
    treeTruncated: false,
  });

  assert.equal(result.status, "partial");
  assert.equal(result.dataCompleteness, "partial");
  assert.equal(result.isComplete, false);
  assert.notEqual(result.status, "complete");
  assert.match(result.explanation, /binary files/i);
});

test("determineCompletenessStatus (Correction 1): returns partial for a mixture of analyzed, skipped, and failed files", () => {
  const skippedFiles = [
    { path: "src/big.js", reason: "file_size_exceeded" },
  ];
  const result = determineCompletenessStatus({
    eligibleFilesCount: 3,
    analyzedFilesCount: 1,
    skippedFilesCount: 1,
    failedFilesCount: 1,
    skippedFiles,
    treeTruncated: false,
  });

  assert.equal(result.status, "partial");
  assert.equal(result.dataCompleteness, "partial");
  assert.equal(result.isComplete, false);
});

// ==========================================
// 3. aggregateSourceMetrics Unit Tests
// ==========================================

test("aggregateSourceMetrics: aggregates line totals, percentages, and languages correctly", () => {
  const analyzedFiles = [
    {
      path: "src/index.js",
      language: "JavaScript",
      size: 500,
      lines: 20,
      blankLines: 4,
      nonBlankLines: 16,
    },
    {
      path: "src/util.js",
      language: "JavaScript",
      size: 300,
      lines: 30,
      blankLines: 6,
      nonBlankLines: 24,
    },
    {
      path: "src/types.ts",
      language: "TypeScript",
      size: 400,
      lines: 50,
      blankLines: 10,
      nonBlankLines: 40,
    },
  ];

  const result = aggregateSourceMetrics(analyzedFiles, [], [], {
    eligibleFilesCount: 3,
    limits: {
      maxFilesAnalyzed: 50,
      maxFileSizeBytes: 262144,
      concurrencyLimit: 4,
      perFileTimeoutMs: 6000,
      globalTimeoutMs: 20000,
    },
  });

  assert.equal(result.status, "complete");
  assert.equal(result.isComplete, true);
  assert.equal(result.summary.totalLines, 100);
  assert.equal(result.summary.blankLines, 20);
  assert.equal(result.summary.nonBlankLines, 80);
  assert.equal(result.summary.blankLinePercentage, 20.0);

  assert.equal(result.limits.perFileTimeoutMs, 6000);
  assert.equal(result.limits.globalTimeoutMs, 20000);

  assert.deepEqual(result.languages.JavaScript, {
    filesAnalyzed: 2,
    totalLines: 50,
    blankLines: 10,
    nonBlankLines: 40,
    singleLineCommentLines: 0,
    blockCommentLines: 0,
    totalCommentLines: 0,
    commentLinePercentage: 0,
    commentSupport: "supported",
  });

  assert.deepEqual(result.languages.TypeScript, {
    filesAnalyzed: 1,
    totalLines: 50,
    blankLines: 10,
    nonBlankLines: 40,
    singleLineCommentLines: 0,
    blockCommentLines: 0,
    totalCommentLines: 0,
    commentLinePercentage: 0,
    commentSupport: "supported",
  });
});

test("aggregateSourceMetrics: handles 0 lines safely without NaN percentage", () => {
  const analyzedFiles = [
    {
      path: "src/empty.js",
      language: "JavaScript",
      size: 0,
      lines: 0,
      blankLines: 0,
      nonBlankLines: 0,
    },
  ];

  const result = aggregateSourceMetrics(analyzedFiles, [], [], {
    eligibleFilesCount: 1,
  });

  assert.equal(result.summary.totalLines, 0);
  assert.equal(result.summary.blankLinePercentage, 0);
});

// ==========================================
// 4. Comment Metrics Aggregation Tests
// ==========================================

test("aggregateSourceMetrics: aggregates comment metrics for supported files correctly", () => {
  const analyzedFiles = [
    {
      path: "src/file1.js",
      language: "JavaScript",
      size: 500,
      lines: 100,
      blankLines: 20,
      nonBlankLines: 80,
      singleLineCommentLines: 15,
      blockCommentLines: 10,
      totalCommentLines: 20, // some overlap
      commentLinePercentage: 20.0,
      commentSupport: "supported",
    },
    {
      path: "src/file2.js",
      language: "JavaScript",
      size: 600,
      lines: 200,
      blankLines: 40,
      nonBlankLines: 160,
      singleLineCommentLines: 25,
      blockCommentLines: 15,
      totalCommentLines: 35,
      commentLinePercentage: 17.5,
      commentSupport: "supported",
    },
  ];

  const result = aggregateSourceMetrics(analyzedFiles, [], []);

  assert.equal(result.summary.totalLines, 300);
  assert.equal(result.summary.singleLineCommentLines, 40);
  assert.equal(result.summary.blockCommentLines, 25);
  assert.equal(result.summary.totalCommentLines, 55);
  assert.equal(result.summary.commentLinePercentage, 18.33); // (55 / 300) * 100 = 18.33%
  assert.equal(result.summary.commentSupportedFiles, 2);
  assert.equal(result.summary.commentUnsupportedFiles, 0);

  assert.equal(result.fileCounts.commentSupported, 2);
  assert.equal(result.fileCounts.commentUnsupported, 0);

  assert.equal(result.languages.JavaScript.singleLineCommentLines, 40);
  assert.equal(result.languages.JavaScript.blockCommentLines, 25);
  assert.equal(result.languages.JavaScript.totalCommentLines, 55);
  assert.equal(result.languages.JavaScript.commentLinePercentage, 18.33);
  assert.equal(result.languages.JavaScript.commentSupport, "supported");
});

test("aggregateSourceMetrics: handles mixture of supported and unsupported language files", () => {
  const analyzedFiles = [
    {
      path: "src/app.js",
      language: "JavaScript",
      size: 400,
      lines: 100,
      blankLines: 10,
      nonBlankLines: 90,
      singleLineCommentLines: 20,
      blockCommentLines: 5,
      totalCommentLines: 25,
      commentLinePercentage: 25.0,
      commentSupport: "supported",
    },
    {
      path: "src/Component.vue",
      language: "Vue",
      size: 300,
      lines: 80,
      blankLines: 10,
      nonBlankLines: 70,
      singleLineCommentLines: null,
      blockCommentLines: null,
      totalCommentLines: null,
      commentLinePercentage: null,
      commentSupport: "unsupported",
      unsupportedReason: "Single-file components (Vue) require multi-grammar partitioning.",
    },
  ];

  const result = aggregateSourceMetrics(analyzedFiles, [], []);

  // Physical LOC metrics include all files
  assert.equal(result.summary.totalLines, 180);
  assert.equal(result.summary.blankLines, 20);
  assert.equal(result.summary.nonBlankLines, 160);

  // Comment summary aggregates only supported files
  assert.equal(result.summary.singleLineCommentLines, 20);
  assert.equal(result.summary.blockCommentLines, 5);
  assert.equal(result.summary.totalCommentLines, 25);
  // Percentage calculated against totalLines of supported files: (25 / 100) * 100 = 25.0%
  assert.equal(result.summary.commentLinePercentage, 25.0);
  assert.equal(result.summary.commentSupportedFiles, 1);
  assert.equal(result.summary.commentUnsupportedFiles, 1);

  assert.equal(result.fileCounts.commentSupported, 1);
  assert.equal(result.fileCounts.commentUnsupported, 1);

  // JavaScript language breakdown is supported
  assert.equal(result.languages.JavaScript.commentSupport, "supported");
  assert.equal(result.languages.JavaScript.totalCommentLines, 25);
  assert.equal(result.languages.JavaScript.commentLinePercentage, 25.0);

  // Vue language breakdown is unsupported with null counts
  assert.equal(result.languages.Vue.commentSupport, "unsupported");
  assert.equal(result.languages.Vue.singleLineCommentLines, null);
  assert.equal(result.languages.Vue.blockCommentLines, null);
  assert.equal(result.languages.Vue.totalCommentLines, null);
  assert.equal(result.languages.Vue.commentLinePercentage, null);
  assert.match(result.languages.Vue.unsupportedReason, /multi-grammar/i);
});

test("aggregateSourceMetrics: returns null comment summary when 100% of files are unsupported", () => {
  const analyzedFiles = [
    {
      path: "src/Comp1.vue",
      language: "Vue",
      size: 300,
      lines: 80,
      blankLines: 10,
      nonBlankLines: 70,
      singleLineCommentLines: null,
      blockCommentLines: null,
      totalCommentLines: null,
      commentLinePercentage: null,
      commentSupport: "unsupported",
      unsupportedReason: "Single-file components are not supported.",
    },
    {
      path: "scripts/deploy.bat",
      language: "Batch",
      size: 200,
      lines: 40,
      blankLines: 5,
      nonBlankLines: 35,
      singleLineCommentLines: null,
      blockCommentLines: null,
      totalCommentLines: null,
      commentLinePercentage: null,
      commentSupport: "unsupported",
      unsupportedReason: "Batch scripts are not supported.",
    },
  ];

  const result = aggregateSourceMetrics(analyzedFiles, [], []);

  // Physical LOC metrics are completely accurate
  assert.equal(result.summary.totalLines, 120);
  assert.equal(result.summary.blankLines, 15);
  assert.equal(result.summary.nonBlankLines, 105);

  // Comment metrics are strictly null (not silently treated as 0)
  assert.equal(result.summary.singleLineCommentLines, null);
  assert.equal(result.summary.blockCommentLines, null);
  assert.equal(result.summary.totalCommentLines, null);
  assert.equal(result.summary.commentLinePercentage, null);
  assert.equal(result.summary.commentSupportedFiles, 0);
  assert.equal(result.summary.commentUnsupportedFiles, 2);

  assert.equal(result.fileCounts.commentSupported, 0);
  assert.equal(result.fileCounts.commentUnsupported, 2);

  // Physical completeness status remains complete
  assert.equal(result.status, "complete");
  assert.equal(result.isComplete, true);
});

test("aggregateSourceMetrics: enforces aggregation invariants across supported and unsupported files of the same language", () => {
  const analyzedFiles = [
    {
      path: "src/util.js",
      language: "JavaScript",
      size: 500,
      lines: 50,
      blankLines: 5,
      nonBlankLines: 45,
      singleLineCommentLines: 10,
      blockCommentLines: 10,
      totalCommentLines: 15, // 5 lines had both single and block comments
      commentLinePercentage: 30.0,
      commentSupport: "supported",
    },
    {
      path: "src/App.jsx",
      language: "JavaScript",
      size: 800,
      lines: 100,
      blankLines: 10,
      nonBlankLines: 90,
      singleLineCommentLines: null,
      blockCommentLines: null,
      totalCommentLines: null,
      commentLinePercentage: null,
      commentSupport: "unsupported",
      unsupportedReason: "JSX files (.jsx) contain JSX element child text boundaries.",
    },
  ];

  const result = aggregateSourceMetrics(analyzedFiles, [], []);

  // Invariant 1: Physical LOC totals include all files (50 + 100 = 150)
  assert.equal(result.summary.totalLines, 150);
  assert.equal(result.summary.blankLines, 15);
  assert.equal(result.summary.nonBlankLines, 135);

  // Invariant 2: totalCommentLines <= totalLines
  assert.ok(result.summary.totalCommentLines <= result.summary.totalLines);

  // Invariant 3: Supported-file comment metrics are preserved in the summary
  assert.equal(result.summary.singleLineCommentLines, 10);
  assert.equal(result.summary.blockCommentLines, 10);
  assert.equal(result.summary.totalCommentLines, 15);

  // Invariant 4: Comment percentage denominator excludes unsupported files (15 / 50 * 100 = 30%)
  assert.equal(result.summary.commentLinePercentage, 30.0);
  assert.equal(result.summary.commentSupportedFiles, 1);
  assert.equal(result.summary.commentUnsupportedFiles, 1);

  // Invariant 5: Language breakdown is "partial_support" — supported-file metrics preserved, not discarded
  assert.equal(result.languages.JavaScript.commentSupport, "partial_support");
  assert.equal(result.languages.JavaScript.totalLines, 150);        // physical LOC covers all files
  assert.equal(result.languages.JavaScript.singleLineCommentLines, 10);
  assert.equal(result.languages.JavaScript.blockCommentLines, 10);
  assert.equal(result.languages.JavaScript.totalCommentLines, 15);
  // Percentage uses only the 50 supported-file lines as denominator
  assert.equal(result.languages.JavaScript.commentLinePercentage, 30.0);
  assert.ok(typeof result.languages.JavaScript.unsupportedReason === "string");
  assert.ok(result.languages.JavaScript.unsupportedReason.length > 0);

  // Invariant 6: Comment support does not alter LOC completeness status
  assert.equal(result.status, "complete");
  assert.equal(result.isComplete, true);
});

// ============================================================================
// New regression tests for mixed-support aggregation (Req 8)
// ============================================================================

test("aggregateSourceMetrics: mixed-support — same language with multiple supported and one unsupported file", () => {
  // Scenario: app.js (100 lines, 20 comments), utils.js (50 lines, 10 comments), component.jsx (200 lines, unsupported)
  const analyzedFiles = [
    {
      path: "src/app.js",
      language: "JavaScript",
      size: 500,
      lines: 100,
      blankLines: 10,
      nonBlankLines: 90,
      singleLineCommentLines: 15,
      blockCommentLines: 8,
      totalCommentLines: 20,
      commentLinePercentage: 20.0,
      commentSupport: "supported",
    },
    {
      path: "src/utils.js",
      language: "JavaScript",
      size: 300,
      lines: 50,
      blankLines: 5,
      nonBlankLines: 45,
      singleLineCommentLines: 8,
      blockCommentLines: 4,
      totalCommentLines: 10,
      commentLinePercentage: 20.0,
      commentSupport: "supported",
    },
    {
      path: "src/component.jsx",
      language: "JavaScript",
      size: 800,
      lines: 200,
      blankLines: 20,
      nonBlankLines: 180,
      singleLineCommentLines: null,
      blockCommentLines: null,
      totalCommentLines: null,
      commentLinePercentage: null,
      commentSupport: "unsupported",
      unsupportedReason: "JSX files (.jsx) contain JSX element child text boundaries.",
    },
  ];

  const result = aggregateSourceMetrics(analyzedFiles, [], []);

  // Physical LOC includes all three files (100 + 50 + 200 = 350)
  assert.equal(result.summary.totalLines, 350);
  assert.equal(result.summary.blankLines, 35);
  assert.equal(result.summary.nonBlankLines, 315);

  // Comment summary from supported files only (100 + 50 = 150 lines, 20 + 10 = 30 total comments)
  assert.equal(result.summary.singleLineCommentLines, 23);   // 15 + 8
  assert.equal(result.summary.blockCommentLines, 12);        // 8 + 4
  assert.equal(result.summary.totalCommentLines, 30);        // 20 + 10
  // Percentage: 30 / 150 * 100 = 20%
  assert.equal(result.summary.commentLinePercentage, 20.0);
  assert.equal(result.summary.commentSupportedFiles, 2);
  assert.equal(result.summary.commentUnsupportedFiles, 1);

  // Language breakdown: partial_support with metrics from supported files only
  assert.equal(result.languages.JavaScript.commentSupport, "partial_support");
  assert.equal(result.languages.JavaScript.totalLines, 350);         // all three files
  assert.equal(result.languages.JavaScript.singleLineCommentLines, 23);
  assert.equal(result.languages.JavaScript.blockCommentLines, 12);
  assert.equal(result.languages.JavaScript.totalCommentLines, 30);
  // Percentage denominator: 150 (supported-file lines only), not 350
  assert.equal(result.languages.JavaScript.commentLinePercentage, 20.0);
  assert.ok(typeof result.languages.JavaScript.unsupportedReason === "string");

  // LOC completeness is unaffected
  assert.equal(result.status, "complete");
  assert.equal(result.isComplete, true);
});

test("aggregateSourceMetrics: all-supported — all files for a language are supported (no regression)", () => {
  const analyzedFiles = [
    {
      path: "src/index.js",
      language: "JavaScript",
      size: 400,
      lines: 80,
      blankLines: 8,
      nonBlankLines: 72,
      singleLineCommentLines: 12,
      blockCommentLines: 6,
      totalCommentLines: 16,
      commentLinePercentage: 20.0,
      commentSupport: "supported",
    },
    {
      path: "src/helpers.js",
      language: "JavaScript",
      size: 200,
      lines: 40,
      blankLines: 4,
      nonBlankLines: 36,
      singleLineCommentLines: 4,
      blockCommentLines: 2,
      totalCommentLines: 6,
      commentLinePercentage: 15.0,
      commentSupport: "supported",
    },
  ];

  const result = aggregateSourceMetrics(analyzedFiles, [], []);

  // Physical LOC totals
  assert.equal(result.summary.totalLines, 120);

  // All comment metrics should be numeric (not null)
  assert.equal(result.summary.singleLineCommentLines, 16);
  assert.equal(result.summary.blockCommentLines, 8);
  assert.equal(result.summary.totalCommentLines, 22);
  assert.equal(result.summary.commentLinePercentage, 18.33);  // 22 / 120 * 100
  assert.equal(result.summary.commentSupportedFiles, 2);
  assert.equal(result.summary.commentUnsupportedFiles, 0);

  // Language status is "supported", not "partial_support"
  assert.equal(result.languages.JavaScript.commentSupport, "supported");
  assert.equal(result.languages.JavaScript.singleLineCommentLines, 16);
  assert.equal(result.languages.JavaScript.blockCommentLines, 8);
  assert.equal(result.languages.JavaScript.totalCommentLines, 22);
  assert.equal(result.languages.JavaScript.commentLinePercentage, 18.33);
  // "supported" language must NOT carry an unsupportedReason field
  assert.equal(result.languages.JavaScript.unsupportedReason, undefined);

  assert.equal(result.status, "complete");
  assert.equal(result.isComplete, true);
});

test("aggregateSourceMetrics: all-unsupported — all files for a language are unsupported (no regression)", () => {
  const analyzedFiles = [
    {
      path: "src/App.jsx",
      language: "JavaScript",
      size: 500,
      lines: 100,
      blankLines: 10,
      nonBlankLines: 90,
      singleLineCommentLines: null,
      blockCommentLines: null,
      totalCommentLines: null,
      commentLinePercentage: null,
      commentSupport: "unsupported",
      unsupportedReason: "JSX files (.jsx) contain JSX element child text boundaries.",
    },
    {
      path: "src/Header.jsx",
      language: "JavaScript",
      size: 300,
      lines: 60,
      blankLines: 6,
      nonBlankLines: 54,
      singleLineCommentLines: null,
      blockCommentLines: null,
      totalCommentLines: null,
      commentLinePercentage: null,
      commentSupport: "unsupported",
      unsupportedReason: "JSX files (.jsx) contain JSX element child text boundaries.",
    },
  ];

  const result = aggregateSourceMetrics(analyzedFiles, [], []);

  // Physical LOC includes all files
  assert.equal(result.summary.totalLines, 160);

  // Comment metrics are null — not 0 — because no supported files exist
  assert.equal(result.summary.singleLineCommentLines, null);
  assert.equal(result.summary.blockCommentLines, null);
  assert.equal(result.summary.totalCommentLines, null);
  assert.equal(result.summary.commentLinePercentage, null);
  assert.equal(result.summary.commentSupportedFiles, 0);
  assert.equal(result.summary.commentUnsupportedFiles, 2);

  // Language status is "unsupported" with null metrics and a reason
  assert.equal(result.languages.JavaScript.commentSupport, "unsupported");
  assert.equal(result.languages.JavaScript.singleLineCommentLines, null);
  assert.equal(result.languages.JavaScript.blockCommentLines, null);
  assert.equal(result.languages.JavaScript.totalCommentLines, null);
  assert.equal(result.languages.JavaScript.commentLinePercentage, null);
  assert.ok(typeof result.languages.JavaScript.unsupportedReason === "string");
  assert.ok(result.languages.JavaScript.unsupportedReason.length > 0);

  // Physical LOC completeness remains unaffected
  assert.equal(result.status, "complete");
  assert.equal(result.isComplete, true);
});
