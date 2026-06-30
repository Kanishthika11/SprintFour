import { useState } from "react";
import { useDocumentStore } from "../../store/documentStore";
import type { PIIDocumentResponse, PIISpan } from "../../lib/types";
import { PII_CATEGORY_LABELS } from "../../lib/types";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowUpDown,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { Button } from "../common/Button";

interface AuditLogSidebarProps {
  document: PIIDocumentResponse;
}

type SortField = "type" | "confidence" | "status";
type FilterType = "all" | "redacted" | "kept" | "borderline";

export function AuditLogSidebar({ document: doc }: AuditLogSidebarProps) {
  const {
    selectedSpanId,
    selectSpan,
    auditLogCollapsed,
    setAuditLogCollapsed,
    auditLogWidth,
    setAuditLogWidth,
  } = useDocumentStore();
  const [filter, setFilter] = useState<FilterType>("all");
  const [sortField, setSortField] = useState<SortField>("confidence");
  const [sortAsc, setSortAsc] = useState(false);

  const filteredSpans = doc.spans
    .filter((span) => {
      if (filter === "all") return true;
      if (filter === "redacted") return span.decision === "redacted";
      if (filter === "kept") return span.decision === "kept";
      if (filter === "borderline") return span.isBorderline;
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === "type") {
        cmp = a.type.localeCompare(b.type);
      } else if (sortField === "confidence") {
        cmp = (b.confidence ?? -1) - (a.confidence ?? -1);
      } else if (sortField === "status") {
        cmp = a.status.localeCompare(b.status);
      }
      return sortAsc ? -cmp : cmp;
    });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const getStatusIcon = (span: PIISpan) => {
    switch (span.status) {
      case "accepted":
        return <CheckCircle2 size={12} style={{ color: "var(--color-success)" }} />;
      case "rejected":
        return <XCircle size={12} style={{ color: "var(--color-danger)" }} />;
      case "modified":
        return <AlertTriangle size={12} style={{ color: "var(--color-warning)" }} />;
      default:
        return <Clock size={12} style={{ color: "var(--text-muted)" }} />;
    }
  };

  const scrollToSpan = (spanId: string) => {
    selectSpan(spanId);
    const el = document.getElementById(`span-${spanId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = auditLogWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(200, Math.min(600, startWidth - deltaX));
      setAuditLogWidth(newWidth);
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

  if (auditLogCollapsed) {
    return (
      <div
        style={{
          width: 40,
          borderLeft: "1px solid var(--border-default)",
          backgroundColor: "var(--bg-surface)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flexShrink: 0,
          overflow: "hidden",
          padding: "8px 0",
          gap: 16,
        }}
      >
        <Button
          variant="icon"
          onClick={() => setAuditLogCollapsed(false)}
          aria-label="Expand Audit Log"
        >
          <ChevronLeft size={16} />
        </Button>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
          {filteredSpans.map((span) => (
            <button
              key={span.id}
              onClick={() => scrollToSpan(span.id)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: span.id === selectedSpanId ? "var(--bg-subtle)" : "transparent",
              }}
              title={`${PII_CATEGORY_LABELS[span.type]}: ${span.text}`}
            >
              {getStatusIcon(span)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: auditLogWidth,
        maxWidth: "50%",
        minWidth: 280,
        borderLeft: "1px solid var(--border-default)",
        backgroundColor: "var(--bg-surface)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflow: "hidden",
        position: "relative",
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
          padding: "12px 16px 12px 20px",
          borderBottom: "1px solid var(--border-default)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Audit Log
          </h3>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              marginTop: 2,
            }}
          >
            {filteredSpans.length} of {doc.spans.length} items
          </div>
        </div>
        <Button
          variant="icon"
          onClick={() => setAuditLogCollapsed(true)}
          aria-label="Minimize Audit Log"
        >
          <ChevronRight size={16} />
        </Button>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "8px 12px 8px 20px",
          borderBottom: "1px solid var(--border-default)",
          flexWrap: "wrap",
        }}
      >
        {(["all", "redacted", "kept", "borderline"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 14px",
              fontSize: "12px",
              fontWeight: filter === f ? 700 : 500,
              backgroundColor: filter === f ? "#0d9488" : "transparent",
              color: filter === f ? "#ffffff" : "var(--text-secondary)",
              border: filter === f ? "1px solid #0d9488" : "1px solid var(--border-default)",
              borderRadius: "0px",
              cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              textTransform: "capitalize",
              transition: "all 0.15s ease",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Sort controls */}
      <div
        style={{
          display: "flex",
          padding: "6px 12px 6px 20px",
          borderBottom: "1px solid var(--border-default)",
          gap: 8,
        }}
      >
        {(["type", "confidence", "status"] as const).map((field) => (
          <button
            key={field}
            onClick={() => toggleSort(field)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              padding: "2px 4px",
              fontSize: 10,
              color:
                sortField === field
                  ? "var(--accent-primary)"
                  : "var(--text-muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-ui)",
              textTransform: "capitalize",
            }}
          >
            {field}
            {sortField === field && (
              <ArrowUpDown size={8} />
            )}
          </button>
        ))}
      </div>

      {/* Span list */}
      <div style={{ flex: 1, overflow: "auto", padding: "4px 0 4px 10px" }}>
        {filteredSpans.map((span) => (
          <button
            key={span.id}
            onClick={() => scrollToSpan(span.id)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              width: "100%",
              padding: "8px 14px",
              border: "none",
              borderLeft:
                span.id === selectedSpanId
                  ? "3px solid var(--accent-primary)"
                  : "3px solid transparent",
              backgroundColor:
                span.id === selectedSpanId
                  ? "var(--accent-primary-subtle)"
                  : "transparent",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "var(--font-ui)",
              transition: "all 0.1s ease",
            }}
            onMouseEnter={(e) => {
              if (span.id !== selectedSpanId) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  "var(--bg-surface-hover)";
              }
            }}
            onMouseLeave={(e) => {
              if (span.id !== selectedSpanId) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  "transparent";
              }
            }}
          >
            {getStatusIcon(span)}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-mono)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {PII_CATEGORY_LABELS[span.type]}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  marginTop: 2,
                }}
              >
                {span.text.length > 30
                  ? span.text.substring(0, 30) + "…"
                  : span.text}
              </div>
            </div>
            <div
              style={{
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                color:
                  span.confidence !== null && span.confidence >= 0.8
                    ? "var(--color-success)"
                    : span.confidence !== null && span.confidence >= 0.5
                    ? "var(--color-warning)"
                    : "var(--text-muted)",
                flexShrink: 0,
              }}
            >
              {span.confidence !== null
                ? `${Math.round(span.confidence * 100)}%`
                : "N/A"}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
