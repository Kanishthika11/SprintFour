import { useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDocumentStore } from "../store/documentStore";
import { DocumentViewer } from "../components/review/DocumentViewer";
import { AuditLogSidebar } from "../components/review/AuditLogSidebar";
import { TrustSummaryBar } from "../components/review/TrustSummaryBar";
import { ExplanationPanel } from "../components/explanation/ExplanationPanel";
import { AnimatePresence } from "framer-motion";

export function ReviewPage() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const {
    currentDocument,
    selectedSpanId,
    selectSpan,
    threshold,
    sidebarWidth,
    auditLogCollapsed,
    auditLogWidth,
  } = useDocumentStore();

  useEffect(() => {
    if (documentId && (!currentDocument || currentDocument.documentId !== documentId)) {
      useDocumentStore.getState().refreshDocument(documentId).catch(() => {
        navigate("/");
      });
    } else if (!documentId) {
      navigate("/");
    }
  }, [documentId, currentDocument, navigate]);

  const selectedSpan = useMemo(() => {
    if (!currentDocument || !selectedSpanId) return null;
    return currentDocument.spans.find((s) => s.id === selectedSpanId) || null;
  }, [currentDocument, selectedSpanId]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!currentDocument) return;

      if (e.key === "Escape") {
        selectSpan(null);
        return;
      }

      // Arrow keys to navigate spans
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const spans = currentDocument.spans;
        if (spans.length === 0) return;

        const currentIndex = selectedSpanId
          ? spans.findIndex((s) => s.id === selectedSpanId)
          : -1;

        const nextIndex =
          e.key === "ArrowDown"
            ? Math.min(currentIndex + 1, spans.length - 1)
            : Math.max(currentIndex - 1, 0);

        selectSpan(spans[nextIndex].id);
      }
    },
    [currentDocument, selectedSpanId, selectSpan]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

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
        Loading document...
      </div>
    );
  }

  return (
    <div
      style={{
        height: "calc(100vh - 64px)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Trust Summary Bar */}
      <TrustSummaryBar document={currentDocument} />

      {/* Main content area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Left Column: Document Viewer (Independent Scroll container) */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px 32px",
            height: "100%",
            backgroundColor: "var(--bg-primary)",
            minWidth: 400,
          }}
        >
          <DocumentViewer
            document={currentDocument}
            threshold={threshold}
          />
        </div>

        {/* Right Column: Audit Log or Explanation Panel (Independent Scroll container) */}
        {!selectedSpan ? (
          <AuditLogSidebar document={currentDocument} />
        ) : (
          <AnimatePresence mode="wait">
            <ExplanationPanel
              span={selectedSpan}
              document={currentDocument}
              onClose={() => selectSpan(null)}
            />
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
