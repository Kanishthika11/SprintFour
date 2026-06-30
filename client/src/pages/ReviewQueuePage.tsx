import { useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDocumentStore } from "../store/documentStore";
import { Button } from "../components/common/Button";
import { PII_CATEGORY_LABELS } from "../lib/types";
import {
  ChevronLeft,
  AlertTriangle,
  Check,
  X,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";

export function ReviewQueuePage() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { currentDocument, spanAction, selectSpan } =
    useDocumentStore();

  useEffect(() => {
    if (documentId && (!currentDocument || currentDocument.documentId !== documentId)) {
      useDocumentStore.getState().refreshDocument(documentId).catch(() => {
        navigate("/");
      });
    } else if (!documentId) {
      navigate("/");
    }
  }, [documentId, currentDocument, navigate]);

  const queueItems = useMemo(() => {
    if (!currentDocument) return [];

    const inconsistencySpanIds = new Set(
      currentDocument.consistencyFlags.flatMap((f) => f.spanIds)
    );

    return currentDocument.spans.filter(
      (span) => span.isBorderline || inconsistencySpanIds.has(span.id)
    );
  }, [currentDocument]);

  const handleTriage = async (
    spanId: string,
    action: "accepted" | "rejected" | "undone"
  ) => {
    await spanAction(spanId, action);
  };

  const handleOpenInViewer = (spanId: string) => {
    selectSpan(spanId);
    navigate(`/review/${documentId}`);
  };

  if (!currentDocument) {
    return (
      <div
        style={{
          height: "calc(100vh - 64px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-secondary)",
          fontSize: 14,
        }}
      >
        Loading Review Queue...
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "32px 24px 64px",
        minHeight: "calc(100vh - 56px)",
        overflowY: "auto",
      }}
    >
      {/* Back button */}
      <Button
        variant="secondary"
        onClick={() => navigate(`/review/${documentId}`)}
        style={{ marginBottom: 24 }}
      >
        <ChevronLeft size={16} />
        Back to Document Viewer
      </Button>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.03em",
          }}
        >
          Review Queue
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
          Triage borderline cases and resolve consistency flags before exporting.
        </p>
      </div>

      {/* Inconsistency warnings */}
      {currentDocument.consistencyFlags.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginBottom: 28,
          }}
        >
          {currentDocument.consistencyFlags.map((flag, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: "var(--color-danger-subtle)",
                border: "1px solid var(--color-danger)",
                borderRadius: "var(--radius-md)",
                padding: "14px 18px",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <AlertTriangle
                size={18}
                style={{ color: "var(--color-danger)", marginTop: 2, flexShrink: 0 }}
              />
              <div>
                <h4
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--color-danger-text)",
                    marginBottom: 4,
                  }}
                >
                  Inconsistency Flagged
                </h4>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--color-danger-text)",
                    lineHeight: 1.5,
                  }}
                >
                  {flag.issue}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Queue items */}
      {queueItems.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            border: "1px dashed var(--border-default)",
            borderRadius: "var(--radius-lg)",
            backgroundColor: "var(--bg-surface)",
          }}
        >
          <ShieldCheck
            size={36}
            style={{ color: "var(--color-success)", marginBottom: 12 }}
          />
          <h3
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 4,
            }}
          >
            Review Queue Clean
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            No borderline cases or inconsistencies left in this document.
          </p>
          <Button
            variant="primary"
            onClick={() => navigate(`/review/${documentId}`)}
            style={{ marginTop: 16 }}
          >
            Return to document
          </Button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {queueItems.map((span) => {
            const label = PII_CATEGORY_LABELS[span.type] || span.type;
            const isInconsistent = currentDocument.consistencyFlags.some((f) =>
              f.spanIds.includes(span.id)
            );

            return (
              <motion.div
                key={span.id}
                layout
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-lg)",
                  padding: "18px 20px",
                  boxShadow: "var(--shadow-sm)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {/* Span meta */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        fontFamily: "var(--font-mono)",
                        color: "var(--accent-primary)",
                        backgroundColor: "var(--accent-primary-subtle)",
                        padding: "2px 6px",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      {label}
                    </span>
                    {span.confidence !== null && (
                      <span
                        style={{
                          fontSize: 11,
                          fontFamily: "var(--font-mono)",
                          color: "var(--text-muted)",
                        }}
                      >
                        Confidence: {Math.round(span.confidence * 100)}%
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    {span.isBorderline && (
                      <span
                        style={{
                          fontSize: 10,
                          backgroundColor: "var(--color-warning-subtle)",
                          color: "var(--color-warning-text)",
                          padding: "2px 6px",
                          borderRadius: "var(--radius-sm)",
                          fontWeight: 500,
                        }}
                      >
                        Borderline Case
                      </span>
                    )}
                    {isInconsistent && (
                      <span
                        style={{
                          fontSize: 10,
                          backgroundColor: "var(--color-danger-subtle)",
                          color: "var(--color-danger-text)",
                          padding: "2px 6px",
                          borderRadius: "var(--radius-sm)",
                          fontWeight: 500,
                        }}
                      >
                        Inconsistent Treatment
                      </span>
                    )}
                  </div>
                </div>

                {/* Text extract */}
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    padding: "8px 12px",
                    backgroundColor: "var(--bg-primary)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                >
                  {span.text}
                </div>

                {/* Reasoning summary */}
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  {span.reasoning.summary}
                </p>

                {/* Actions line */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderTop: "1px solid var(--border-default)",
                    paddingTop: 12,
                    marginTop: 4,
                  }}
                >
                  {/* Status indicator / Undo */}
                  {span.status !== "pending" ? (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span>Resolved as {span.status}</span>
                      <Button
                        variant="secondary"
                        onClick={() => handleTriage(span.id, "undone")}
                        style={{
                          padding: "2px 8px",
                          fontSize: 10,
                        }}
                      >
                        Undo
                      </Button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button
                        variant="primary"
                        onClick={() => handleTriage(span.id, "accepted")}
                        style={{
                          padding: "4px 8px",
                          fontSize: 11,
                        }}
                      >
                        <Check size={11} />
                        Accept Redaction
                      </Button>

                      <Button
                        variant="danger"
                        onClick={() => handleTriage(span.id, "rejected")}
                        style={{
                          padding: "4px 8px",
                          fontSize: 11,
                        }}
                      >
                        <X size={11} />
                        Keep Visible
                      </Button>
                    </div>
                  )}

                  {/* Open in editor */}
                  <button
                    onClick={() => handleOpenInViewer(span.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--accent-primary)",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontFamily: "var(--font-ui)",
                    }}
                  >
                    Investigate in context
                    <ArrowRight size={12} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
