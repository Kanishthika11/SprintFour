import type { PIISpan } from "../../lib/types";
import { PII_CATEGORY_LABELS } from "../../lib/types";

interface SpanTooltipProps {
  span: PIISpan;
}

export function SpanTooltip({ span }: SpanTooltipProps) {
  const label = PII_CATEGORY_LABELS[span.type] || span.type;
  const firstSentence = span.reasoning.summary.split(". ")[0] + ".";

  return (
    <div
      style={{
        position: "absolute",
        bottom: "calc(100% + 8px)",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        padding: "10px 14px",
        boxShadow: "var(--shadow-lg)",
        zIndex: 40,
        width: 280,
        pointerEvents: "none",
        animation: "fadeIn 0.15s ease-out",
      }}
    >
      {/* Type badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            fontFamily: "var(--font-mono)",
            color:
              span.decision === "redacted"
                ? "var(--accent-primary)"
                : "var(--color-success)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </span>
        {span.confidence !== null && (
          <span
            style={{
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              color: "var(--text-muted)",
            }}
          >
            {Math.round(span.confidence * 100)}%
          </span>
        )}
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            padding: "1px 6px",
            borderRadius: 4,
            backgroundColor:
              span.decision === "redacted"
                ? "var(--accent-primary-subtle)"
                : "var(--color-success-subtle)",
            color:
              span.decision === "redacted"
                ? "var(--accent-primary)"
                : "var(--color-success)",
          }}
        >
          {span.decision}
        </span>
      </div>

      {/* One-line reason */}
      <p
        style={{
          fontSize: 12,
          color: "var(--text-secondary)",
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        {firstSentence}
      </p>

      {/* Click hint */}
      <p
        style={{
          fontSize: 10,
          color: "var(--text-muted)",
          marginTop: 6,
        }}
      >
        Click for full explanation →
      </p>

      {/* Tooltip arrow */}
      <div
        style={{
          position: "absolute",
          bottom: -5,
          left: "50%",
          transform: "translateX(-50%) rotate(45deg)",
          width: 10,
          height: 10,
          backgroundColor: "var(--bg-surface)",
          borderRight: "1px solid var(--border-default)",
          borderBottom: "1px solid var(--border-default)",
        }}
      />
    </div>
  );
}
