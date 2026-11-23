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
  });

  assert.deepEqual(result.languages.TypeScript, {
    filesAnalyzed: 1,
    totalLines: 50,
    blankLines: 10,
    nonBlankLines: 40,
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
