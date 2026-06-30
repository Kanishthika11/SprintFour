import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useDocumentStore } from "../../store/documentStore";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { AskWhyBox } from "./AskWhyBox";
import { SpanActions } from "./SpanActions";
import type { PIIDocumentResponse, PIISpan } from "../../lib/types";
import { PII_CATEGORY_LABELS } from "../../lib/types";
import {
  X,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Eye,
  Lock,
} from "lucide-react";
import { api } from "../../lib/api";
import { Button } from "../common/Button";

interface ExplanationPanelProps {
  span: PIISpan;
  document: PIIDocumentResponse;
  onClose: () => void;
}

export function ExplanationPanel({
  span,
  document: doc,
  onClose,
}: ExplanationPanelProps) {
  const {
    worriedMode,
    flaggedWrongSpans,
    toggleFlagWrong,
    sidebarWidth,
    setSidebarWidth,
  } = useDocumentStore();

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(320, Math.min(800, startWidth - deltaX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };
  const [revealedText, setRevealedText] = useState<string | null>(null);
  const [revealStep, setRevealStep] = useState(0); // 0=hidden, 1=confirm, 2=shown
  const [revealLoading, setRevealLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reset state on span ID changes
  useEffect(() => {
    setRevealedText(null);
    setRevealStep(0);
    setToastMessage(null);
  }, [span.id]);

  const label = PII_CATEGORY_LABELS[span.type] || span.type;
  const isRedacted = span.decision === "redacted";
  const title = isRedacted
    ? "Why was this redacted?"
    : "Why wasn't this hidden?";

  const handleReveal = async () => {
    if (revealStep === 0) {
      setRevealStep(1);
      return;
    }
    if (revealStep === 1) {
      setRevealLoading(true);
      try {
        const result = await api.reveal(span.id, doc.documentId);
        setRevealedText(result.originalText || span.text);
        setRevealStep(2);
      } catch (err) {
        console.error("Reveal failed, falling back to local text property:", err);
        setRevealedText(span.text);
        setRevealStep(2);
      } finally {
        setRevealLoading(false);
      }
    }
  };

  const handleFlagWrong = () => {
    toggleFlagWrong(span.id);
    const isCurrentlyFlagged = flaggedWrongSpans[span.id];
    setToastMessage(
      isCurrentlyFlagged ? "Marked as correct" : "Flagged as wrong successfully!"
    );
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Count occurrences in the same group
  const groupCount = doc.spans.filter(
    (s) => s.occurrenceGroup === span.occurrenceGroup
  ).length;

  const isFlaggedWrong = !!flaggedWrongSpans[span.id];

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      style={{
        position: "relative",
        width: sidebarWidth,
        maxWidth: "50%",
        minWidth: 320,
        height: "100%",
        backgroundColor: "#ffffff", // premium white card background
        borderLeft: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-sm)",
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Left resizable drag handle */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: 5,
          cursor: "col-resize",
          zIndex: 40,
          transition: "background-color 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--accent-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      />

      {/* Header */}
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid var(--border-default)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            {isRedacted ? (
              <ShieldCheck
                size={18}
                style={{ color: "var(--accent-primary)" }}
              />
            ) : (
              <Eye size={18} style={{ color: "var(--color-success)" }} />
            )}
            <h3
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              {title}
            </h3>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "var(--font-mono)",
                color: "var(--accent-primary)",
                padding: "2px 8px",
                backgroundColor: "var(--accent-primary-subtle)",
                borderRadius: "var(--radius-sm)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: "var(--radius-sm)",
                backgroundColor:
                  span.decision === "redacted"
                    ? "var(--accent-primary-subtle)"
                    : "var(--color-success-subtle)",
                color:
                  span.decision === "redacted"
                    ? "var(--accent-primary)"
                    : "var(--color-success-text)",
                fontWeight: 500,
              }}
            >
              {span.decision === "redacted" ? "Redacted" : "Kept visible"}
            </span>
            {span.isBorderline && (
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--color-warning-subtle)",
                  color: "var(--color-warning-text)",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <AlertTriangle size={10} />
                Borderline
              </span>
            )}
          </div>
        </div>
        <Button
          variant="icon"
          onClick={onClose}
          aria-label="Close explanation panel"
          style={{ color: "var(--text-secondary)" }}
        >
          <X size={18} />
        </Button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflow: "auto", padding: "24px" }}>
        {/* Toast confirmation */}
        {toastMessage && (
          <div
            style={{
              padding: "10px 14px",
              backgroundColor: "#f0fdf4",
              color: "#166534",
              fontSize: 12,
              fontWeight: 600,
              borderRadius: "var(--radius-md)",
              border: "1px solid #bbf7d0",
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            {toastMessage}
          </div>
        )}

        {/* Section A: Detected text */}
        <Section title="Detected Text">
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              padding: "10px 14px",
              backgroundColor: "var(--bg-subtle)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-default)",
              color: revealedText ? "var(--color-danger)" : "var(--text-primary)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {revealedText ? revealedText : (isRedacted ? `[REDACTED: ${span.type}]` : span.text)}
          </div>
        </Section>

        {/* Section B: Confidence */}
        <Section title="Confidence">
          <ConfidenceMeter span={span} />
        </Section>

        {/* Section C: Reasoning */}
        <Section title="Reasoning">
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            {worriedMode
              ? `⚠️ ${span.reasoning.summary} You should take a careful look at this one.`
              : span.reasoning.summary}
          </p>
        </Section>

        {/* Section D: Signals */}
        <Section title="Detection Signals">
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {span.reasoning.signals.map((signal, i) => (
              <li
                key={i}
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 6,
                  lineHeight: 1.5,
                }}
              >
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    backgroundColor: "var(--accent-primary)",
                    flexShrink: 0,
                    marginTop: 6,
                  }}
                />
                {signal}
              </li>
            ))}
          </ul>
        </Section>

        {/* Section E: Possible Risk */}
        <Section title="Possible Risk">
          <div
            style={{
              padding: "10px 14px",
              backgroundColor: "var(--color-danger-subtle)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-danger)",
              fontSize: 12,
              color: "var(--color-danger-text)",
              lineHeight: 1.6,
            }}
          >
            <ShieldAlert
              size={13}
              style={{
                display: "inline",
                verticalAlign: "middle",
                marginRight: 6,
                color: "var(--color-danger-text)",
              }}
            />
            {worriedMode
              ? `🚨 ${span.reasoning.possibleRisk} This is something to take seriously.`
              : span.reasoning.possibleRisk}
          </div>
        </Section>

        {/* Section F: Threshold Context */}
        <Section title="Threshold Context">
          <div
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              padding: "8px 12px",
              backgroundColor: "var(--bg-subtle)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-default)",
            }}
          >
            Our cutoff is{" "}
            <strong>{Math.round(span.reasoning.threshold * 100)}%</strong>.
            {span.confidence !== null ? (
              <>
                {" "}
                This was at{" "}
                <strong>{Math.round(span.confidence * 100)}%</strong> —{" "}
                {span.confidence >= span.reasoning.threshold
                  ? "above the threshold."
                  : "below the threshold."}
              </>
            ) : (
              " Confidence was not available for this detection."
            )}
          </div>
        </Section>

        {/* Section G: Reveal Original */}
        {isRedacted && (
          <Section title="Verify Redaction">
            {revealedText === null ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Button
                  variant="secondary"
                  onClick={handleReveal}
                  disabled={revealLoading}
                  style={{ width: "100%" }}
                >
                  {revealStep === 1
                    ? (revealLoading ? "Loading..." : "Yes, show me")
                    : "Original text (local only)"}
                </Button>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    textAlign: "center",
                    fontStyle: "italic",
                  }}
                >
                  Click 'Reveal' to show original (local only)
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: "12px 14px",
                  backgroundColor: "var(--bg-subtle)",
                  border: "1px dashed var(--border-strong)",
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Lock size={12} style={{ color: "var(--text-muted)" }} />
                  <span>🔒 Original text · stored locally only</span>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    color: "var(--color-danger-text)",
                    fontWeight: 600,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    padding: "6px 10px",
                    backgroundColor: "var(--color-danger-subtle)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-danger)",
                  }}
                >
                  {revealedText}
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Section H: Actions (Flag as Wrong) */}
        <Section title="Actions">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Button
              variant="danger"
              onClick={handleFlagWrong}
              style={{ width: "100%" }}
            >
              {isFlaggedWrong ? "Remove Flag" : "Flag as Wrong"}
            </Button>
            <div style={{ marginTop: 8 }}>
              <SpanActions span={span} document={doc} groupCount={groupCount} />
            </div>
          </div>
        </Section>

        {/* Ask Conseal AI Section */}
        <AskWhyBox span={span} documentId={doc.documentId} />
      </div>
    </motion.div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h4
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 8,
        }}
      >
        {title}
      </h4>
      {children}
    </div>
  );
}
