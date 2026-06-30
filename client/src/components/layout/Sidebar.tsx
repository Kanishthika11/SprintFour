import { useNavigate, useLocation } from "react-router-dom";
import { useDocumentStore } from "../../store/documentStore";
import { Button } from "../common/Button";
import {
  Home,
  FileText,
  Settings,
  ChevronDown,
  LayoutGrid,
  Info,
} from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import type { SampleDocumentInfo } from "../../lib/types";

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentDocument,
    sessionDocuments,
    setPickerModalOpen,
    selectSpan,
    loadSampleDocument,
    sidebarOpen,
    setSidebarOpen,
    reset,
  } = useDocumentStore();

  const [samples, setSamples] = useState<SampleDocumentInfo[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    api.getSamples()
      .then((data) => setSamples(data.samples))
      .catch(() => {});
  }, []);

  const isReviewPage = location.pathname.startsWith("/review");
  const currentPath = location.pathname;

  const handleNavHome = () => {
    reset();
    selectSpan(null);
    setSidebarOpen(false);
    navigate("/");
  };

  const handleBrowseSamples = () => {
    selectSpan(null);
    setSidebarOpen(false);
    setPickerModalOpen(true);
  };

  const handleSettingsStub = () => {
    setSidebarOpen(false);
    alert("Settings coming soon!");
  };

  const handleSelectSample = async (sampleId: string) => {
    setDropdownOpen(false);
    setSidebarOpen(false);
    await loadSampleDocument(sampleId);
  };

  // Timezone-aware first analysis timestamp
  const firstAnalysisTime = sessionDocuments[0]
    ? new Date(sessionDocuments[0].analyzedAt).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      })
    : "No analysis yet";

  return (
    <aside
      style={{
        position: "fixed",
        left: 0,
        top: 64,
        width: 300,
        height: "calc(100vh - 64px)",
        bottom: 0,
        backgroundColor: "#1a1f3a", // deep slate
        borderRight: "1px solid #334155", // slate-700
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
        transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        opacity: sidebarOpen ? 1 : 0,
        transition: "transform 0.3s ease-out, opacity 0.3s ease-out",
        overflowY: "auto",
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Content wrapper */}
      <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Navigation Section */}
        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <Button
            variant="nav"
            isActive={currentPath === "/"}
            onClick={handleNavHome}
            style={{ color: currentPath === "/" ? "#14b8a6" : "#9ca3af" }}
          >
            <Home size={16} />
            <span>Home</span>
          </Button>

          <Button
            variant="nav"
            onClick={handleBrowseSamples}
            style={{ color: "#9ca3af" }}
          >
            <LayoutGrid size={16} />
            <span>Browse Samples</span>
          </Button>

          <Button
            variant="nav"
            onClick={handleSettingsStub}
            style={{ color: "#9ca3af" }}
          >
            <Settings size={16} />
            <span>Settings</span>
          </Button>
        </nav>

        {/* Document Selector (only shown on Review screen) */}
        {isReviewPage && currentDocument && (
          <div
            style={{
              paddingTop: 16,
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#9ca3af",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Currently Reviewing
            </span>

            <div style={{ position: "relative" }}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "var(--radius-md)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 500,
                  textAlign: "left",
                  cursor: "pointer",
                  fontFamily: "var(--font-ui)",
                  outline: "none",
                }}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginRight: 8,
                  }}
                >
                  {currentDocument.title}
                </span>
                <ChevronDown size={14} style={{ color: "#9ca3af" }} />
              </button>

              {dropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    marginTop: 6,
                    backgroundColor: "#1a1f3a",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "var(--shadow-lg)",
                    overflow: "hidden",
                    zIndex: 60,
                  }}
                >
                  {samples.map((sample) => (
                    <button
                      key={sample.id}
                      onClick={() => handleSelectSample(sample.id)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        background: "none",
                        border: "none",
                        color:
                          currentDocument.title === sample.title
                            ? "#14b8a6"
                            : "#9ca3af",
                        fontSize: 12,
                        textAlign: "left",
                        cursor: "pointer",
                        fontFamily: "var(--font-ui)",
                        transition: "all 0.15s ease",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                      }}
                    >
                      {sample.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sidebar Footer info */}
        <div
          style={{
            paddingTop: 16,
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: "#9ca3af",
            }}
          >
            <FileText size={12} />
            <span>
              {sessionDocuments.length} document
              {sessionDocuments.length !== 1 ? "s" : ""} analyzed
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 10,
              color: "#6b7280",
            }}
          >
            <Info size={11} />
            <span>First: {firstAnalysisTime}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
