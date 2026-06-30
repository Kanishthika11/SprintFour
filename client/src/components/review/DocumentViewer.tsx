import { useMemo, useCallback } from "react";
import { useDocumentStore } from "../../store/documentStore";
import { SpanTooltip } from "./SpanTooltip";
import type { PIIDocumentResponse, PIISpan } from "../../lib/types";
import {
  User,
  Mail,
  Phone,
  MapPin,
  ShieldAlert,
  Calendar,
  CreditCard,
  Building2,
  Globe,
  Heart,
  HelpCircle,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  PERSON_NAME: User,
  EMAIL: Mail,
  PHONE: Phone,
  ADDRESS: MapPin,
  SSN_OR_GOVT_ID: ShieldAlert,
  DATE_OF_BIRTH: Calendar,
  FINANCIAL_ACCOUNT: CreditCard,
  ORG: Building2,
  IP_ADDRESS: Globe,
  MEDICAL_INFO: Heart,
  OTHER: HelpCircle,
};

interface DocumentViewerProps {
  document: PIIDocumentResponse;
  threshold: number;
}

export function DocumentViewer({ document: doc, threshold }: DocumentViewerProps) {
  const { selectedSpanId, hoveredSpanId, selectSpan, hoverSpan } =
    useDocumentStore();

  const getEffectiveDecision = useCallback(
    (span: PIISpan): "redacted" | "kept" => {
      if (span.status === "accepted") return span.decision;
      if (span.status === "rejected") {
        return span.decision === "redacted" ? "kept" : "redacted";
      }
      if (span.status === "modified") return "redacted";
      // pending
      if (span.confidence !== null && span.confidence < threshold) {
        return "kept";
      }
      return span.decision;
    },
    [threshold]
  );

  const getSpanClassName = useCallback(
    (span: PIISpan): string => {
      const classes = ["pii-span"];
      const effective = getEffectiveDecision(span);

      if (effective === "redacted") {
        if (span.isBorderline) {
          classes.push("pii-span--redacted-borderline");
        } else {
          classes.push("pii-span--redacted-high");
        }
      } else {
        classes.push("pii-span--kept");
      }

      if (span.id === selectedSpanId) {
        classes.push("pii-span--selected");
      }

      if (span.status === "accepted") {
        classes.push("pii-span--accepted");
      } else if (span.status === "rejected") {
        classes.push("pii-span--rejected");
      }

      return classes.join(" ");
    },
    [selectedSpanId, getEffectiveDecision]
  );

  // Use pre-split segments from the server for perfect boundary masking
  const renderedSegments = useMemo(() => {
    if (doc.segments && doc.segments.length > 0) {
      return doc.segments.map((seg) => {
        const span = seg.spanId ? doc.spans.find((s) => s.id === seg.spanId) : null;
        return {
          text: seg.text,
          span,
        };
      });
    }

    // Fallback: character-based slicing if segments is not populated
    const result: Array<{ text: string; span: PIISpan | null }> = [];
    const sortedSpans = [...doc.spans].sort((a, b) => a.startIndex - b.startIndex);
    const text = doc.redactedText || "";
    let redactPos = 0;
    let origPos = 0;

    for (const span of sortedSpans) {
      if (span.startIndex > origPos) {
        const len = span.startIndex - origPos;
        const plainText = text.substring(redactPos, redactPos + len);
        result.push({ text: plainText, span: null });
        redactPos += len;
        origPos = span.startIndex;
      }
      const isRedacted = getEffectiveDecision(span) === "redacted";
      const displayLength = isRedacted ? `[REDACTED: ${span.type}]`.length : span.text.length;
      const displayText = text.substring(redactPos, redactPos + displayLength);
      result.push({ text: displayText, span });
      redactPos += displayLength;
      origPos = span.endIndex;
    }
    if (redactPos < text.length) {
      result.push({ text: text.substring(redactPos), span: null });
    }
    return result;
  }, [doc.segments, doc.spans, doc.redactedText, getEffectiveDecision]);

  return (
    <div>
      {/* Document title info band */}
      <div style={{ marginBottom: 20 }}>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          {doc.title}
        </h2>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            marginTop: 4,
          }}
        >
          Analyzed {new Date(doc.analyzedAt).toLocaleString()} · Hover any
          highlighted text for details, click for full explanation
        </p>
      </div>

      {/* Document text block */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 14,
          lineHeight: 1.8,
          color: "var(--text-primary)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          padding: "24px 28px",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {renderedSegments.map((seg, i) => {
          if (!seg.span) {
            return <span key={i}>{seg.text}</span>;
          }

          const Icon = ICON_MAP[seg.span.type] || HelpCircle;
          const isHovered = seg.span.id === hoveredSpanId;
          const isRedacted = getEffectiveDecision(seg.span) === "redacted";

          return (
            <span key={i} style={{ position: "relative", display: "inline" }}>
              <span
                className={getSpanClassName(seg.span)}
                onClick={() => selectSpan(seg.span!.id)}
                onMouseEnter={() => hoverSpan(seg.span!.id)}
                onMouseLeave={() => hoverSpan(null)}
                tabIndex={0}
                role="button"
                aria-label={`${seg.span.type}: ${seg.text}`}
                id={`span-${seg.span.id}`}
              >
                <span className="pii-span-icon">
                  <Icon size={12} />
                </span>
                {isRedacted ? `[REDACTED: ${seg.span.type}]` : seg.span.text}
              </span>
              {isHovered && hoveredSpanId !== selectedSpanId && (
                <SpanTooltip span={seg.span} />
              )}
            </span>
          );
        })}
      </div>

      {/* Legend list */}
      <div
        style={{
          display: "flex",
          gap: 20,
          marginTop: 16,
          padding: "10px 16px",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          flexWrap: "wrap",
        }}
      >
        <LegendItem
          className="pii-span--redacted-high"
          label="Redacted (high confidence)"
        />
        <LegendItem
          className="pii-span--redacted-borderline"
          label="Redacted (borderline)"
        />
        <LegendItem className="pii-span--kept" label="Kept visible (flagged)" />
        <span
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
          }}
        >
          Plain text = not flagged
        </span>
      </div>

      {/* Re-identification warning */}
      <div
        style={{
          marginTop: 12,
          padding: "8px 14px",
          backgroundColor: "var(--color-warning-subtle)",
          border: "1px solid var(--color-warning)",
          borderRadius: "var(--radius-sm)",
          fontSize: 11,
          color: "var(--color-warning-text)",
          lineHeight: 1.5,
        }}
      >
        ⚠ <strong>Note:</strong> Even after redaction, combinations of
        non-sensitive details (age, ZIP code, job title) may allow
        re-identification. This is a known limitation — full combinatorial
        analysis is not yet supported.
      </div>
    </div>
  );
}

function LegendItem({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span
        className={`pii-span ${className}`}
        style={{ padding: "2px 8px", fontSize: 11, cursor: "default" }}
      >
        sample
      </span>
      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
        {label}
      </span>
    </div>
  );
}
