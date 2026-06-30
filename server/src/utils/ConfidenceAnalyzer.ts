import { PIISpan } from "../types.js";
import type { ConfidenceDistribution } from "../types.js";

/**
 * Computes confidence distribution analytics for a set of PII spans.
 * Called during document intake to provide document-level context.
 */
export function computeConfidenceDistribution(
  spans: PIISpan[]
): ConfidenceDistribution {
  const spansWithConfidence = spans.filter((s) => s.confidence !== null);
  const confidences = spansWithConfidence.map((s) => s.confidence!);

  // Mean
  const mean =
    confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0;

  // Median
  const sorted = [...confidences].sort((a, b) => a - b);
  let median = 0;
  if (sorted.length > 0) {
    median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
  }

  // Standard deviation
  const variance =
    confidences.length > 0
      ? confidences.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) /
        confidences.length
      : 0;
  const stdDev = Math.sqrt(variance);

  // Buckets
  const bucketDefs = [
    { range: "0-20%", label: "Very Low", min: 0, max: 0.2, color: "#ef4444" },
    { range: "20-40%", label: "Low", min: 0.2, max: 0.4, color: "#f97316" },
    { range: "40-60%", label: "Medium", min: 0.4, max: 0.6, color: "#eab308" },
    { range: "60-80%", label: "High", min: 0.6, max: 0.8, color: "#22c55e" },
    { range: "80-100%", label: "Very High", min: 0.8, max: 1.01, color: "#16a34a" },
  ];

  const buckets = bucketDefs.map((b) => {
    const count = confidences.filter(
      (c) => c >= b.min && c < b.max
    ).length;
    return {
      range: b.range,
      label: b.label,
      count,
      percentage:
        confidences.length > 0
          ? Math.round((count / confidences.length) * 100)
          : 0,
      color: b.color,
    };
  });

  return {
    buckets,
    mean: Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    nullCount: spans.length - spansWithConfidence.length,
  };
}
