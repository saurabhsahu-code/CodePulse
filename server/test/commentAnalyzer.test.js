import test from "node:test";
import assert from "node:assert/strict";

import {
  analyzeCommentMetrics,
  isCommentAnalysisSupported,
  SUPPORTED_LANGUAGES,
  UNSUPPORTED_REASONS,
} from "../utils/commentAnalyzer.js";

// ============================================================================
// 1. Language Support & Unsupported Metadata
// ============================================================================

test("commentAnalyzer: correctly identifies supported and unsupported languages", () => {
  // Verified supported languages
  assert.equal(isCommentAnalysisSupported("JavaScript"), true);
  assert.equal(isCommentAnalysisSupported("TypeScript"), true);
  assert.equal(isCommentAnalysisSupported("Python"), true);
  assert.equal(isCommentAnalysisSupported("Java"), true);
  assert.equal(isCommentAnalysisSupported("C"), true);
  assert.equal(isCommentAnalysisSupported("C++"), true);
  assert.equal(isCommentAnalysisSupported("C/C++ Header"), true);
  assert.equal(isCommentAnalysisSupported("C#"), true);
  assert.equal(isCommentAnalysisSupported("Go"), true);
  assert.equal(isCommentAnalysisSupported("Rust"), true);
  assert.equal(isCommentAnalysisSupported("Swift"), true);
  assert.equal(isCommentAnalysisSupported("Kotlin"), true);
  assert.equal(isCommentAnalysisSupported("Dart"), true);
  assert.equal(isCommentAnalysisSupported("Scala"), true);
  assert.equal(isCommentAnalysisSupported("SQL"), true);
  assert.equal(isCommentAnalysisSupported("CSS"), true);
  assert.equal(isCommentAnalysisSupported("SCSS"), true);
  assert.equal(isCommentAnalysisSupported("HTML"), true);

  // Unsupported languages
  assert.equal(isCommentAnalysisSupported("Vue"), false);
  assert.equal(isCommentAnalysisSupported("Svelte"), false);
  assert.equal(isCommentAnalysisSupported("Batch"), false);
  assert.equal(isCommentAnalysisSupported("Shell"), false);
  assert.equal(isCommentAnalysisSupported("Ruby"), false);
  assert.equal(isCommentAnalysisSupported("Perl"), false);
  assert.equal(isCommentAnalysisSupported("PHP"), false);
  assert.equal(isCommentAnalysisSupported("PowerShell"), false);
  assert.equal(isCommentAnalysisSupported("Elixir"), false);
  assert.equal(isCommentAnalysisSupported("Haskell"), false);
  assert.equal(isCommentAnalysisSupported("Lua"), false);
  assert.equal(isCommentAnalysisSupported("R"), false);
  assert.equal(isCommentAnalysisSupported("Julia"), false);
  assert.equal(isCommentAnalysisSupported("Sass"), false);
  assert.equal(isCommentAnalysisSupported("Unknown"), false);
  assert.equal(isCommentAnalysisSupported(""), false);
  assert.equal(isCommentAnalysisSupported(null), false);
});

test("commentAnalyzer: returns unsupported metadata and null counts for unsupported languages", () => {
  const unsupportedList = [
    "Vue",
    "Svelte",
    "Batch",
    "Shell",
    "Ruby",
    "Perl",
    "PHP",
    "PowerShell",
    "Elixir",
    "Haskell",
    "Lua",
    "R",
    "Julia",
    "Sass",
    "Unknown",
  ];

  for (const lang of unsupportedList) {
    const result = analyzeCommentMetrics("// comment in file", lang);
    assert.equal(result.commentSupport, "unsupported");
    assert.equal(result.singleLineCommentLines, null);
    assert.equal(result.blockCommentLines, null);
    assert.equal(result.totalCommentLines, null);
    assert.equal(result.commentLinePercentage, null);
    assert.ok(typeof result.unsupportedReason === "string");
    assert.ok(result.unsupportedReason.length > 10);
  }
});

// ============================================================================
// 2. JSX and TSX Conservative Rejection
// ============================================================================

test("commentAnalyzer: marks .jsx and .tsx files as unsupported with explanatory reason", () => {
  // JSX files
  assert.equal(
    isCommentAnalysisSupported("JavaScript", { filePath: "src/App.jsx" }),
    false
  );
  assert.equal(
    isCommentAnalysisSupported("JavaScript", { path: "components/Button.JSX" }),
    false
  );

  const jsxResult = analyzeCommentMetrics("<div>{/* comment */}</div>", "JavaScript", {
    filePath: "src/App.jsx",
  });
  assert.equal(jsxResult.commentSupport, "unsupported");
  assert.equal(jsxResult.unsupportedReason, UNSUPPORTED_REASONS.JSX);
  assert.equal(jsxResult.singleLineCommentLines, null);
  assert.equal(jsxResult.blockCommentLines, null);
  assert.equal(jsxResult.totalCommentLines, null);
  assert.equal(jsxResult.commentLinePercentage, null);

  // TSX files
  assert.equal(
    isCommentAnalysisSupported("TypeScript", { filePath: "src/App.tsx" }),
    false
  );
  assert.equal(
    isCommentAnalysisSupported("TypeScript", { path: "components/Header.TSX" }),
    false
  );

  const tsxResult = analyzeCommentMetrics("const x = 1;", "TypeScript", {
    filePath: "src/Header.tsx",
  });
  assert.equal(tsxResult.commentSupport, "unsupported");
  assert.equal(tsxResult.unsupportedReason, UNSUPPORTED_REASONS.TSX);
  assert.equal(tsxResult.singleLineCommentLines, null);
  assert.equal(tsxResult.blockCommentLines, null);
  assert.equal(tsxResult.totalCommentLines, null);
  assert.equal(tsxResult.commentLinePercentage, null);

  // Standard .js and .ts files are supported
  assert.equal(
    isCommentAnalysisSupported("JavaScript", { filePath: "src/App.js" }),
    true
  );
  assert.equal(
    isCommentAnalysisSupported("TypeScript", { filePath: "src/App.ts" }),
    true
  );
  assert.equal(
    isCommentAnalysisSupported("JavaScript", { filePath: "src/index.mjs" }),
    true
  );
  assert.equal(
    isCommentAnalysisSupported("JavaScript", { filePath: "src/index.cjs" }),
    true
  );
});

// ============================================================================
// 3. Physical Line Accounting Parity with calculateLineMetrics
// ============================================================================

test("commentAnalyzer: handles empty content and whitespace-only files", () => {
  const emptyResult = analyzeCommentMetrics("", "JavaScript");
  assert.deepEqual(emptyResult, {
    commentSupport: "supported",
    unsupportedReason: null,
    singleLineCommentLines: 0,
    blockCommentLines: 0,
    totalCommentLines: 0,
    commentLinePercentage: 0,
  });

  const nullResult = analyzeCommentMetrics(null, "JavaScript");
  assert.equal(nullResult.totalCommentLines, 0);

  const whitespaceResult = analyzeCommentMetrics("   \n\t\n   ", "JavaScript");
  assert.equal(whitespaceResult.totalCommentLines, 0);
  assert.equal(whitespaceResult.commentLinePercentage, 0);
});

test("commentAnalyzer: physical line accounting parity for single newlines, trailing newlines, LF/CRLF/CR", () => {
  // Single newline without content
  const lfSingle = analyzeCommentMetrics("\n", "JavaScript");
  assert.equal(lfSingle.totalCommentLines, 0);
  assert.equal(lfSingle.commentLinePercentage, 0);

  const crlfSingle = analyzeCommentMetrics("\r\n", "JavaScript");
  assert.equal(crlfSingle.totalCommentLines, 0);
  assert.equal(crlfSingle.commentLinePercentage, 0);

  const crSingle = analyzeCommentMetrics("\r", "JavaScript");
  assert.equal(crSingle.totalCommentLines, 0);
  assert.equal(crSingle.commentLinePercentage, 0);

  // Multiple trailing newlines
  const multiTrailing = analyzeCommentMetrics("// comment\n\n\n", "JavaScript");
  assert.equal(multiTrailing.totalCommentLines, 1);
  assert.equal(multiTrailing.commentLinePercentage, 33.33);

  // Trailing line delimiters with code
  assert.equal(analyzeCommentMetrics("// test\n", "JavaScript").totalCommentLines, 1);
  assert.equal(analyzeCommentMetrics("// test\r\n", "JavaScript").totalCommentLines, 1);
  assert.equal(analyzeCommentMetrics("// test\r", "JavaScript").totalCommentLines, 1);
});

test("commentAnalyzer: blank lines inside block comments count as block comment lines", () => {
  const code = "/*\n\n\n*/";
  const result = analyzeCommentMetrics(code, "JavaScript");

  assert.equal(result.singleLineCommentLines, 0);
  assert.equal(result.blockCommentLines, 4);
  assert.equal(result.totalCommentLines, 4);
  assert.equal(result.commentLinePercentage, 100.0);
});

test("commentAnalyzer: a physical line with both single-line and block comments contributes once to totalCommentLines", () => {
  const code = "/* block */ const x = 1; // single-line comment";
  const result = analyzeCommentMetrics(code, "JavaScript");

  assert.equal(result.singleLineCommentLines, 1);
  assert.equal(result.blockCommentLines, 1);
  assert.equal(result.totalCommentLines, 1); // Set union: contributes only once
  assert.equal(result.commentLinePercentage, 100.0);
});

// ============================================================================
// 4. JavaScript and TypeScript Regex vs Division Disambiguation
// ============================================================================

test("commentAnalyzer: handles regex literals after expression-prefix keywords", () => {
  const keywords = [
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
  ];

  for (const kw of keywords) {
    const code = `${kw} /pattern\\/\\//; // real comment\n`;
    const result = analyzeCommentMetrics(code, "JavaScript");
    assert.equal(
      result.singleLineCommentLines,
      1,
      `Failed to parse regex after keyword "${kw}"`
    );
    assert.equal(result.blockCommentLines, 0);
    assert.equal(result.totalCommentLines, 1);
  }
});

test("commentAnalyzer: handles regex literal after control-flow closing parenthesis", () => {
  const controlStatements = [
    "if (condition) /https?:\\/\\//.test(url);",
    "while (condition) /https?:\\/\\//.test(url);",
    "for (let i = 0; i < 10; i++) /https?:\\/\\//.test(url);",
    "if ((a && b) || (c && d)) /https?:\\/\\//.test(url);",
  ];

  for (const stmt of controlStatements) {
    const code = `${stmt}\n// Real comment\n`;
    const result = analyzeCommentMetrics(code, "JavaScript");
    assert.equal(
      result.singleLineCommentLines,
      1,
      `Failed to parse regex after control parenthesis: "${stmt}"`
    );
    assert.equal(result.blockCommentLines, 0);
    assert.equal(result.totalCommentLines, 1);
  }
});

test("commentAnalyzer: handles regex literal following a completed function or block statement", () => {
  const blockCases = [
    `function foo() {}
/https?:\\/\\//.test(url);
// Real comment`,
    `if (condition) {
  doSomething();
}
/https?:\\/\\//.test(url);
// Real comment`,
    `{
  doSomething();
}
/https?:\\/\\//.test(url);
// Real comment`,
  ];

  for (const snippet of blockCases) {
    const result = analyzeCommentMetrics(snippet, "JavaScript");
    assert.equal(
      result.singleLineCommentLines,
      1,
      `Failed for block snippet: ${snippet}`
    );
    assert.equal(result.blockCommentLines, 0);
    assert.equal(result.totalCommentLines, 1);
  }
});

test("commentAnalyzer: handles regex literal after comments and whitespace without losing context", () => {
  const code = `
if (condition) /* explanation */ /https?:\\/\\//.test(url);
function foo() {} // comment
/https?:\\/\\//.test(url);
// Final comment
`;
  const result = analyzeCommentMetrics(code.trim(), "JavaScript");
  // Line 1: /* explanation */ (block comment 1)
  // Line 2: // comment (single comment 1)
  // Line 4: // Final comment (single comment 2)
  // Regexes on lines 1 and 3 are not comments!
  assert.equal(result.singleLineCommentLines, 2);
  assert.equal(result.blockCommentLines, 1);
  assert.equal(result.totalCommentLines, 3);
});

test("commentAnalyzer: handles regex literal immediately following a block comment without overwriting token context", () => {
  const code = "const pattern = /* explanation */ /https?:\\/\\//;\n// Real comment\n";
  const result = analyzeCommentMetrics(code, "JavaScript");

  assert.equal(result.singleLineCommentLines, 1);
  assert.equal(result.blockCommentLines, 1);
  assert.equal(result.totalCommentLines, 2);
});

test("commentAnalyzer: handles regex literals containing escaped /, //, and /* sequences and character classes", () => {
  const code = `
const r1 = /\\/\\*/;       // escaped /* inside regex
const r2 = /\\/\\//;       // escaped // inside regex
const r3 = /https?:\\/\\//; // escaped url slashes
const r4 = /[/]/;         // unescaped slash in character class
const r5 = /[/*]/;        // /* inside character class
const r6 = /[\\/]/;        // escaped slash in character class
const r7 = /[/\\/]/;       // multiple slashes in character class
// Trailing comment
`;
  const result = analyzeCommentMetrics(code.trim(), "JavaScript");

  assert.equal(result.blockCommentLines, 0);
  assert.equal(result.singleLineCommentLines, 8);
  assert.equal(result.totalCommentLines, 8);
});

test("commentAnalyzer: distinguishes division operators followed by line and block comments", () => {
  const code = `
const x = a / b; // single-line comment on division
const y = a / /* block comment */ b;
const z = a / b /* comment */ / c;
const d1 = foo(condition) / 2; // division after non-control paren
const d2 = ({ a: 1 }) / 2;     // division after object literal paren
`;
  const result = analyzeCommentMetrics(code.trim(), "JavaScript");

  // Lines 1, 4, 5 have single line comments
  // Lines 2, 3 have block comments
  assert.equal(result.singleLineCommentLines, 3);
  assert.equal(result.blockCommentLines, 2);
  assert.equal(result.totalCommentLines, 5);
});

test("commentAnalyzer: handles regex literals inside template literal interpolation expressions \${...}", () => {
  const code = "const s = `val: ${ /pattern\\/\\//.test(x) }`;\n// real comment\n";
  const result = analyzeCommentMetrics(code, "JavaScript");

  assert.equal(result.singleLineCommentLines, 1);
  assert.equal(result.blockCommentLines, 0);
  assert.equal(result.totalCommentLines, 1);
});

test("commentAnalyzer: preserves interpolation context across comments inside \${...}", () => {
  const code = `
const s = \`val: \${
  // Comment inside interpolation expression
  /pattern\\/\\//.test(x)
}\`;
// Real trailing comment
`;
  const result = analyzeCommentMetrics(code.trim(), "JavaScript");

  assert.equal(result.singleLineCommentLines, 2);
  assert.equal(result.blockCommentLines, 0);
  assert.equal(result.totalCommentLines, 2);
});

// ============================================================================
// 5. C# Interpolated Strings ($"...", $@"...", @$"...")
// ============================================================================

test("commentAnalyzer: counts comments inside C# interpolation expressions and ignores comment markers in string body", () => {
  const code = `
string s1 = $"Hello // not comment in string body {
    // Comment inside C# interpolation
    GetName()
} world /* also not comment */!";

string s2 = $@"Verbatim // not comment {
    /* Block comment inside verbatim interpolation */
    GetPath()
}!";

string s3 = @$"Interpolated @$ // not comment {
    // Single comment inside @$
    GetValue()
}!";

// Real trailing comment
`;
  const result = analyzeCommentMetrics(code.trim(), "C#");

  // Line 3: // Comment inside C# interpolation
  // Line 8: /* Block comment inside verbatim interpolation */
  // Line 13: // Single comment inside @$
  // Line 17: // Real trailing comment
  assert.equal(result.singleLineCommentLines, 3);
  assert.equal(result.blockCommentLines, 1);
  assert.equal(result.totalCommentLines, 4);
});

test("commentAnalyzer: ignores comment markers in C# escaped braces {{ and }}", () => {
  const code = `
string s1 = $"Literal {{ // not a comment }} and {x}";
string s2 = $@"Literal {{ /* not comment */ }} and {y}";
// Real comment
`;
  const result = analyzeCommentMetrics(code.trim(), "C#");

  assert.equal(result.singleLineCommentLines, 1);
  assert.equal(result.blockCommentLines, 0);
  assert.equal(result.totalCommentLines, 1);
});

// ============================================================================
// 6. Python f-strings (f"...", f\"\"\"...\"\"\")
// ============================================================================

test("commentAnalyzer: counts comments inside Python 3.12+ f-string expressions and ignores comment markers in string body", () => {
  const code = `
query = f"""SELECT * FROM users WHERE {
    # Filter by status
    status == 'active' # Inline comment
} AND role = 'admin'"""

msg = f"hello # not comment {x} world # still not comment"

# Real trailing comment
`;
  const result = analyzeCommentMetrics(code.trim(), "Python");

  // Line 2: # Filter by status
  // Line 3: # Inline comment
  // Line 8: # Real trailing comment
  // Note: "# not comment" and "# still not comment" inside f"..." are in the string body!
  assert.equal(result.singleLineCommentLines, 3);
  assert.equal(result.blockCommentLines, 0);
  assert.equal(result.totalCommentLines, 3);
});

test("commentAnalyzer: ignores comment markers in Python f-string escaped braces {{ and }}", () => {
  const code = `
s1 = f"Literal {{ # not comment }} and {x}"
s2 = f"""Multi {{
    # not comment
}} and {y}"""
# Real comment
`;
  const result = analyzeCommentMetrics(code.trim(), "Python");

  assert.equal(result.singleLineCommentLines, 1);
  assert.equal(result.blockCommentLines, 0);
  assert.equal(result.totalCommentLines, 1);
});

// ============================================================================
// 7. C++ Raw-String Delimiter Validation
// ============================================================================

test("commentAnalyzer: validates C++ raw-string delimiters and ignores comment markers inside valid raw strings", () => {
  const code = `
// Valid delimiter: 'delim'
const char* s1 = R"delim(
    raw text // not comment
    /* not comment */
)delim";

// Valid empty delimiter: ''
const char* s2 = R"(
    raw text // not comment
)";

// Real C++ comment
`;
  const result = analyzeCommentMetrics(code.trim(), "C++");

  // Line 1: // Valid delimiter: 'delim'
  // Line 7: // Valid empty delimiter: ''
  // Line 12: // Real C++ comment
  assert.equal(result.singleLineCommentLines, 3);
  assert.equal(result.blockCommentLines, 0);
  assert.equal(result.totalCommentLines, 3);
});

test("commentAnalyzer: rejects invalid C++ raw-string delimiters without entering raw-string mode", () => {
  const code = `
// Invalid delimiter with spaces (not a raw string literal)
const char* s1 = R"invalid delimiter with space( // comment inside standard string )";

// Invalid delimiter exceeding 16 characters
const char* s2 = R"delimiter_exceeding_16_characters( // comment inside standard string )";

// Real C++ comment
`;
  const result = analyzeCommentMetrics(code.trim(), "C++");

  // Line 1: // Invalid delimiter with spaces
  // Line 4: // Invalid delimiter exceeding 16 characters
  // Line 7: // Real C++ comment
  // Inside the standard strings, "// comment inside standard string" is also inside quotes and not counted
  assert.equal(result.singleLineCommentLines, 3);
  assert.equal(result.blockCommentLines, 0);
  assert.equal(result.totalCommentLines, 3);
});

// ============================================================================
// 8. Other Supported Languages and String Syntaxes
// ============================================================================

test("commentAnalyzer: ignores comments inside Java text blocks (\"\"\"...\"\"\")", () => {
  const code = `
public class App {
    String query = """
        SELECT * FROM users
        -- not an SQL comment
        // not a Java comment
        /* not a block comment */
        """;
    // Real Java comment
}
`;
  const result = analyzeCommentMetrics(code.trim(), "Java");

  assert.equal(result.singleLineCommentLines, 1);
  assert.equal(result.blockCommentLines, 0);
  assert.equal(result.totalCommentLines, 1);
});

test("commentAnalyzer: ignores comments inside Dart triple-quoted and raw strings", () => {
  const code = `
var s1 = """
  Dart multiline: // not comment
  /* not comment */
""";

var s2 = '''
  Dart single-multiline: // not comment
  /* not comment */
''';

var s3 = r"Dart raw: // not comment /* not comment */";
var s4 = r'Dart raw single: // not comment';

// Real Dart comment
`;
  const result = analyzeCommentMetrics(code.trim(), "Dart");

  assert.equal(result.singleLineCommentLines, 1);
  assert.equal(result.blockCommentLines, 0);
  assert.equal(result.totalCommentLines, 1);
});

test("commentAnalyzer: ignores comments inside Swift multiline (\"\"\"...\"\"\") and raw strings (#\"...\"#)", () => {
  const code = `
let s1 = """
    Swift multiline: // not comment
    /* not comment */
"""

let s2 = #"Swift raw: // not comment /* not comment */"#
let s3 = ##"Swift double raw: // not comment"##

// Real Swift comment
`;
  const result = analyzeCommentMetrics(code.trim(), "Swift");

  assert.equal(result.singleLineCommentLines, 1);
  assert.equal(result.blockCommentLines, 0);
  assert.equal(result.totalCommentLines, 1);
});

test("commentAnalyzer: ignores comments inside Kotlin triple-quoted raw strings", () => {
  const code = `
val s = """
    Kotlin raw string: // not comment
    /* not comment */
"""
// Real Kotlin comment
`;
  const result = analyzeCommentMetrics(code.trim(), "Kotlin");

  assert.equal(result.singleLineCommentLines, 1);
  assert.equal(result.blockCommentLines, 0);
  assert.equal(result.totalCommentLines, 1);
});

test("commentAnalyzer: ignores comments inside Scala triple-quoted strings", () => {
  const code = `
val s = """
    Scala multiline: // not comment
    /* not comment */
"""
// Real Scala comment
`;
  const result = analyzeCommentMetrics(code.trim(), "Scala");

  assert.equal(result.singleLineCommentLines, 1);
  assert.equal(result.blockCommentLines, 0);
  assert.equal(result.totalCommentLines, 1);
});

test("commentAnalyzer: does NOT classify Python triple-quoted docstrings as comments", () => {
  const code = `
"""
Module docstring.
# Not a comment
"""

def my_func():
    '''
    Function docstring.
    # Not a comment
    '''
    r_str = r"raw \"quote\" # not comment"
    # Real Python comment
    return 42
`;
  const result = analyzeCommentMetrics(code.trim(), "Python");

  assert.equal(result.singleLineCommentLines, 1);
  assert.equal(result.blockCommentLines, 0);
  assert.equal(result.totalCommentLines, 1);
});

test("commentAnalyzer: ignores comment markers inside SQL PostgreSQL dollar-quoted strings and ANSI quotes", () => {
  const code = `
-- Query start
SELECT $$
    PostgreSQL dollar string: -- not a comment
    /* also not a comment */
$$ AS test1,
$func$
    Another dollar tag: -- not comment
    /* not comment */
$func$ AS test2,
'Standard SQL with ''-- not comment''' AS test3
/* Real SQL
   block comment */
FROM tbl;
`;
  const result = analyzeCommentMetrics(code.trim(), "SQL");

  assert.equal(result.singleLineCommentLines, 1);
  assert.equal(result.blockCommentLines, 2);
  assert.equal(result.totalCommentLines, 3);
});

test("commentAnalyzer: handles nested block comments in Rust, Swift, Kotlin, and Scala", () => {
  const code = `
/* Level 1
   /* Level 2
      /* Level 3 */
      Level 2 */
   Level 1 */
// Single comment
`;
  for (const lang of ["Rust", "Swift", "Kotlin", "Scala"]) {
    const result = analyzeCommentMetrics(code.trim(), lang);
    assert.equal(result.singleLineCommentLines, 1, `Failed for ${lang}`);
    assert.equal(result.blockCommentLines, 5, `Failed for ${lang}`);
    assert.equal(result.totalCommentLines, 6, `Failed for ${lang}`);
  }
});

test("commentAnalyzer: supports CSS (/* */ only) and SCSS (both // and /* */)", () => {
  const cssCode = `
/* CSS comment */
body {
  color: red; // not a standard CSS comment
}
`;
  const cssResult = analyzeCommentMetrics(cssCode.trim(), "CSS");
  assert.equal(cssResult.singleLineCommentLines, 0);
  assert.equal(cssResult.blockCommentLines, 1);
  assert.equal(cssResult.totalCommentLines, 1);

  const scssResult = analyzeCommentMetrics(cssCode.trim(), "SCSS");
  assert.equal(scssResult.singleLineCommentLines, 1);
  assert.equal(scssResult.blockCommentLines, 1);
  assert.equal(scssResult.totalCommentLines, 2);
});

test("commentAnalyzer: supports HTML (<!-- ... --> comments)", () => {
  const htmlCode = `
<!DOCTYPE html>
<!-- Single line HTML comment -->
<div>
  <!-- Multi-line
       HTML
       comment -->
  <p>Hello</p>
</div>
`;
  const result = analyzeCommentMetrics(htmlCode.trim(), "HTML");
  assert.equal(result.commentSupport, "supported");
  assert.equal(result.singleLineCommentLines, 0);
  assert.equal(result.blockCommentLines, 4);
  assert.equal(result.totalCommentLines, 4);
});
