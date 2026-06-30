import type { ConfidenceDistribution } from "../../lib/types";

interface ConfidenceChartProps {
  data: ConfidenceDistribution;
}

export function ConfidenceChart({ data }: ConfidenceChartProps) {
  const totalSpansCount = data.buckets.reduce((sum, b) => sum + b.count, 0);

  // Find max count to scale the bar heights
  const maxCount = Math.max(...data.buckets.map((b) => b.count), 1);

  return (
    <div
      style={{
        width: "100%",
        padding: "16px",
        backgroundColor: "var(--bg-subtle)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-default)",
        boxSizing: "border-box",
      }}
    >
      <h3
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: "var(--text-primary)",
          margin: "0 0 16px 0",
        }}
      >
        Confidence Distribution ({totalSpansCount} spans)
      </h3>

      {/* Bar Chart Container */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          height: "140px",
          paddingBottom: "8px",
          borderBottom: "1px solid var(--border-default)",
          gap: "8px",
        }}
      >
        {data.buckets.map((bucket, index) => {
          const heightPct = (bucket.count / maxCount) * 100;
          return (
            <div
              key={index}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                height: "100%",
                justifyContent: "flex-end",
                position: "relative",
              }}
              title={`${bucket.label} (${bucket.range}): ${bucket.count} spans (${bucket.percentage}%)`}
            >
              {/* Count label on top of the bar */}
              {bucket.count > 0 && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    marginBottom: "4px",
                  }}
                >
                  {bucket.count}
                </span>
              )}

              {/* Bar representation */}
              <div
                style={{
                  width: "100%",
                  height: `${heightPct}%`,
                  minHeight: bucket.count > 0 ? "4px" : "0px",
                  backgroundColor: bucket.color,
                  borderRadius: "4px 4px 0 0",
                  opacity: bucket.count > 0 ? 0.85 : 0.2,
                  transition: "height 0.3s ease, opacity 0.2s ease",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* X-Axis Labels */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "8px",
          marginTop: "8px",
        }}
      >
        {data.buckets.map((bucket, index) => (
          <div
            key={index}
            style={{
              flex: 1,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              {bucket.label}
            </span>
            <span
              style={{
                fontSize: "9px",
                color: "var(--text-muted)",
              }}
            >
              {bucket.range}
            </span>
          </div>
        ))}
      </div>

      {/* Summary Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
          marginTop: "20px",
          paddingTop: "16px",
          borderTop: "1px solid var(--border-default)",
        }}
      >
        <div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "2px" }}>
            Mean
          </div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
            {Math.round(data.mean * 100)}%
          </div>
        </div>
        <div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "2px" }}>
            Median
          </div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
            {Math.round(data.median * 100)}%
          </div>
        </div>
        <div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "2px" }}>
            Spread (σ)
          </div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
            {Math.round(data.stdDev * 100)}%
          </div>
        </div>
      </div>

      {/* Null Count alert if some spans lack confidence */}
      {data.nullCount > 0 && (
        <div
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            marginTop: "12px",
            fontStyle: "italic",
          }}
        >
          * Excludes {data.nullCount} pattern-matched span(s) with unavailable confidence.
        </div>
      )}
    </div>
  );
}
