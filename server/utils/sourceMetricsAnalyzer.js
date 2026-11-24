import {
  isCommentAnalysisSupported,
  UNSUPPORTED_REASONS,
} from "./commentAnalyzer.js";

/**
 * Physical line metrics and completeness calculation for source code files.
 */

/**
 * Calculates physical lines of code, blank lines, and non-blank lines.
 *
 * Rules:
 * - Empty string: 0 total lines, 0 blank lines, 0 non-blank lines.
 * - Single trailing newline (\r\n, \n, or \r) terminates the final line and is not counted as an extra blank line.
 * - Blank line: whitespace-only line (line.trim().length === 0).
 * - Non-blank line: contains non-whitespace characters (line.trim().length > 0).
 */
export const calculateLineMetrics = (content) => {
  if (typeof content !== "string" || content.length === 0) {
    return {
      totalLines: 0,
      blankLines: 0,
      nonBlankLines: 0,
    };
  }

  let normalized = content;
  if (normalized.endsWith("\r\n")) {
    normalized = normalized.slice(0, -2);
  } else if (normalized.endsWith("\n") || normalized.endsWith("\r")) {
    normalized = normalized.slice(0, -1);
  }

  const lines = normalized.split(/\r\n|\r|\n/);

  let blankLines = 0;
  let nonBlankLines = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().length === 0) {
      blankLines++;
    } else {
      nonBlankLines++;
    }
  }

  return {
    totalLines: lines.length,
    blankLines,
    nonBlankLines,
  };
};

/**
 * Determines completeness status following strict precedence:
 *
 * 1. Truncated tree:
 *    - A truncated repository tree must NEVER be reported as complete.
 *    - If analyzedFilesCount === 0 and eligibleFilesCount > 0: "unavailable"
 *    - Otherwise: "partial" (even if eligibleFilesCount === 0, because source files may exist beyond truncation)
 * 2. Complete tree with zero eligible source files:
 *    - "no_source_files" (isComplete: true)
 * 3. Complete tree with zero analyzed files due to errors/rate-limit/timeout:
 *    - "unavailable" (isComplete: false)
 * 4. Complete tree with retrieval errors, rate limits, timeouts, or file failures:
 *    - "partial" (isComplete: false)
 * 5. Complete tree where safety limits were reached (max files cap or size limits):
 *    - "limit_reached" (dataCompleteness: "partial", isComplete: false)
 * 6. Complete tree where all eligible files were analyzed without errors or skips:
 *    - "complete" (dataCompleteness: "complete", isComplete: true)
 */
export const determineCompletenessStatus = ({
  eligibleFilesCount = 0,
  analyzedFilesCount = 0,
  skippedFilesCount = 0,
  failedFilesCount = 0,
  skippedFiles = [],
  treeTruncated = false,
  rateLimitHit = false,
  timedOut = false,
} = {}) => {
  const hasSkippedFilesArray =
    Array.isArray(skippedFiles) && skippedFiles.length > 0;

  const safetyLimitSkips = hasSkippedFilesArray
    ? skippedFiles.filter(
        (f) =>
          f?.reason === "file_size_exceeded" ||
          f?.reason === "max_files_limit_reached"
      ).length
    : 0;

  const binarySkips = hasSkippedFilesArray
    ? skippedFiles.filter((f) => f?.reason === "binary_file").length
    : 0;

  const totalSkippedFiles = Math.max(
    Number.isFinite(skippedFilesCount) ? skippedFilesCount : 0,
    hasSkippedFilesArray ? skippedFiles.length : 0
  );

  const nonSafetyOrUnclassifiedSkips = totalSkippedFiles - safetyLimitSkips;

  // 1. Truncated tree:
  // A truncated repository tree must never be reported as complete.
  // A truncated tree with zero discovered source files must not produce no_source_files with isComplete: true.
  if (treeTruncated) {
    if (
      analyzedFilesCount === 0 &&
      eligibleFilesCount > 0 &&
      (rateLimitHit || timedOut || failedFilesCount > 0)
    ) {
      let explanation = "Unable to analyze source-code metrics.";
      if (rateLimitHit) {
        explanation = "GitHub API rate limit prevented source-code retrieval.";
      } else if (timedOut) {
        explanation =
          "Metrics collection timed out before any files could be analyzed.";
      }
      return {
        status: "unavailable",
        dataCompleteness: "unavailable",
        isComplete: false,
        explanation,
      };
    }

    let reason = "the repository file tree was truncated by GitHub";
    if (eligibleFilesCount === 0) {
      reason =
        "the repository file tree was truncated by GitHub and no source files were discovered in the partial tree";
    } else if (rateLimitHit) {
      reason =
        "the repository file tree was truncated by GitHub and GitHub API rate limit was encountered";
    } else if (timedOut) {
      reason =
        "the repository file tree was truncated by GitHub and the analysis operation timed out";
    } else if (failedFilesCount > 0) {
      reason = `the repository file tree was truncated by GitHub and ${failedFilesCount} file(s) failed to retrieve`;
    }

    return {
      status: "partial",
      dataCompleteness: "partial",
      isComplete: false,
      explanation: `Source-code metrics analysis is partial because ${reason}.`,
    };
  }

  // 2. Reserve no_source_files strictly for a complete tree containing zero eligible source files.
  if (eligibleFilesCount === 0) {
    return {
      status: "no_source_files",
      dataCompleteness: "complete",
      isComplete: true,
      explanation: "No source files were found in the analyzed file tree.",
    };
  }

  // 3. Rate limit or global timeout interruption
  if (rateLimitHit || timedOut) {
    if (analyzedFilesCount === 0) {
      return {
        status: "unavailable",
        dataCompleteness: "unavailable",
        isComplete: false,
        explanation: rateLimitHit
          ? "GitHub API rate limit prevented source-code retrieval."
          : "Metrics collection timed out before any files could be analyzed.",
      };
    }

    return {
      status: "partial",
      dataCompleteness: "partial",
      isComplete: false,
      explanation: rateLimitHit
        ? "Source-code metrics analysis is partial because GitHub API rate limit was encountered."
        : "Source-code metrics analysis is partial because the analysis operation timed out.",
    };
  }

  // 4. Failures occurred (retrieval errors, timeout, invalid SHA, invalid size)
  if (failedFilesCount > 0) {
    if (analyzedFilesCount === 0 && skippedFilesCount === 0) {
      return {
        status: "unavailable",
        dataCompleteness: "unavailable",
        isComplete: false,
        explanation: "Unable to analyze source-code metrics.",
      };
    }

    return {
      status: "partial",
      dataCompleteness: "partial",
      isComplete: false,
      explanation: `Source-code metrics analysis is partial because ${failedFilesCount} file(s) failed to retrieve.`,
    };
  }

  // 5. Non-safety skips or unclassified skips
  // If skipped files exist but their reasons are unavailable or non-safety (e.g. binary files),
  // classify the result as partial, not limit_reached.
  if (nonSafetyOrUnclassifiedSkips > 0) {
    let reason = "skipped files were encountered without detailed classification";
    if (binarySkips === eligibleFilesCount) {
      reason = "all eligible source files were binary files and skipped";
    } else if (binarySkips > 0) {
      reason = `${binarySkips} binary file(s) were skipped`;
    }

    return {
      status: "partial",
      dataCompleteness: "partial",
      isComplete: false,
      explanation: `Source-code metrics analysis is partial because ${reason}.`,
    };
  }

  // 6. Safety limits reached (max files cap or size limits) without failures or non-safety skips
  // If all eligible files are skipped because they exceed size limit or max file cap, status must be limit_reached
  if (safetyLimitSkips > 0) {
    return {
      status: "limit_reached",
      dataCompleteness: "partial",
      isComplete: false,
      explanation: `Source-code metrics analysis reached configured safety limits (${analyzedFilesCount} analyzed, ${totalSkippedFiles} skipped).`,
    };
  }

  // 7. Complete analysis of all eligible files
  return {
    status: "complete",
    dataCompleteness: "complete",
    isComplete: true,
    explanation: `Successfully analyzed physical code metrics across all ${analyzedFilesCount} eligible source file(s).`,
  };
};

/**
 * Aggregates file-level metrics into summary totals and language breakdown.
 *
 * Per-language comment support semantics:
 * - "supported"       — all analyzed files for this language support comment analysis.
 * - "partial_support" — some files support comment analysis, some do not (e.g., .jsx mixed with .js).
 *                       Comment metrics reflect only the supported subset; unsupported files are
 *                       excluded from the comment percentage denominator.
 * - "unsupported"     — no analyzed files for this language support comment analysis.
 */
export const aggregateSourceMetrics = (
  analyzedFiles = [],
  skippedFiles = [],
  failedFiles = [],
  options = {}
) => {
  const eligibleFilesCount =
    options.eligibleFilesCount ??
    analyzedFiles.length + skippedFiles.length + failedFiles.length;

  let totalLines = 0;
  let blankLines = 0;
  let nonBlankLines = 0;

  let totalSingleLineComments = 0;
  let totalBlockCommentLines = 0;
  let totalCommentLines = 0;
  let supportedTotalLines = 0;
  let commentSupportedFiles = 0;
  let commentUnsupportedFiles = 0;

  const languages = {};

  for (const file of analyzedFiles) {
    const fileLines = Number.isFinite(file.lines) ? file.lines : 0;
    const fileBlank = Number.isFinite(file.blankLines) ? file.blankLines : 0;
    const fileNonBlank = Number.isFinite(file.nonBlankLines)
      ? file.nonBlankLines
      : 0;

    totalLines += fileLines;
    blankLines += fileBlank;
    nonBlankLines += fileNonBlank;

    const lang = file.language || "Unknown";
    const isSupported =
      file.commentSupport !== undefined
        ? file.commentSupport === "supported"
        : isCommentAnalysisSupported(lang, { filePath: file.path });

    if (!languages[lang]) {
      languages[lang] = {
        filesAnalyzed: 0,
        // Separate counters for supported-file comment metrics.
        // These are internal; they feed the final per-language comment fields.
        _supportedFiles: 0,
        _unsupportedFiles: 0,
        _supportedLines: 0,     // line count for supported files only (comment % denominator)
        _singleLineSum: 0,
        _blockSum: 0,
        _totalCommentSum: 0,
        _firstUnsupportedReason: null,
        totalLines: 0,
        blankLines: 0,
        nonBlankLines: 0,
        // Public comment fields — resolved after all files are processed.
        singleLineCommentLines: null,
        blockCommentLines: null,
        totalCommentLines: null,
        commentLinePercentage: null,
        commentSupport: null,
      };
    }

    languages[lang].filesAnalyzed += 1;
    languages[lang].totalLines += fileLines;
    languages[lang].blankLines += fileBlank;
    languages[lang].nonBlankLines += fileNonBlank;

    if (isSupported) {
      commentSupportedFiles += 1;
      supportedTotalLines += fileLines;

      const fileSingle = Number.isFinite(file.singleLineCommentLines)
        ? file.singleLineCommentLines
        : 0;
      const fileBlock = Number.isFinite(file.blockCommentLines)
        ? file.blockCommentLines
        : 0;
      const fileTotal = Number.isFinite(file.totalCommentLines)
        ? file.totalCommentLines
        : 0;

      totalSingleLineComments += fileSingle;
      totalBlockCommentLines += fileBlock;
      totalCommentLines += fileTotal;

      languages[lang]._supportedFiles += 1;
      languages[lang]._supportedLines += fileLines;
      languages[lang]._singleLineSum += fileSingle;
      languages[lang]._blockSum += fileBlock;
      languages[lang]._totalCommentSum += fileTotal;
    } else {
      commentUnsupportedFiles += 1;
      languages[lang]._unsupportedFiles += 1;
      if (languages[lang]._firstUnsupportedReason === null) {
        languages[lang]._firstUnsupportedReason =
          file.unsupportedReason ||
          UNSUPPORTED_REASONS[lang] ||
          `Comment analysis is not supported for ${lang}.`;
      }
    }
  }

  // Resolve per-language public comment fields now that all files have been counted.
  for (const lang of Object.keys(languages)) {
    const entry = languages[lang];
    const sup = entry._supportedFiles;
    const unsup = entry._unsupportedFiles;

    if (sup > 0 && unsup === 0) {
      // All files for this language are supported.
      entry.commentSupport = "supported";
      entry.singleLineCommentLines = entry._singleLineSum;
      entry.blockCommentLines = entry._blockSum;
      entry.totalCommentLines = entry._totalCommentSum;
      entry.commentLinePercentage =
        entry._supportedLines > 0
          ? Number(
              ((entry._totalCommentSum / entry._supportedLines) * 100).toFixed(2)
            )
          : 0;
    } else if (sup > 0 && unsup > 0) {
      // Mixed: some files supported, some not. Preserve metrics from supported subset.
      entry.commentSupport = "partial_support";
      entry.singleLineCommentLines = entry._singleLineSum;
      entry.blockCommentLines = entry._blockSum;
      entry.totalCommentLines = entry._totalCommentSum;
      // Percentage denominator: lines from supported files only.
      entry.commentLinePercentage =
        entry._supportedLines > 0
          ? Number(
              ((entry._totalCommentSum / entry._supportedLines) * 100).toFixed(2)
            )
          : 0;
      entry.unsupportedReason = entry._firstUnsupportedReason;
    } else {
      // All files for this language are unsupported.
      entry.commentSupport = "unsupported";
      entry.singleLineCommentLines = null;
      entry.blockCommentLines = null;
      entry.totalCommentLines = null;
      entry.commentLinePercentage = null;
      entry.unsupportedReason = entry._firstUnsupportedReason;
    }

    // Remove internal accumulator fields from the public response.
    delete entry._supportedFiles;
    delete entry._unsupportedFiles;
    delete entry._supportedLines;
    delete entry._singleLineSum;
    delete entry._blockSum;
    delete entry._totalCommentSum;
    delete entry._firstUnsupportedReason;
  }

  const blankLinePercentage =
    totalLines > 0
      ? Number(((blankLines / totalLines) * 100).toFixed(2))
      : 0;

  // Summary comment metrics calculation
  let summarySingleComments;
  let summaryBlockComments;
  let summaryTotalComments;
  let summaryCommentPercentage;

  if (commentSupportedFiles > 0) {
    summarySingleComments = totalSingleLineComments;
    summaryBlockComments = totalBlockCommentLines;
    summaryTotalComments = totalCommentLines;
    summaryCommentPercentage =
      supportedTotalLines > 0
        ? Number(((totalCommentLines / supportedTotalLines) * 100).toFixed(2))
        : 0;
  } else if (analyzedFiles.length === 0) {
    summarySingleComments = 0;
    summaryBlockComments = 0;
    summaryTotalComments = 0;
    summaryCommentPercentage = 0;
  } else {
    // All analyzed files are unsupported
    summarySingleComments = null;
    summaryBlockComments = null;
    summaryTotalComments = null;
    summaryCommentPercentage = null;
  }

  const completeness = determineCompletenessStatus({
    eligibleFilesCount,
    analyzedFilesCount: analyzedFiles.length,
    skippedFilesCount: skippedFiles.length,
    failedFilesCount: failedFiles.length,
    skippedFiles,
    treeTruncated: Boolean(options.treeTruncated),
    rateLimitHit: Boolean(options.rateLimitHit),
    timedOut: Boolean(options.timedOut),
  });

  return {
    status: completeness.status,
    dataCompleteness: completeness.dataCompleteness,
    isComplete: completeness.isComplete,
    summary: {
      totalLines,
      blankLines,
      nonBlankLines,
      blankLinePercentage,
      singleLineCommentLines: summarySingleComments,
      blockCommentLines: summaryBlockComments,
      totalCommentLines: summaryTotalComments,
      commentLinePercentage: summaryCommentPercentage,
      commentSupportedFiles,
      commentUnsupportedFiles,
    },
    fileCounts: {
      eligibleSourceFiles: eligibleFilesCount,
      analyzed: analyzedFiles.length,
      skipped: skippedFiles.length,
      failed: failedFiles.length,
      commentSupported: commentSupportedFiles,
      commentUnsupported: commentUnsupportedFiles,
    },
    skippedFiles,
    failedFiles,
    languages,
    limits: options.limits ?? null,
    explanation: completeness.explanation,
  };
};
