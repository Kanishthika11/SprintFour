import { useState, useEffect } from "react";
import { useDocumentStore } from "../../store/documentStore";
import { api } from "../../lib/api";
import type { SampleDocumentInfo } from "../../lib/types";
import { X, FileText, Loader2 } from "lucide-react";
import { Button } from "../common/Button";
import { motion } from "framer-motion";

export function PickerModal() {
  const {
    pickerModalOpen,
    setPickerModalOpen,
    loadSampleDocument,
    isLoading,
  } = useDocumentStore();

  const [samples, setSamples] = useState<SampleDocumentInfo[]>([]);

  useEffect(() => {
    if (pickerModalOpen) {
      api.getSamples()
        .then((data) => setSamples(data.samples))
        .catch(() => {});
    }
  }, [pickerModalOpen]);

  if (!pickerModalOpen) return null;

  const handleSampleClick = async (sampleId: string) => {
    await loadSampleDocument(sampleId);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)", // dark backdrop
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 20,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          width: "100%",
          maxWidth: 580,
          backgroundColor: "var(--bg-surface)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-panel)",
          border: "1px solid var(--border-default)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--border-default)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileText size={18} style={{ color: "var(--accent-primary)" }} />
            <h2
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              Select a Sample Document
            </h2>
          </div>
          <Button
            variant="icon"
            onClick={() => setPickerModalOpen(false)}
            aria-label="Close"
          >
            <X size={18} />
          </Button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: "24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <p
            style={{
              margin: "0 0 4px",
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.5,
            }}
          >
            Choose from the curated sample files below. Each includes borderline cases, custom rules, and specific risk ratings.
          </p>

          {isLoading ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "40px 0",
                gap: 8,
              }}
            >
              <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent-primary)" }} />
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Loading document content...
              </span>
            </div>
          ) : (
            samples.map((sample) => (
              <button
                key={sample.id}
                onClick={() => handleSampleClick(sample.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  backgroundColor: "var(--bg-subtle)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-lg)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "var(--font-ui)",
                  transition: "all 0.15s ease",
                  width: "100%",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
                  (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.01)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                  (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                }}
              >
                <div style={{ marginRight: 16 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      marginBottom: 4,
                    }}
                  >
                    {sample.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      lineHeight: 1.5,
                    }}
                  >
                    {sample.description}
                  </div>
                </div>
                <div
                  style={{
                    flexShrink: 0,
                    padding: "4px 10px",
                    backgroundColor: "var(--accent-primary-subtle)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--accent-primary)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {sample.spanCount} items
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--border-default)",
            display: "flex",
            justifyContent: "flex-end",
            backgroundColor: "var(--bg-subtle)",
          }}
        >
          <Button variant="secondary" onClick={() => setPickerModalOpen(false)}>
            Cancel
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
