import { useNavigate } from "react-router-dom";
import { useDocumentStore } from "../../store/documentStore";
import type { PIIDocumentResponse } from "../../lib/types";
import {
  Shield,
  EyeOff,
  AlertTriangle,
  Link2,
  ListFilter,
  FileOutput,
  SlidersHorizontal,
  AlertCircle,
} from "lucide-react";
import { Button } from "../common/Button";

interface TrustSummaryBarProps {
  document: PIIDocumentResponse;
}

export function TrustSummaryBar({ document: doc }: TrustSummaryBarProps) {
  const navigate = useNavigate();
  const { threshold, setThreshold, worriedMode, toggleWorriedMode } =
    useDocumentStore();

  const formattedDate = doc.analyzedAt
    ? new Date(doc.analyzedAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Just now";

  return (
    <div
      style={{
        borderBottom: "1px solid var(--border-default)",
        backgroundColor: "var(--bg-surface)",
        padding: "16px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        flexShrink: 0,
      }}
    >
      {/* ROW 1: Metadata & Statistics (Top Row) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        {/* Left: Document Info & Stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              {doc.title}
            </h2>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Analyzed {formattedDate}
            </span>
          </div>

          {/* Counts indicators */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 12,
              color: "var(--text-secondary)",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Shield size={12} style={{ color: "var(--accent-primary)" }} />
              <span>
                <strong>{doc.meta.totalSpans}</strong> items found
              </span>
            </div>
            <span style={{ color: "var(--border-strong)" }}>|</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <EyeOff size={12} style={{ color: "var(--color-success)" }} />
              <span>
                <strong>{doc.meta.redactedCount}</strong> redacted
              </span>
            </div>
            <span style={{ color: "var(--border-strong)" }}>|</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <AlertTriangle size={12} style={{ color: "var(--color-warning)" }} />
              <span>
                <strong>{doc.meta.borderlineCount}</strong> flagged
              </span>
            </div>
            <span style={{ color: "var(--border-strong)" }}>|</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Link2
                size={12}
                style={{
                  color:
                    doc.consistencyFlags.length > 0
                      ? "var(--color-danger)"
                      : "var(--text-muted)",
                }}
              />
              <span>
                <strong>{doc.consistencyFlags.length}</strong> inconsistencies
              </span>
            </div>
          </div>
        </div>

        {/* Right: Confidence Overview */}
        {doc.confidenceAnalysis && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              backgroundColor: "var(--bg-subtle)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              padding: "8px 16px",
              minWidth: 200,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Avg Confidence
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.1, marginTop: 2 }}>
                {Math.round(doc.confidenceAnalysis.mean * 100)}%
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 4, minWidth: 100 }}>
              {/* Stacked bar representation */}
              <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", backgroundColor: "var(--border-strong)", width: "100%" }}>
                {doc.confidenceAnalysis.buckets.map((b, bi) => {
                  if (b.count === 0) return null;
                  const totalBucketed = doc.confidenceAnalysis.buckets.reduce((acc, curr) => acc + curr.count, 0) || 1;
                  const widthPct = (b.count / totalBucketed) * 100;
                  return (
                    <div
                      key={bi}
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: b.color,
                        height: "100%",
                      }}
                      title={`${b.label}: ${b.count} spans (${b.percentage}%)`}
                    />
                  );
                })}
              </div>
              <span style={{ fontSize: 9, color: "var(--text-secondary)" }}>
                Across {doc.confidenceAnalysis.buckets.reduce((acc, curr) => acc + curr.count, 0)} spans
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ROW 2: Controls & Actions (Bottom Row) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          paddingTop: 12,
          borderTop: "1px solid var(--border-default)",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        {/* Left Bottom: Settings & Sliders */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {/* Threshold Slider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              height: 40,
              backgroundColor: "var(--bg-subtle)",
              borderRadius: "0px",
              border: "1px solid var(--border-default)",
            }}
          >
            <SlidersHorizontal
              size={13}
              style={{ color: "var(--text-secondary)" }}
            />
            <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>
              Threshold
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(threshold * 100)}
              onChange={(e) => setThreshold(Number(e.target.value) / 100)}
              style={{
                width: 90,
                height: 4,
                accentColor: "var(--accent-primary)",
                cursor: "pointer",
              }}
              aria-label="Confidence threshold"
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                color: "var(--text-primary)",
                minWidth: 32,
              }}
            >
              {Math.round(threshold * 100)}%
            </span>
          </div>

          {/* Worried Mode toggle */}
          <Button
            onClick={toggleWorriedMode}
            style={{
              padding: "8px 16px",
              height: 40,
              fontSize: 12,
              fontWeight: 600,
              borderRadius: "0px",
              background: worriedMode
                ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                : "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
              color: worriedMode ? "#ffffff" : "var(--text-primary)",
              border: worriedMode ? "none" : "1px solid var(--border-default)",
            }}
          >
            <AlertCircle size={14} style={{ color: worriedMode ? "#ffffff" : "var(--accent-primary)" }} />
            {worriedMode ? "Worried mode ON" : "Worried mode"}
          </Button>
        </div>

        {/* Right Bottom: Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Review Queue button */}
          <Button
            onClick={() => navigate(`/queue/${doc.documentId}`)}
            style={{
              padding: "8px 20px",
              height: 40,
              fontSize: 12,
              fontWeight: 600,
              borderRadius: "0px",
              background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
              color: "#ffffff",
              border: "none",
            }}
          >
            <ListFilter size={14} />
            Review Queue
          </Button>

          {/* Compare & Export button */}
          <Button
            onClick={() => navigate(`/export/${doc.documentId}`)}
            style={{
              padding: "8px 24px",
              height: 40,
              fontSize: 12,
              fontWeight: 600,
              borderRadius: "0px",
              background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)",
              color: "#ffffff",
              border: "none",
            }}
          >
            <FileOutput size={14} />
            Compare & Export
          </Button>
        </div>
      </div>
    </div>
  );
}
