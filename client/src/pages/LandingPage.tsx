import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDocumentStore } from "../store/documentStore";
import { api } from "../lib/api";
import type { SampleDocumentInfo } from "../lib/types";
import {
  Upload,
  FileText,
  ClipboardPaste,
  Loader2,
  AlertCircle,
  Eye,
  Lock,
  MessageCircle,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../components/common/Button";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 22,
      stiffness: 160,
    },
  },
};

export function LandingPage() {
  const navigate = useNavigate();
  const {
    loadSampleDocument,
    loadPastedText,
    loadFile,
    isLoading,
    error,
    currentDocument,
    clearError,
  } = useDocumentStore();

  const [samples, setSamples] = useState<SampleDocumentInfo[]>([]);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getSamples()
      .then((data) => setSamples(data.samples))
      .catch(() => {});

    // Dynamically inject Google Font
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const handleSampleClick = async (sampleId: string) => {
    clearError();
    await loadSampleDocument(sampleId);
    const doc = useDocumentStore.getState().currentDocument;
    if (doc) navigate(`/review/${doc.documentId}`);
  };

  const handlePasteSubmit = async () => {
    if (!pastedText.trim()) return;
    clearError();
    setShowPasteModal(false);
    await loadPastedText(pastedText);
    const doc = useDocumentStore.getState().currentDocument;
    if (doc) navigate(`/review/${doc.documentId}`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    clearError();
    setShowUploadModal(false);
    await loadFile(file);
    const doc = useDocumentStore.getState().currentDocument;
    if (doc) navigate(`/review/${doc.documentId}`);
  };

  const valueProps = [
    {
      icon: <Eye size={32} style={{ color: "#0d9488" }} />,
      title: "See Every Decision",
      desc: "Hover or click any span — redacted or kept — to understand exactly why.",
    },
    {
      icon: <MessageCircle size={32} style={{ color: "#0d9488" }} />,
      title: 'Ask "Why?"',
      desc: "Ask free-form questions about any detection and get grounded answers.",
    },
    {
      icon: <Lock size={32} style={{ color: "#0d9488" }} />,
      title: "Prove It's Gone",
      desc: "Original text never leaves the backend. Export only the redacted version.",
    },
  ];

  return (
    <div
      style={{
        backgroundColor: "var(--bg-primary)",
        color: "var(--text-primary)",
        minHeight: "calc(100vh - 64px)",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "64px 24px 80px",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* 1. Hero Section */}
      <div
        style={{
          width: "100%",
          maxWidth: 1200,
          textAlign: "center",
          marginBottom: 64,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <h1
          style={{
            fontSize: 52,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            margin: 0,
            background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #0f766e 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            display: "inline-block",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          Conseal Trust Viewer
        </h1>
        <p
          style={{
            fontSize: 20,
            fontWeight: 500,
            color: "var(--text-secondary)",
            margin: 0,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          Your documents. Your redactions. Your trust.
        </p>
        <p
          style={{
            fontSize: 16,
            color: "var(--text-secondary)",
            lineHeight: 1.8,
            maxWidth: 600,
            margin: "8px 0 0",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          Every redaction is interrogatable. Every kept-visible span has a reason. Know exactly why your data was protected — and prove it.
        </p>
      </div>

      {/* 2. Value Props Cards Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          width: "100%",
          maxWidth: 1200,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 24,
          marginBottom: 80,
        }}
      >
        {valueProps.map((prop, idx) => (
          <motion.div
            key={idx}
            variants={cardVariants}
            whileHover={{
              y: -8,
              boxShadow: "0 20px 40px rgba(13, 148, 136, 0.12)",
              borderColor: "#0d9488",
              transition: { duration: 0.2 },
            }}
            style={{
              background: "linear-gradient(135deg, var(--bg-surface) 0%, rgba(13, 148, 136, 0.04) 50%, rgba(20, 184, 166, 0.08) 100%)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-xl)",
              padding: "32px",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              alignItems: "flex-start",
              cursor: "default",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            <div>{prop.icon}</div>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {prop.title}
            </h3>
            <p
              style={{
                fontSize: 14,
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                margin: 0,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {prop.desc}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* 3. Call to Action (CTA) Section */}
      <div
        style={{
          width: "100%",
          maxWidth: 1200,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
        }}
      >
        <h2
          style={{
            fontSize: 32,
            fontWeight: 800,
            margin: 0,
            textAlign: "center",
            background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            display: "inline-block",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          Get Started
        </h2>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{
            width: "100%",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 24,
          }}
        >
          {/* Option 1: View Samples */}
          <motion.div
            variants={cardVariants}
            whileHover={{
              y: -8,
              boxShadow: "0 20px 40px rgba(13, 148, 136, 0.12)",
              borderColor: "#0d9488",
              transition: { duration: 0.2 },
            }}
            style={{
              background: "linear-gradient(135deg, var(--bg-surface) 0%, rgba(13, 148, 136, 0.04) 50%, rgba(20, 184, 166, 0.08) 100%)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-xl)",
              padding: "32px",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 20,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FileText size={20} style={{ color: "#0d9488" }} />
                <h4 style={{ fontSize: 16, fontWeight: 700, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Review Samples</h4>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Explore pre-loaded resume, medical letter, and legal document with full redaction details.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => samples[0] && handleSampleClick(samples[0].id)}
              disabled={isLoading}
            >
              View Samples
            </Button>
          </motion.div>

          {/* Option 2: Paste Text */}
          <motion.div
            variants={cardVariants}
            whileHover={{
              y: -8,
              boxShadow: "0 20px 40px rgba(13, 148, 136, 0.12)",
              borderColor: "#0d9488",
              transition: { duration: 0.2 },
            }}
            style={{
              background: "linear-gradient(135deg, var(--bg-surface) 0%, rgba(13, 148, 136, 0.04) 50%, rgba(20, 184, 166, 0.08) 100%)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-xl)",
              padding: "32px",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 20,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ClipboardPaste size={20} style={{ color: "#0d9488" }} />
                <h4 style={{ fontSize: 16, fontWeight: 700, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Paste Text</h4>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Copy-paste a document directly and Conseal will analyze it for personal data (PII) leaks.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => setShowPasteModal(true)}
            >
              Paste Text
            </Button>
          </motion.div>

          {/* Option 3: Upload File */}
          <motion.div
            variants={cardVariants}
            whileHover={{
              y: -8,
              boxShadow: "0 20px 40px rgba(13, 148, 136, 0.12)",
              borderColor: "#0d9488",
              transition: { duration: 0.2 },
            }}
            style={{
              background: "linear-gradient(135deg, var(--bg-surface) 0%, rgba(13, 148, 136, 0.04) 50%, rgba(20, 184, 166, 0.08) 100%)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-xl)",
              padding: "32px",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 20,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Upload size={20} style={{ color: "#0d9488" }} />
                <h4 style={{ fontSize: 16, fontWeight: 700, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Upload File</h4>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Upload `.txt` files directly from your computer to run local privacy assessments.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => setShowUploadModal(true)}
            >
              Upload File
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Paste Modal */}
      <AnimatePresence>
        {showPasteModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(15, 23, 42, 0.6)",
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
                maxWidth: 600,
                backgroundColor: "var(--bg-surface)",
                borderRadius: "var(--radius-xl)",
                boxShadow: "var(--shadow-panel)",
                border: "1px solid var(--border-default)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-default)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Paste Document Text</h3>
                <Button variant="icon" onClick={() => setShowPasteModal(false)}><X size={18} /></Button>
              </div>
              <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste your document content here..."
                  style={{
                    width: "100%",
                    height: 200,
                    padding: 12,
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-primary)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    resize: "none",
                    outline: "none",
                  }}
                />
              </div>
              <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-default)", backgroundColor: "var(--bg-subtle)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <Button variant="secondary" onClick={() => setShowPasteModal(false)}>Cancel</Button>
                <Button variant="primary" onClick={handlePasteSubmit} disabled={!pastedText.trim()}>Analyze</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(15, 23, 42, 0.6)",
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
                maxWidth: 500,
                backgroundColor: "var(--bg-surface)",
                borderRadius: "var(--radius-xl)",
                boxShadow: "var(--shadow-panel)",
                border: "1px solid var(--border-default)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-default)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Upload a Document</h3>
                <Button variant="icon" onClick={() => setShowUploadModal(false)}><X size={18} /></Button>
              </div>
              <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: "2px dashed var(--border-default)",
                    borderRadius: "var(--radius-lg)",
                    padding: "40px 20px",
                    textAlign: "center",
                    cursor: "pointer",
                  }}
                >
                  <Upload size={24} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    Click to select .txt file
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    Max file size 200KB
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,text/plain"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                />
              </div>
              <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-default)", backgroundColor: "var(--bg-subtle)", display: "flex", justifyContent: "flex-end" }}>
                <Button variant="secondary" onClick={() => setShowUploadModal(false)}>Cancel</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      {isLoading && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 110,
          }}
        >
          <div
            style={{
              backgroundColor: "var(--bg-surface)",
              padding: "32px 40px",
              borderRadius: "var(--radius-xl)",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              boxShadow: "var(--shadow-panel)",
            }}
          >
            <Loader2 size={32} className="animate-spin text-teal-600" />
            <span style={{ fontSize: 15, fontWeight: 600 }}>Analyzing document...</span>
          </div>
        </div>
      )}

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              marginTop: 24,
              maxWidth: 720,
              width: "100%",
              padding: "12px 16px",
              backgroundColor: "var(--color-danger-subtle)",
              border: "1px solid var(--color-danger)",
              borderRadius: "var(--radius-md)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <AlertCircle size={16} style={{ color: "var(--color-danger)", flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "var(--color-danger-text)", flex: 1 }}>{error}</span>
            <Button variant="secondary" onClick={clearError} style={{ padding: "4px 10px", fontSize: 11 }}>
              Dismiss
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
