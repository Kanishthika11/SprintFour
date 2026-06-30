import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDocumentStore } from "../store/documentStore";
import { PII_CATEGORY_LABELS, type PIICategory } from "../lib/types";
import {
  ChevronLeft,
  Copy,
  Download,
  Check,
  AlertTriangle,
  FileText,
  FileCheck,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { Button } from "../components/common/Button";


export function ExportPage() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { currentDocument, initialRedactedText } =
    useDocumentStore();

  const [activeTab, setActiveTab] = useState<"compare" | "text" | "summary">(
    "compare"
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (documentId && (!currentDocument || currentDocument.documentId !== documentId)) {
      useDocumentStore.getState().refreshDocument(documentId).catch(() => {
        navigate("/");
      });
    } else if (!documentId) {
      navigate("/");
    }
  }, [documentId, currentDocument, navigate]);

  const unresolvedBorderlineCount = useMemo(() => {
    if (!currentDocument) return 0;
    return currentDocument.spans.filter(
      (s) => s.isBorderline && s.status === "pending"
    ).length;
  }, [currentDocument]);

  const stats = useMemo(() => {
    if (!currentDocument) return { categories: {}, reviewed: 0 };

    const categories: Record<string, number> = {};
    let reviewed = 0;

    for (const span of currentDocument.spans) {
      if (span.status !== "pending") {
        reviewed++;
      }
      categories[span.type] = (categories[span.type] || 0) + 1;
    }

    return { categories, reviewed };
  }, [currentDocument]);

  const handleCopy = async () => {
    if (!currentDocument) return;
    try {
      await navigator.clipboard.writeText(currentDocument.redactedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleDownload = () => {
    if (!currentDocument) return;
    const blob = new Blob([currentDocument.redactedText], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `${currentDocument.title}_redacted.txt`;
    link.click();
    URL.revokeObjectURL(url);
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
        Loading Export details...
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "32px 24px 64px",
        minHeight: "calc(100vh - 56px)",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      {/* Back button */}
      <Button
        variant="secondary"
        onClick={() => navigate(`/review/${documentId}`)}
      >
        <ChevronLeft size={16} />
        Back to Document Viewer
      </Button>

      {/* Header / Actions bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.03em",
            }}
          >
            Compare & Export
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              marginTop: 4,
            }}
          >
            Review the final redacted output before copying or downloading it
            for your AI prompt.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Button
            variant="secondary"
            onClick={handleCopy}
          >
            {copied ? (
              <Check size={14} style={{ color: "var(--color-success)" }} />
            ) : (
              <Copy size={14} />
            )}
            {copied ? "Copied!" : "Copy Redacted Text"}
          </Button>

          <Button
            variant="primary"
            onClick={handleDownload}
          >
            <Download size={14} />
            Download .txt
          </Button>
        </div>
      </div>

      {/* Safety notice banner */}
      <div
        style={{
          backgroundColor: "var(--color-success-subtle)",
          border: "1px solid var(--color-success)",
          borderRadius: "var(--radius-md)",
          padding: "14px 18px",
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <ShieldCheck
          size={18}
          style={{ color: "var(--color-success)", marginTop: 2, flexShrink: 0 }}
        />
        <div>
          <h4
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--color-success-text)",
              marginBottom: 4,
            }}
          >
            Technical Guarantee: Local Redaction Proof Only
          </h4>
          <p
            style={{
              fontSize: 12,
              color: "var(--color-success-text)",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            The original text stays server-side in-memory and is never sent to
            the frontend after initial processing. The diff below only compares
            the system's initial auto-redactions with your final reviewed
            redactions.
          </p>
        </div>
      </div>

      {/* Borderline warnings */}
      {unresolvedBorderlineCount > 0 && (
        <div
          style={{
            backgroundColor: "var(--color-warning-subtle)",
            border: "1px solid var(--color-warning)",
            borderRadius: "var(--radius-md)",
            padding: "14px 18px",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <AlertTriangle
            size={18}
            style={{ color: "var(--color-warning)", marginTop: 2, flexShrink: 0 }}
          />
          <div>
            <h4
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--color-warning-text)",
                marginBottom: 4,
              }}
            >
              Unresolved Borderline Items
            </h4>
            <p
              style={{
                fontSize: 12,
                color: "var(--color-warning-text)",
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              There are {unresolvedBorderlineCount} borderline spans in this
              document that you haven't reviewed yet. We recommend triaging all
              borderline cases in the{" "}
              <span
                onClick={() => navigate(`/queue/${documentId}`)}
                style={{
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Review Queue
              </span>{" "}
              before exporting.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        {(
          [
            { id: "compare", label: "Side-by-Side Compare" },
            { id: "text", label: "Final Redacted Text" },
            { id: "summary", label: "Review Summary" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "12px 24px",
              background: "none",
              border: "none",
              borderBottom:
                activeTab === tab.id
                  ? "2px solid var(--accent-primary)"
                  : "2px solid transparent",
              color:
                activeTab === tab.id
                  ? "var(--accent-primary)"
                  : "var(--text-secondary)",
              fontSize: 13,
              fontWeight: activeTab === tab.id ? 600 : 500,
              cursor: "pointer",
              fontFamily: "var(--font-ui)",
              transition: "all 0.15s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1 }}>
        {activeTab === "compare" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 20,
            }}
          >
            {/* Left: Initially Redacted */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <FileText size={14} />
                System's Initial Redactions
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: "var(--text-secondary)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  padding: "16px 20px",
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-lg)",
                  boxShadow: "var(--shadow-sm)",
                  height: 360,
                  overflowY: "auto",
                  opacity: 0.85,
                }}
              >
                {initialRedactedText || currentDocument.redactedText}
              </div>
            </div>

            {/* Right: Your Reviewed Redactions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--accent-primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <FileCheck size={14} />
                Your Reviewed Redactions
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: "var(--text-primary)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  padding: "16px 20px",
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--accent-primary)",
                  borderRadius: "var(--radius-lg)",
                  boxShadow: "var(--shadow-md)",
                  height: 360,
                  overflowY: "auto",
                }}
              >
                {currentDocument.redactedText}
              </div>
            </div>
          </div>
        )}

        {activeTab === "text" && (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              lineHeight: 1.7,
              color: "var(--text-primary)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              padding: "24px 28px",
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-sm)",
              maxHeight: 500,
              overflowY: "auto",
            }}
          >
            {currentDocument.redactedText}
          </div>
        )}

        {activeTab === "summary" && (
          <div
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-lg)",
              padding: 24,
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            {/* Stats row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 16,
              }}
            >
              <SummaryCard
                title="Total Flags Found"
                value={currentDocument.spans.length}
                icon={<Activity size={18} />}
              />
              <SummaryCard
                title="Reviewed Items"
                value={`${stats.reviewed} / ${currentDocument.spans.length}`}
                icon={<FileCheck size={18} />}
              />
              <SummaryCard
                title="Risk Score"
                value={`${currentDocument.meta.riskScore} / 100`}
                icon={<ShieldCheck size={18} />}
              />
            </div>

            {/* Breakdown by Category */}
            <div>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: 12,
                }}
              >
                PII Breakdown by Category
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: 12,
                }}
              >
                {Object.entries(stats.categories).map(([cat, count]) => (
                  <div
                    key={cat}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      backgroundColor: "var(--bg-primary)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-default)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {PII_CATEGORY_LABELS[cat as PIICategory] || cat}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "16px 20px",
        backgroundColor: "var(--bg-primary)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
          {title}
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--text-primary)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {value}
        </div>
      </div>
      <div style={{ color: "var(--accent-primary)" }}>{icon}</div>
    </div>
  );
}
