/**
 * Language-aware lexical analyzer for source code comments.
 *
 * Measures:
 * - singleLineCommentLines: count of physical lines containing single-line comments.
 * - blockCommentLines: count of physical lines containing or enclosed within block/multiline comments.
 * - totalCommentLines: count of physical lines containing any comment (single-line, block, or both).
 * - commentLinePercentage: totalCommentLines / totalLines * 100, rounded to 2 decimal places.
 * - commentSupport: "supported" | "unsupported".
 * - unsupportedReason: explanatory reason when commentSupport is "unsupported".
 */

/**
 * Languages with verified deterministic lexical profiles.
 * Note: For JavaScript and TypeScript, standard .js, .mjs, .cjs, and .ts files are supported.
 * Mixed JSX/TSX files (.jsx, .tsx) contain XML element child text boundaries that require
 * specialized multi-grammar parsing and are conservatively classified as unsupported.
 */
export const SUPPORTED_LANGUAGES = Object.freeze(
  new Set([
    "JavaScript",
    "TypeScript",
    "Python",
    "Java",
    "C",
    "C++",
    "C/C++ Header",
    "C#",
    "Go",
    "Rust",
    "Swift",
    "Kotlin",
    "Dart",
    "Scala",
    "SQL",
    "CSS",
    "SCSS",
    "HTML",
  ])
);

/**
 * Explanations for languages and file types whose comment metrics cannot be analyzed reliably.
 */
export const UNSUPPORTED_REASONS = Object.freeze({
  JSX: "JSX files (.jsx) contain JSX element child text boundaries that require multi-grammar XML/JSX parsing not currently supported for comment metrics.",
  TSX: "TSX files (.tsx) contain JSX element child text boundaries that require multi-grammar XML/JSX parsing not currently supported for comment metrics.",
  Vue: "Single-file components (Vue) combine multiple language syntaxes (template, script, style) that require multi-grammar partitioning not currently supported.",
  Svelte:
    "Single-file components (Svelte) combine multiple language syntaxes (template, script, style) that require multi-grammar partitioning not currently supported.",
  Batch:
    "Batch script syntax (REM, :: labels, and conditional variable expansion) cannot be analyzed reliably without an execution interpreter.",
  Shell:
    "Shell script constructs (heredocs, parameter expansion pattern matching, and subshells) require full shell lexical parsing not currently supported.",
  Ruby: "Ruby syntax (heredocs, regex literals, %-literals, and =begin/=end block comments) requires dynamic lexical state parsing not currently supported.",
  Perl: "Perl syntax (heredocs, complex regexes, and format blocks) requires dynamic parsing not currently supported.",
  PHP: "PHP files mix raw markup with embedded code blocks that require template-boundary lexical parsing not currently supported.",
  PowerShell:
    "PowerShell command parameters, backtick escaping, and nested script blocks require PowerShell-specific AST parsing not currently supported.",
  Elixir:
    "Elixir syntax (sigils, heredocs, and module doc attributes) requires Elixir-specific lexical parsing not currently supported.",
  Haskell:
    "Haskell syntax (nested block comments with pragmas and literate mode) requires Haskell lexical analysis not currently supported.",
  Lua: "Lua long brackets (--[[...]], [===[...===]) require arbitrary delimiter depth tracking not currently supported.",
  R: "R language constructs and roxygen2 tags require R-specific grammar parsing not currently supported.",
  Julia:
    "Julia syntax (nested block comments and macro quoting) requires Julia lexical analysis not currently supported.",
  Sass: "Indented Sass syntax relies on indentation-based line interpretation rather than standard comment delimiters.",
  Unknown:
    "Language is not recognized or has no defined comment syntax profile.",
});

/**
 * JavaScript / TypeScript keywords that precede an expression context where a regex literal can begin.
 */
const JS_REGEX_PREFIX_KEYWORDS = new Set([
  "return",
  "throw",
  "yield",
  "await",
  "case",
  "default",
  "typeof",
  "void",
  "delete",
  "instanceof",
  "in",
  "else",
  "do",
]);

/**
 * JavaScript / TypeScript operators and punctuation where an expression (and regex literal) can begin.
 */
const JS_REGEX_PREFIX_OPERATORS = "=([{,:;!&|?~^+-*%<>";

/**
 * Checks whether comment analysis is supported for a given language and file path.
 */
export const isCommentAnalysisSupported = (language, options = {}) => {
  if (typeof language !== "string" || !SUPPORTED_LANGUAGES.has(language)) {
    return false;
  }

  const filePath = (options.filePath || options.path || "").toLowerCase();
  if (filePath.endsWith(".jsx") || filePath.endsWith(".tsx")) {
    return false;
  }

  return true;
};

/**
 * Helper to match identifiers / keyword characters.
 */
const isIdentChar = (ch) => {
  return (
    (ch >= "a" && ch <= "z") ||
    (ch >= "A" && ch <= "Z") ||
    (ch >= "0" && ch <= "9") ||
    ch === "_" ||
    ch === "$"
  );
};

/**
 * Helper to match SQL PostgreSQL dollar-quote tag characters (cannot contain $).
 */
const isDollarTagChar = (ch) => {
  return (
    (ch >= "a" && ch <= "z") ||
    (ch >= "A" && ch <= "Z") ||
    (ch >= "0" && ch <= "9") ||
    ch === "_"
  );
};

/**
 * Helper to identify C# string prefixes (interpolated, verbatim, raw).
 */
const getCSharpStringStart = (normalized, i, len) => {
  const ch = normalized[i];
  if (ch !== "$" && ch !== "@" && ch !== '"') {
    return null;
  }

  // 1. $ prefixes: $", $@...", @$...", $"""...
  if (ch === "$") {
    let dollarCount = 0;
    let cur = i;
    while (cur < len && normalized[cur] === "$") {
      dollarCount++;
      cur++;
    }
    // Check for $@"...
    if (cur < len && normalized[cur] === "@" && cur + 1 < len && normalized[cur + 1] === '"') {
      return {
        isInterpolated: true,
        type: "verbatim",
        startLen: cur + 2 - i,
        dollarCount,
        endQuotes: '"',
      };
    }
    // Check for $" or $"""
    if (cur < len && normalized[cur] === '"') {
      let quoteCount = 0;
      let qCur = cur;
      while (qCur < len && normalized[qCur] === '"') {
        quoteCount++;
        qCur++;
      }
      if (quoteCount >= 3) {
        return {
          isInterpolated: true,
          type: "raw",
          startLen: qCur - i,
          dollarCount,
          endQuotes: '"'.repeat(quoteCount),
        };
      }
      return {
        isInterpolated: true,
        type: "standard",
        startLen: cur + 1 - i,
        dollarCount,
        endQuotes: '"',
      };
    }
    return null;
  }

  // 2. @ prefixes: @"..." or @$"..."
  if (ch === "@") {
    if (i + 1 < len && normalized[i + 1] === "$") {
      let cur = i + 2;
      let dollarCount = 1;
      while (cur < len && normalized[cur] === "$") {
        dollarCount++;
        cur++;
      }
      if (cur < len && normalized[cur] === '"') {
        return {
          isInterpolated: true,
          type: "verbatim",
          startLen: cur + 1 - i,
          dollarCount,
          endQuotes: '"',
        };
      }
      return null;
    }
    if (i + 1 < len && normalized[i + 1] === '"') {
      return {
        isInterpolated: false,
        type: "verbatim",
        startLen: 2,
        dollarCount: 0,
        endQuotes: '"',
      };
    }
    return null;
  }

  // 3. Raw strings starting with 3+ quotes: """..."""
  if (ch === '"' && i + 2 < len && normalized[i + 1] === '"' && normalized[i + 2] === '"') {
    let quoteCount = 0;
    let cur = i;
    while (cur < len && normalized[cur] === '"') {
      quoteCount++;
      cur++;
    }
    return {
      isInterpolated: false,
      type: "raw",
      startLen: quoteCount,
      dollarCount: 0,
      endQuotes: '"'.repeat(quoteCount),
    };
  }

  return null;
};

/**
 * Helper to identify Python string prefixes (f-strings, raw strings, docstrings).
 */
const getPythonStringStart = (normalized, i, len) => {
  let cur = i;
  let hasF = false;
  let hasR = false;

  while (cur < len && cur - i < 2) {
    const c = normalized[cur].toLowerCase();
    if (c === "f") {
      hasF = true;
      cur++;
    } else if (c === "r" || c === "b" || c === "u") {
      if (c === "r") hasR = true;
      cur++;
    } else {
      break;
    }
  }

  if (cur < len && (normalized[cur] === '"' || normalized[cur] === "'")) {
    const q = normalized[cur];
    const isTriple =
      cur + 2 < len &&
      normalized[cur + 1] === q &&
      normalized[cur + 2] === q;
    const quoteToken = isTriple ? q.repeat(3) : q;

    return {
      isFString: hasF,
      isRaw: hasR,
      isTriple,
      quoteToken,
      startLen: cur + quoteToken.length - i,
    };
  }

  return null;
};

/**
 * Analyzes comment lines in source code content using a language-aware lexical state machine.
 *
 * @param {string} content - Raw source code string
 * @param {string} language - Recognized language name
 * @param {Object} options - Additional context (e.g. filePath / path)
 * @returns {Object} Comment metrics and support metadata
 */
export const analyzeCommentMetrics = (content, language, options = {}) => {
  const filePath = (options.filePath || options.path || "").toLowerCase();

  // 1. Check for JSX / TSX files
  if (filePath.endsWith(".jsx")) {
    return {
      commentSupport: "unsupported",
      unsupportedReason: UNSUPPORTED_REASONS.JSX,
      singleLineCommentLines: null,
      blockCommentLines: null,
      totalCommentLines: null,
      commentLinePercentage: null,
    };
  }

  if (filePath.endsWith(".tsx")) {
    return {
      commentSupport: "unsupported",
      unsupportedReason: UNSUPPORTED_REASONS.TSX,
      singleLineCommentLines: null,
      blockCommentLines: null,
      totalCommentLines: null,
      commentLinePercentage: null,
    };
  }

  // 2. Check general language support
  if (!isCommentAnalysisSupported(language, options)) {
    const reason =
      UNSUPPORTED_REASONS[language] ||
      `Comment analysis is not supported for ${language || "unrecognized language"}.`;

    return {
      commentSupport: "unsupported",
      unsupportedReason: reason,
      singleLineCommentLines: null,
      blockCommentLines: null,
      totalCommentLines: null,
      commentLinePercentage: null,
    };
  }

  if (typeof content !== "string" || content.length === 0) {
    return {
      commentSupport: "supported",
      unsupportedReason: null,
      singleLineCommentLines: 0,
      blockCommentLines: 0,
      totalCommentLines: 0,
      commentLinePercentage: 0,
    };
  }

  // Normalize single trailing newline to match calculateLineMetrics physical line rules
  let normalized = content;
  if (normalized.endsWith("\r\n")) {
    normalized = normalized.slice(0, -2);
  } else if (normalized.endsWith("\n") || normalized.endsWith("\r")) {
    normalized = normalized.slice(0, -1);
  }

  // Calculate physical total lines identical to calculateLineMetrics
  const totalLines =
    content.length === 0 ? 0 : normalized.split(/\r\n|\r|\n/).length;

  const singleCommentLineSet = new Set();
  const blockCommentLineSet = new Set();

  let lineIndex = 0;
  const len = normalized.length;
  let i = 0;

  // Language feature flags
  const isPython = language === "Python";
  const isJsOrTs = language === "JavaScript" || language === "TypeScript";
  const isSql = language === "SQL";
  const isCss = language === "CSS";
  const isHtml = language === "HTML";
  const isGo = language === "Go";
  const isCSharp = language === "C#";
  const isCpp = language === "C++";
  const isJava = language === "Java";
  const isDart = language === "Dart";
  const isKotlin = language === "Kotlin";
  const isScala = language === "Scala";
  const isSwift = language === "Swift";
  const isRust = language === "Rust";

  const supportsNestedComments =
    isRust || isSwift || isKotlin || isScala;

  // JS/TS template literal tracking stack:
  // Tracks `{ braceDepth: number }` for `${ ... }` interpolation expressions.
  const templateStack = [];

  // JS/TS parenthesis and brace tracking for control-flow and block-statement regex disambiguation
  const parenStack = [];
  const braceStack = [];

  // C# interpolated string tracking stack
  const csharpInterpolationStack = [];

  // Python f-string tracking stack
  const pythonFstringStack = [];

  // Track significant previous token for JS/TS regex disambiguation.
  // Comments DO NOT overwrite lastSignificantToken!
  let lastSignificantToken = "";

  while (i < len) {
    const ch = normalized[i];
    const next = i + 1 < len ? normalized[i + 1] : "";

    // A. Newline tracking
    if (ch === "\r" && next === "\n") {
      lineIndex++;
      i += 2;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      lineIndex++;
      i++;
      continue;
    }

    // B. Whitespace tracking
    if (ch === " " || ch === "\t") {
      i++;
      continue;
    }

    // C. JS/TS Template Literal state handling
    if (isJsOrTs && templateStack.length > 0) {
      const topTemplate = templateStack[templateStack.length - 1];

      // If we are currently inside an interpolation expression `${ ... }`
      if (topTemplate.braceDepth > 0) {
        if (ch === "{") {
          topTemplate.braceDepth++;
          lastSignificantToken = "{";
          i++;
          continue;
        }
        if (ch === "}") {
          topTemplate.braceDepth--;
          lastSignificantToken = "}";
          i++;
          continue;
        }
        // Fall through to normal code scanning for the interpolation expression
      } else {
        // We are inside the raw template string literal body
        if (ch === "`") {
          // Template literal ends
          templateStack.pop();
          lastSignificantToken = "template_literal";
          i++;
          continue;
        }
        if (ch === "\\" && i + 1 < len) {
          // Escaped character in template literal
          if (next === "\r" && i + 2 < len && normalized[i + 2] === "\n") {
            lineIndex++;
            i += 3;
          } else if (next === "\n" || next === "\r") {
            lineIndex++;
            i += 2;
          } else {
            i += 2;
          }
          continue;
        }
        if (ch === "$" && next === "{") {
          // Enter interpolation mode
          topTemplate.braceDepth = 1;
          lastSignificantToken = "{";
          i += 2;
          continue;
        }
        // Template string body content: ignore comment markers inside template strings
        i++;
        continue;
      }
    }

    // D. C# Interpolated String state handling
    if (isCSharp && csharpInterpolationStack.length > 0) {
      const topCs = csharpInterpolationStack[csharpInterpolationStack.length - 1];

      // If inside an interpolation expression `{ ... }`
      if (topCs.braceDepth > 0) {
        if (ch === "{") {
          topCs.braceDepth++;
          lastSignificantToken = "{";
          i++;
          continue;
        }
        if (ch === "}") {
          topCs.braceDepth--;
          lastSignificantToken = "}";
          i++;
          continue;
        }
        // Fall through to normal code scanning for the expression
      } else {
        // Inside string literal body of C# interpolated string
        if (topCs.type === "raw") {
          if (normalized.startsWith(topCs.endQuotes, i)) {
            i += topCs.endQuotes.length;
            csharpInterpolationStack.pop();
            lastSignificantToken = "string";
            continue;
          }
        } else if (topCs.type === "verbatim") {
          if (ch === '"' && next === '"') {
            // Escaped quote: ""
            i += 2;
            continue;
          }
          if (ch === '"') {
            i++;
            csharpInterpolationStack.pop();
            lastSignificantToken = "string";
            continue;
          }
        } else {
          // Standard interpolated string: $"..."
          if (ch === "\\" && i + 1 < len) {
            if (next === "\r" && i + 2 < len && normalized[i + 2] === "\n") {
              lineIndex++;
              i += 3;
            } else if (next === "\n" || next === "\r") {
              lineIndex++;
              i += 2;
            } else {
              i += 2;
            }
            continue;
          }
          if (ch === '"') {
            i++;
            csharpInterpolationStack.pop();
            lastSignificantToken = "string";
            continue;
          }
        }

        // Check for escaped braces: {{ or }}
        if (ch === "{" && next === "{") {
          i += 2;
          continue;
        }
        if (ch === "}" && next === "}") {
          i += 2;
          continue;
        }

        // Check for entering interpolation expression: {
        if (ch === "{") {
          topCs.braceDepth = 1;
          lastSignificantToken = "{";
          i++;
          continue;
        }

        // Ignored comment markers inside C# interpolated string body
        i++;
        continue;
      }
    }

    // E. Python f-string state handling
    if (isPython && pythonFstringStack.length > 0) {
      const topF = pythonFstringStack[pythonFstringStack.length - 1];

      // If inside an interpolation expression `{ ... }`
      if (topF.braceDepth > 0) {
        if (ch === "#") {
          // Python 3.12+ comment inside f-string interpolation expression!
          singleCommentLineSet.add(lineIndex);
          i++;
          while (i < len && normalized[i] !== "\n" && normalized[i] !== "\r") {
            i++;
          }
          continue;
        }
        if (ch === "{") {
          topF.braceDepth++;
          lastSignificantToken = "{";
          i++;
          continue;
        }
        if (ch === "}") {
          topF.braceDepth--;
          lastSignificantToken = "}";
          i++;
          continue;
        }
        // Fall through to normal code scanning for the expression
      } else {
        // Inside string literal body of Python f-string
        if (normalized.startsWith(topF.quoteToken, i)) {
          i += topF.quoteToken.length;
          pythonFstringStack.pop();
          lastSignificantToken = "string";
          continue;
        }
        if (!topF.isRaw && ch === "\\" && i + 1 < len) {
          if (next === "\r" && i + 2 < len && normalized[i + 2] === "\n") {
            lineIndex++;
            i += 3;
          } else if (next === "\n" || next === "\r") {
            lineIndex++;
            i += 2;
          } else {
            i += 2;
          }
          continue;
        }
        if (ch === "{" && next === "{") {
          i += 2;
          continue;
        }
        if (ch === "}" && next === "}") {
          i += 2;
          continue;
        }
        if (ch === "{") {
          topF.braceDepth = 1;
          lastSignificantToken = "{";
          i++;
          continue;
        }
        // Ignored comment markers inside Python f-string body
        i++;
        continue;
      }
    }

    // F. HTML Comment: <!-- ... -->
    if (isHtml) {
      if (
        ch === "<" &&
        next === "!" &&
        i + 3 < len &&
        normalized[i + 2] === "-" &&
        normalized[i + 3] === "-"
      ) {
        blockCommentLineSet.add(lineIndex);
        i += 4;
        while (i < len) {
          if (normalized[i] === "\r" && i + 1 < len && normalized[i + 1] === "\n") {
            lineIndex++;
            blockCommentLineSet.add(lineIndex);
            i += 2;
            continue;
          }
          if (normalized[i] === "\n" || normalized[i] === "\r") {
            lineIndex++;
            blockCommentLineSet.add(lineIndex);
            i++;
            continue;
          }
          if (
            normalized[i] === "-" &&
            i + 2 < len &&
            normalized[i + 1] === "-" &&
            normalized[i + 2] === ">"
          ) {
            i += 3;
            break;
          }
          i++;
        }
        // Comments do not overwrite lastSignificantToken!
        continue;
      }
    }

    // G. SQL Single-line Comment: --
    if (isSql) {
      if (ch === "-" && next === "-") {
        singleCommentLineSet.add(lineIndex);
        i += 2;
        while (i < len && normalized[i] !== "\n" && normalized[i] !== "\r") {
          i++;
        }
        // Comments do not overwrite lastSignificantToken!
        continue;
      }
    }

    // H. SQL PostgreSQL Dollar-Quoted Strings: $tag$...$tag$ or $$...$$
    if (isSql && ch === "$") {
      let tagEnd = i + 1;
      while (tagEnd < len && isDollarTagChar(normalized[tagEnd])) {
        tagEnd++;
      }
      if (tagEnd < len && normalized[tagEnd] === "$") {
        const dollarTag = normalized.slice(i, tagEnd + 1);
        i = tagEnd + 1;
        while (i < len) {
          if (normalized[i] === "\r" && i + 1 < len && normalized[i + 1] === "\n") {
            lineIndex++;
            i += 2;
            continue;
          }
          if (normalized[i] === "\n" || normalized[i] === "\r") {
            lineIndex++;
            i++;
            continue;
          }
          if (normalized.startsWith(dollarTag, i)) {
            i += dollarTag.length;
            break;
          }
          i++;
        }
        lastSignificantToken = "string";
        continue;
      }
    }

    // I. Python Comments: #
    if (isPython) {
      if (ch === "#") {
        singleCommentLineSet.add(lineIndex);
        i++;
        while (i < len && normalized[i] !== "\n" && normalized[i] !== "\r") {
          i++;
        }
        // Comments do not overwrite lastSignificantToken!
        continue;
      }
    }

    // J. Python f-strings and triple-quoted docstrings
    if (isPython) {
      const pyStr = getPythonStringStart(normalized, i, len);
      if (pyStr) {
        if (pyStr.isFString) {
          pythonFstringStack.push({
            quoteToken: pyStr.quoteToken,
            isRaw: pyStr.isRaw,
            braceDepth: 0,
          });
          i += pyStr.startLen;
          continue;
        }
        if (pyStr.isTriple) {
          // Standard triple-quoted string / docstring
          i += pyStr.startLen;
          while (i < len) {
            if (normalized[i] === "\r" && i + 1 < len && normalized[i + 1] === "\n") {
              lineIndex++;
              i += 2;
              continue;
            }
            if (normalized[i] === "\n" || normalized[i] === "\r") {
              lineIndex++;
              i++;
              continue;
            }
            if (!pyStr.isRaw && normalized[i] === "\\" && i + 1 < len) {
              i += 2;
              continue;
            }
            if (normalized.startsWith(pyStr.quoteToken, i)) {
              i += 3;
              break;
            }
            i++;
          }
          lastSignificantToken = "string";
          continue;
        }
      }
    }

    // K. C-style Single-line Comment: // (Supported in all except CSS, HTML, SQL, Python)
    if (!isCss && !isHtml && !isSql && !isPython) {
      if (ch === "/" && next === "/") {
        singleCommentLineSet.add(lineIndex);
        i += 2;
        while (i < len && normalized[i] !== "\n" && normalized[i] !== "\r") {
          i++;
        }
        // Comments do not overwrite lastSignificantToken!
        continue;
      }
    }

    // L. Block Comment: /* ... */ (Supported in C-family, SQL, CSS, SCSS)
    if (!isPython && !isHtml) {
      if (ch === "/" && next === "*") {
        blockCommentLineSet.add(lineIndex);
        i += 2;
        let depth = 1;

        while (i < len) {
          if (normalized[i] === "\r" && i + 1 < len && normalized[i + 1] === "\n") {
            lineIndex++;
            blockCommentLineSet.add(lineIndex);
            i += 2;
            continue;
          }
          if (normalized[i] === "\n" || normalized[i] === "\r") {
            lineIndex++;
            blockCommentLineSet.add(lineIndex);
            i++;
            continue;
          }

          // Check for nested block comment in Rust/Swift/Kotlin/Scala
          if (
            supportsNestedComments &&
            normalized[i] === "/" &&
            i + 1 < len &&
            normalized[i + 1] === "*"
          ) {
            depth++;
            i += 2;
            continue;
          }

          // Check for block comment closing delimiter
          if (normalized[i] === "*" && i + 1 < len && normalized[i + 1] === "/") {
            depth--;
            i += 2;
            if (depth === 0) {
              break;
            }
            continue;
          }
          i++;
        }
        // Important: Comments DO NOT overwrite lastSignificantToken!
        continue;
      }
    }

    // M. JS/TS Template Literal Start: `
    if (isJsOrTs && ch === "`") {
      templateStack.push({ braceDepth: 0 });
      lastSignificantToken = "`";
      i++;
      continue;
    }

    // N. C# String Literals (Interpolated, Verbatim, Raw)
    if (isCSharp) {
      const csStr = getCSharpStringStart(normalized, i, len);
      if (csStr) {
        if (csStr.isInterpolated) {
          csharpInterpolationStack.push({
            type: csStr.type,
            endQuotes: csStr.endQuotes,
            dollarCount: csStr.dollarCount,
            braceDepth: 0,
          });
          i += csStr.startLen;
          continue;
        }

        // Non-interpolated verbatim (@"...") or raw ("""...""")
        if (csStr.type === "raw") {
          i += csStr.startLen;
          while (i < len) {
            if (normalized[i] === "\r" && i + 1 < len && normalized[i + 1] === "\n") {
              lineIndex++;
              i += 2;
              continue;
            }
            if (normalized[i] === "\n" || normalized[i] === "\r") {
              lineIndex++;
              i++;
              continue;
            }
            if (normalized.startsWith(csStr.endQuotes, i)) {
              i += csStr.endQuotes.length;
              break;
            }
            i++;
          }
          lastSignificantToken = "string";
          continue;
        }

        if (csStr.type === "verbatim") {
          i += csStr.startLen;
          while (i < len) {
            if (normalized[i] === "\r" && i + 1 < len && normalized[i + 1] === "\n") {
              lineIndex++;
              i += 2;
              continue;
            }
            if (normalized[i] === "\n" || normalized[i] === "\r") {
              lineIndex++;
              i++;
              continue;
            }
            if (normalized[i] === '"') {
              if (i + 1 < len && normalized[i + 1] === '"') {
                i += 2;
                continue;
              }
              i++;
              break;
            }
            i++;
          }
          lastSignificantToken = "string";
          continue;
        }
      }
    }

    // O. Go Raw String: `...`
    if (isGo && ch === "`") {
      i++;
      while (i < len) {
        if (normalized[i] === "\r" && i + 1 < len && normalized[i + 1] === "\n") {
          lineIndex++;
          i += 2;
          continue;
        }
        if (normalized[i] === "\n" || normalized[i] === "\r") {
          lineIndex++;
          i++;
          continue;
        }
        if (normalized[i] === "`") {
          i++;
          break;
        }
        i++;
      }
      lastSignificantToken = "string";
      continue;
    }

    // P. C++ Raw Strings: R"delim(...)delim" with standard delimiter validation
    if (isCpp && ch === "R" && next === '"') {
      // Validate C++ raw-string delimiter:
      // Length at most 16 chars, no space, whitespace, (, ), or \
      let dLen = 0;
      let valid = true;
      while (i + 2 + dLen < len && normalized[i + 2 + dLen] !== "(") {
        const dCh = normalized[i + 2 + dLen];
        if (
          dLen >= 16 ||
          dCh === " " ||
          dCh === "\t" ||
          dCh === "\v" ||
          dCh === "\f" ||
          dCh === "\n" ||
          dCh === "\r" ||
          dCh === ")" ||
          dCh === "\\" ||
          dCh === '"'
        ) {
          valid = false;
          break;
        }
        dLen++;
      }
      if (valid && i + 2 + dLen < len && normalized[i + 2 + dLen] === "(") {
        const delimiter = normalized.slice(i + 2, i + 2 + dLen);
        const endSequence = `)${delimiter}"`;
        i = i + 2 + dLen + 1; // move past R"delim(
        while (i < len) {
          if (normalized[i] === "\r" && i + 1 < len && normalized[i + 1] === "\n") {
            lineIndex++;
            i += 2;
            continue;
          }
          if (normalized[i] === "\n" || normalized[i] === "\r") {
            lineIndex++;
            i++;
            continue;
          }
          if (normalized.startsWith(endSequence, i)) {
            i += endSequence.length;
            break;
          }
          i++;
        }
        lastSignificantToken = "string";
        continue;
      }
    }

    // Q. Rust Raw Strings: r#"..."# or r"..."
    if (isRust && ch === "r" && (next === '"' || next === "#")) {
      let hashCount = 0;
      let cur = i + 1;
      while (cur < len && normalized[cur] === "#") {
        hashCount++;
        cur++;
      }
      if (cur < len && normalized[cur] === '"') {
        i = cur + 1;
        const endSequence = `"${"#".repeat(hashCount)}`;
        while (i < len) {
          if (normalized[i] === "\r" && i + 1 < len && normalized[i + 1] === "\n") {
            lineIndex++;
            i += 2;
            continue;
          }
          if (normalized[i] === "\n" || normalized[i] === "\r") {
            lineIndex++;
            i++;
            continue;
          }
          if (normalized.startsWith(endSequence, i)) {
            i += endSequence.length;
            break;
          }
          i++;
        }
        lastSignificantToken = "string";
        continue;
      }
    }

    // R. Swift Raw Strings: #"..."#, ##"..."##, #"""..."""#
    if (isSwift && ch === "#") {
      let hashCount = 0;
      let cur = i;
      while (cur < len && normalized[cur] === "#") {
        hashCount++;
        cur++;
      }
      if (cur < len && normalized[cur] === '"') {
        const isMulti =
          cur + 2 < len &&
          normalized[cur + 1] === '"' &&
          normalized[cur + 2] === '"';
        const quoteChars = isMulti ? '"""' : '"';
        i = cur + quoteChars.length;
        const endMarker = `${quoteChars}${"#".repeat(hashCount)}`;

        while (i < len) {
          if (normalized[i] === "\r" && i + 1 < len && normalized[i + 1] === "\n") {
            lineIndex++;
            i += 2;
            continue;
          }
          if (normalized[i] === "\n" || normalized[i] === "\r") {
            lineIndex++;
            i++;
            continue;
          }
          if (normalized.startsWith(endMarker, i)) {
            i += endMarker.length;
            break;
          }
          i++;
        }
        lastSignificantToken = "string";
        continue;
      }
    }

    // S. Triple-Quoted Strings: Java (text blocks), Dart, Kotlin, Scala, Swift (""" or ''')
    const supportsTripleQuotes =
      isJava || isDart || isKotlin || isScala || isSwift;

    if (supportsTripleQuotes) {
      let prefixLen = 0;
      if ((ch === "r" || ch === "R") && isDart && i + 1 < len) {
        prefixLen = 1;
      }

      const quoteIdx = i + prefixLen;
      const qChar = quoteIdx < len ? normalized[quoteIdx] : "";
      const isTripleDouble =
        qChar === '"' &&
        quoteIdx + 2 < len &&
        normalized[quoteIdx + 1] === '"' &&
        normalized[quoteIdx + 2] === '"';
      const isTripleSingle =
        isDart &&
        qChar === "'" &&
        quoteIdx + 2 < len &&
        normalized[quoteIdx + 1] === "'" &&
        normalized[quoteIdx + 2] === "'";

      if (isTripleDouble || isTripleSingle) {
        const quoteToken = isTripleDouble ? '"""' : "'''";
        i = quoteIdx + 3;
        while (i < len) {
          if (normalized[i] === "\r" && i + 1 < len && normalized[i + 1] === "\n") {
            lineIndex++;
            i += 2;
            continue;
          }
          if (normalized[i] === "\n" || normalized[i] === "\r") {
            lineIndex++;
            i++;
            continue;
          }
          if (normalized[i] === "\\" && i + 1 < len) {
            i += 2;
            continue;
          }
          if (normalized.startsWith(quoteToken, i)) {
            i += 3;
            break;
          }
          i++;
        }
        lastSignificantToken = "string";
        continue;
      }
    }

    // T. Dart raw single-line strings: r"..." or r'...'
    if (isDart && ch === "r" && (next === '"' || next === "'")) {
      const q = next;
      i += 2;
      while (i < len && normalized[i] !== q && normalized[i] !== "\n" && normalized[i] !== "\r") {
        i++;
      }
      if (i < len && normalized[i] === q) {
        i++;
      }
      lastSignificantToken = "string";
      continue;
    }

    // U. JS/TS Regular Expression Literal
    if (isJsOrTs && ch === "/" && next !== "/" && next !== "*") {
      const isRegexContext =
        !lastSignificantToken ||
        lastSignificantToken === ")_control" ||
        lastSignificantToken === "}_block" ||
        JS_REGEX_PREFIX_OPERATORS.includes(lastSignificantToken) ||
        JS_REGEX_PREFIX_KEYWORDS.has(lastSignificantToken);

      if (isRegexContext) {
        i++;
        let inCharClass = false;
        while (i < len && normalized[i] !== "\n" && normalized[i] !== "\r") {
          if (normalized[i] === "\\") {
            i += 2;
            continue;
          }
          if (normalized[i] === "[") {
            inCharClass = true;
          } else if (normalized[i] === "]") {
            inCharClass = false;
          } else if (normalized[i] === "/" && !inCharClass) {
            i++;
            break;
          }
          i++;
        }
        lastSignificantToken = "regex";
        continue;
      }
    }

    // V. Standard String Literals: "..." or '...'
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++;
      while (i < len) {
        if (normalized[i] === "\r" && i + 1 < len && normalized[i + 1] === "\n") {
          lineIndex++;
          i += 2;
          continue;
        }
        if (normalized[i] === "\n" || normalized[i] === "\r") {
          lineIndex++;
          i++;
          continue;
        }

        // SQL uses '' to escape single quotes
        if (isSql && quote === "'" && normalized[i] === "'") {
          if (i + 1 < len && normalized[i + 1] === "'") {
            i += 2;
            continue;
          }
          i++;
          break;
        }

        // Standard escape sequence
        if (normalized[i] === "\\" && i + 1 < len) {
          if (
            normalized[i + 1] === "\r" &&
            i + 2 < len &&
            normalized[i + 2] === "\n"
          ) {
            lineIndex++;
            i += 3;
          } else if (
            normalized[i + 1] === "\n" ||
            normalized[i + 1] === "\r"
          ) {
            lineIndex++;
            i += 2;
          } else {
            i += 2;
          }
          continue;
        }

        if (normalized[i] === quote) {
          i++;
          break;
        }
        i++;
      }
      lastSignificantToken = "string";
      continue;
    }

    // W. Identifier / Keyword scanning
    if (isIdentChar(ch)) {
      let ident = ch;
      i++;
      while (i < len && isIdentChar(normalized[i])) {
        ident += normalized[i];
        i++;
      }
      lastSignificantToken = ident;
      continue;
    }

    // X. JS/TS Parentheses tracking (distinguishes control-flow if/while/for from expressions)
    if (isJsOrTs && ch === "(") {
      const isControl =
        lastSignificantToken === "if" ||
        lastSignificantToken === "while" ||
        lastSignificantToken === "for" ||
        lastSignificantToken === "with";
      parenStack.push({ isControl });
      lastSignificantToken = "(";
      i++;
      continue;
    }

    if (isJsOrTs && ch === ")") {
      let isControl = false;
      if (parenStack.length > 0) {
        const top = parenStack.pop();
        isControl = top.isControl;
      }
      lastSignificantToken = isControl ? ")_control" : ")";
      i++;
      continue;
    }

    // Y. JS/TS Braces tracking (distinguishes statement/function blocks from object literals)
    if (isJsOrTs && ch === "{") {
      const isObjectLiteral =
        lastSignificantToken === "=" ||
        lastSignificantToken === ":" ||
        lastSignificantToken === "," ||
        lastSignificantToken === "(" ||
        lastSignificantToken === "[" ||
        lastSignificantToken === "?" ||
        lastSignificantToken === "return" ||
        lastSignificantToken === "throw" ||
        lastSignificantToken === "yield" ||
        lastSignificantToken === "await";
      braceStack.push({ isBlock: !isObjectLiteral });
      lastSignificantToken = "{";
      i++;
      continue;
    }

    if (isJsOrTs && ch === "}") {
      let isBlock = true;
      if (braceStack.length > 0) {
        const top = braceStack.pop();
        isBlock = top.isBlock;
      }
      lastSignificantToken = isBlock ? "}_block" : "}";
      i++;
      continue;
    }

    // Z. Other operators / punctuation
    lastSignificantToken = ch;
    i++;
  }

  const singleLineCommentLines = singleCommentLineSet.size;
  const blockCommentLines = blockCommentLineSet.size;
  const totalCommentLines = new Set([
    ...singleCommentLineSet,
    ...blockCommentLineSet,
  ]).size;

  const commentLinePercentage =
    totalLines > 0
      ? Number(((totalCommentLines / totalLines) * 100).toFixed(2))
      : 0;

  return {
    commentSupport: "supported",
    unsupportedReason: null,
    singleLineCommentLines,
    blockCommentLines,
    totalCommentLines,
    commentLinePercentage,
  };
};
