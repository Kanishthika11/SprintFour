import type { ReactNode } from "react";
import { useDocumentStore } from "../../store/documentStore";
import { Sidebar } from "./Sidebar";
import { PickerModal } from "./PickerModal";
import { Moon, Sun, Menu, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const {
    darkMode,
    toggleDarkMode,
    sidebarOpen,
    setSidebarOpen,
    reset,
  } = useDocumentStore();

  const handleLogoClick = () => {
    reset();
    setSidebarOpen(false);
    navigate("/");
  };

  const handleMainClick = () => {
    if (sidebarOpen) {
      setSidebarOpen(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "var(--bg-primary)",
        overflow: "hidden",
      }}
    >
      {/* Header (fixed, 64px tall) */}
      <header
        style={{
          height: 64,
          borderBottom: "1px solid #334155", // slate-700
          backgroundColor: "#0f172a", // slate-950
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          flexShrink: 0,
          zIndex: 50,
          color: "#ffffff",
        }}
      >
        {/* Left Section: Menu Toggle + Logo + Brand Text */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#64748b", // slate-500
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 4,
              marginLeft: -4,
              outline: "none",
            }}
            aria-label="Toggle Navigation Sidebar"
          >
            <Menu size={24} style={{ color: "#64748b" }} />
          </button>

          <div
            onClick={handleLogoClick}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
            }}
          >
            <Shield size={22} style={{ color: "#14b8a6" }} />
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontWeight: 700,
                fontSize: 18,
                color: "#ffffff",
                letterSpacing: "-0.02em",
              }}
            >
              Conseal Trust Console
            </span>
          </div>
        </div>

        {/* Right Section: Theme Toggle Button */}
        <button
          onClick={toggleDarkMode}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            outline: "none",
          }}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? (
            <Moon size={24} style={{ color: "#fbbf24" }} /> // text-amber-400
          ) : (
            <Sun size={24} style={{ color: "#fbbf24" }} /> // text-amber-400
          )}
        </button>
      </header>

      {/* Outer Flex Container for Sidebar + Main Area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Floating collapsible left Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <main
          onClick={handleMainClick}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            transition: "margin-left 0.3s ease-out",
            marginLeft: sidebarOpen ? 300 : 0,
          }}
        >
          {children}
        </main>
      </div>

      {/* Global Document Picker Modal */}
      <PickerModal />
    </div>
  );
}
