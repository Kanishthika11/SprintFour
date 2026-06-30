import type { PIISpan } from "../../lib/types";

interface ConfidenceMeterProps {
  span: PIISpan;
}

export function ConfidenceMeter({ span }: ConfidenceMeterProps) {
  if (span.confidence === null) {
    return (
      <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
        Confidence not available
      </div>
    );
  }

  const percentage = Math.round(span.confidence * 100);
  let category = "Low";
  let color = "var(--color-danger)";

  if (span.confidence >= 0.8) {
    category = "High";
    color = "var(--color-success)";
  } else if (span.confidence >= 0.5) {
    category = "Medium";
    color = "var(--color-warning)";
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
          fontSize: 13,
        }}
      >
        <span style={{ fontWeight: 600, color }}>
          {category} Confidence
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {percentage}%
        </span>
      </div>

      {/* Segmented confidence bar */}
      <div
        style={{
          display: "flex",
          gap: 4,
          height: 6,
          backgroundColor: "var(--bg-subtle)",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flex: 1,
            backgroundColor:
              span.confidence >= 0.1 ? color : "transparent",
            borderRadius: "3px 0 0 3px",
            transition: "background-color 0.3s ease",
          }}
        />
        <div
          style={{
            flex: 1,
            backgroundColor:
              span.confidence >= 0.5 ? color : "transparent",
            transition: "background-color 0.3s ease",
          }}
        />
        <div
          style={{
            flex: 1,
            backgroundColor:
              span.confidence >= 0.8 ? color : "transparent",
            borderRadius: "0 3px 3px 0",
            transition: "background-color 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}
