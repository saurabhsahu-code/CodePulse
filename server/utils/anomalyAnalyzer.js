
const MINIMUM_GROUP_SIZE = 8;
const IQR_MULTIPLIER = 1.5;

// Calculate a percentile using linear interpolation.
const calculatePercentile = (sortedValues, percentile) => {
  const index = (sortedValues.length - 1) * percentile;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);

  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex];
  }

  const fraction = index - lowerIndex;

  return (
    sortedValues[lowerIndex] * (1 - fraction) +
    sortedValues[upperIndex] * fraction
  );
};

const formatBytes = (bytes) => {
  if (bytes < 1024) {
    return `${bytes} bytes`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// Group valid files by programming language.
const groupFilesByLanguage = (files) => {
  const groups = {};

  for (const file of files) {
    const language = file.language || "Unknown";

    if (!groups[language]) {
      groups[language] = [];
    }

    groups[language].push(file);
  }

  return groups;
};

// Analyze one language group using log-transformed IQR.
const analyzeLanguageGroup = (language, files) => {
  const transformedSizes = files
    .map((file) => Math.log1p(file.size))
    .sort((a, b) => a - b);

  const q1 = calculatePercentile(transformedSizes, 0.25);
  const q3 = calculatePercentile(transformedSizes, 0.75);
  const iqr = q3 - q1;

  const upperFence = q3 + IQR_MULTIPLIER * iqr;

  // Convert the logarithmic threshold back to bytes.
  const threshold = Math.expm1(upperFence);

  const anomalies = files
    .filter((file) => Math.log1p(file.size) > upperFence)
    .map((file) => ({
      path: file.path,
      size: file.size,
      formattedSize: formatBytes(file.size),
      language,
      threshold: Number(threshold.toFixed(2)),
      formattedThreshold: formatBytes(threshold),
      explanation:
        `This ${language} file is larger than the language-specific upper IQR threshold of ${formatBytes(threshold)}.`,
    }));

  return {
    language,
    sampleSize: files.length,
    statistics: {
      q1: Number(q1.toFixed(4)),
      q3: Number(q3.toFixed(4)),
      iqr: Number(iqr.toFixed(4)),
    },
    threshold: Number(threshold.toFixed(2)),
    formattedThreshold: formatBytes(threshold),
    anomalyCount: anomalies.length,
    anomalies,
  };
};

export const analyzeFileSizeAnomalies = (sourceFileSizes) => {
  const validFiles = Array.isArray(sourceFileSizes)
    ? sourceFileSizes.filter(
        (file) =>
          file &&
          typeof file.path === "string" &&
          file.path.length > 0 &&
          Number.isFinite(file.size) &&
          file.size >= 0
      )
    : [];

  const groups = groupFilesByLanguage(validFiles);
  const thresholdsByLanguage = {};
  const anomalies = [];

  let analyzedGroups = 0;
  let skippedGroups = 0;

  for (const [language, files] of Object.entries(groups)) {
    if (files.length < MINIMUM_GROUP_SIZE) {
      skippedGroups++;
      continue;
    }

    const result = analyzeLanguageGroup(language, files);

    analyzedGroups++;
    thresholdsByLanguage[language] = {
      sampleSize: result.sampleSize,
      threshold: result.threshold,
      formattedThreshold: result.formattedThreshold,
      anomalyCount: result.anomalyCount,
    };

    anomalies.push(...result.anomalies);
  }

  // Do not claim that no anomalies exist when no group
  // had enough data for statistical analysis.
  if (analyzedGroups === 0) {
    return {
      status: "insufficient_data",
      method: "Language-specific Log-transformed IQR",
      sampleSize: validFiles.length,
      minimumGroupSize: MINIMUM_GROUP_SIZE,
      analyzedGroups: 0,
      skippedGroups,
      thresholdsByLanguage: {},
      anomalies: [],
      anomalyCount: 0,
      explanation:
        `No language group contained at least ${MINIMUM_GROUP_SIZE} valid source files. More data is required for reliable anomaly detection.`,
    };
  }

  return {
    status: "completed",
    method: "Language-specific Log-transformed IQR",
    sampleSize: validFiles.length,
    minimumGroupSize: MINIMUM_GROUP_SIZE,
    analyzedGroups,
    skippedGroups,
    thresholdsByLanguage,
    anomalies,
    anomalyCount: anomalies.length,
    explanation:
      anomalies.length > 0
        ? `${anomalies.length} unusually large source file(s) detected across ${analyzedGroups} language group(s).`
        : `No unusually large source files were detected across ${analyzedGroups} analyzed language group(s).`,
  };
};
