
const EXCLUDED_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  ".nuxt",
  ".venv",
  "venv",
  "__pycache__",
  "vendor",
]);

// Recognized source-code extensions.
const SOURCE_LANGUAGE_MAP = {
  js: "JavaScript",
  jsx: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  ts: "TypeScript",
  tsx: "TypeScript",
  py: "Python",
  java: "Java",
  cpp: "C++",
  cc: "C++",
  cxx: "C++",
  c: "C",
  h: "C/C++ Header",
  hpp: "C++",
  cs: "C#",
  php: "PHP",
  rb: "Ruby",
  go: "Go",
  rs: "Rust",
  swift: "Swift",
  kt: "Kotlin",
  dart: "Dart",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  sass: "Sass",
  sql: "SQL",
  sh: "Shell",
  bat: "Batch",
  ps1: "PowerShell",
  vue: "Vue",
  svelte: "Svelte",
  ex: "Elixir",
  exs: "Elixir",
  hs: "Haskell",
  scala: "Scala",
  lua: "Lua",
  pl: "Perl",
  r: "R",
  jl: "Julia",
};

const getExtension = (filePath) => {
  const fileName = filePath.split("/").pop();
  const lastDot = fileName.lastIndexOf(".");

  if (lastDot <= 0 || lastDot === fileName.length - 1) {
    return "no-extension";
  }

  return fileName.slice(lastDot + 1).toLowerCase();
};

const shouldExclude = (filePath) => {
  const directories = filePath.split("/");

  return directories.some((directory) =>
    EXCLUDED_DIRECTORIES.has(directory.toLowerCase())
  );
};

export const analyzeFileTree = (tree) => {
  const entries = Array.isArray(tree) ? tree : [];

  const allFiles = entries.filter((item) => item.type === "blob");

  const allDirectories = entries.filter(
    (item) => item.type === "tree"
  );

  const analysisFiles = allFiles.filter(
    (file) => !shouldExclude(file.path)
  );

  const extensions = {};
  const languages = {};
  const sourceFileSizes = [];

  // Count extensions across all repository files.
  for (const file of allFiles) {
    const extension = getExtension(file.path);

    extensions[extension] = (extensions[extension] || 0) + 1;
  }

  // Count recognized source files and collect their sizes.
  let sourceFiles = 0;

  for (const file of analysisFiles) {
    const extension = getExtension(file.path);
    const language = SOURCE_LANGUAGE_MAP[extension];

    if (language) {
      sourceFiles++;

      languages[language] = (languages[language] || 0) + 1;

      if (
        Number.isFinite(file.size) &&
        file.size >= 0
      ) {
        sourceFileSizes.push({
          path: file.path,
          size: file.size,
          language,
        });
      }
    }
  }

  const supportingFiles = analysisFiles.length - sourceFiles;

  const hasReadme = analysisFiles.some((file) => {
    const fileName = file.path.split("/").pop().toLowerCase();

    return /^readme(?:\.[^.]*)?$/.test(fileName);
  });

  return {
    totalFiles: allFiles.length,
    totalDirectories: allDirectories.length,

    analysisEligibleFiles: analysisFiles.length,
    sourceFiles,
    supportingFiles,
    excludedFiles: allFiles.length - analysisFiles.length,

    hasReadme,

    extensions,
    languages,

    // Internal input for Feature 3.4 anomaly detection.
    sourceFileSizes,
  };
};
