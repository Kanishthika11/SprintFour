import { useState, useRef, useEffect } from "react";
import { useDocumentStore } from "../../store/documentStore";
import { api } from "../../lib/api";
import { Loader2, Sparkles, ChevronDown, ChevronUp, Send, BarChart2 } from "lucide-react";
import { ConfidenceChart } from "./ConfidenceChart";
import type { AskWhyResponse } from "../../lib/types";

interface AskWhyBoxProps {
  span: any;
  documentId: string;
}

function TypewriterText({ text }: { text: string }) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let index = 0;
    setDisplayedText("");
    const interval = setInterval(() => {
      setDisplayedText((prev) => prev + text.charAt(index));
      index++;
      if (index >= text.length) {
        clearInterval(interval);
      }
    }, 15);
    return () => clearInterval(interval);
  }, [text]);

  return <span>{displayedText}</span>;
}

interface ConversationItem {
  q: string;
  a: string;
  date: Date;
  isNew: boolean;
  source: "live" | "mock";
  tokensUsed?: { input: number; output: number };
  groundingUsed: string[];
}

export function AskWhyBox({ span, documentId }: AskWhyBoxProps) {
  const { worriedMode, currentDocument, recordGeminiCall } = useDocumentStore();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [templatesExpanded, setTemplatesExpanded] = useState(false);
  const [showConfidenceChart, setShowConfidenceChart] = useState(false);
  const [conversation, setConversation] = useState<ConversationItem[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Clear conversation when span changes
  useEffect(() => {
    setConversation([]);
    setQuestion("");
    setShowConfidenceChart(false);
  }, [span.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || loading) return;

    const currentQuestion = question;
    setQuestion("");
    setLoading(true);

    try {
      const res = (await api.ask({
        documentId,
        spanId: span.id,
        question: currentQuestion,
        worriedMode,
      })) as AskWhyResponse;

      // Track Gemini stats in store
      const inputToks = res.tokensUsed?.input || 0;
      const outputToks = res.tokensUsed?.output || 0;
      recordGeminiCall(inputToks, outputToks, true);

      setConversation((prev) =>
        prev
          .map((item) => ({ ...item, isNew: false }))
          .concat({
            q: currentQuestion,
            a: res.answer,
            date: new Date(res.generatedAt),
            isNew: true,
            source: res.source,
            tokensUsed: res.tokensUsed,
            groundingUsed: res.groundingUsed || [],
          })
      );
    } catch (err) {
      console.error(err);
      recordGeminiCall(0, 0, false);
      
      // Fallback to local template-based reasoning explanation
      const typeLabel = span.type.replace(/_/g, " ").toLowerCase();
      const pct = span.confidence !== null ? ` (${Math.round(span.confidence * 100)}% confidence)` : "";
      
      const fallbackAnswer = `I couldn't reach the live AI service just now, but here is what we detected: ${span.reasoning.summary} This is flagged as a ${typeLabel}${pct}. The possible risk: ${span.reasoning.possibleRisk}`;
      
      setConversation((prev) =>
        prev
          .map((item) => ({ ...item, isNew: false }))
          .concat({
            q: currentQuestion,
            a: fallbackAnswer,
            date: new Date(),
            isNew: true,
            source: "mock",
            groundingUsed: ["span reasoning", "span risk"],
          })
      );
    } finally {
      setLoading(false);
    }
  };

  const suggestedQuestions = [
    "How sure are you about this?",
    "Why does this category matter?",
    "Why wasn't this threshold reached?",
  ];

  const handleSuggestedClick = (q: string) => {
    setQuestion(q);
    inputRef.current?.focus();
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: "20px",
        backgroundColor: "#ffffff", // white card theme
        border: "1px solid #e2e8f0",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
        position: "relative",
        overflow: "hidden",
        marginTop: 24,
      }}
    >
      {/* Top colorful linear-gradient bar */}
      <div
        style={{
          height: 4,
          background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899, #f59e0b)",
          margin: "-20px -20px 14px -20px",
        }}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 2,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Sparkles
            size={16}
            style={{ color: "#6366f1" }} // Indigo sparkles
          />
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#1e293b", // Dark Slate title
            }}
          >
            Ask Conseal AI
          </span>
        </div>
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            textTransform: "uppercase",
            color: "#2563eb", // blue-600
            backgroundColor: "#eff6ff", // blue-50
            padding: "2px 8px",
            borderRadius: "var(--radius-sm)",
            letterSpacing: "0.05em",
          }}
        >
          Model Grounded
        </span>
      </div>

      {/* Confidence Chart Toggle */}
      {currentDocument?.confidenceAnalysis && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            onClick={() => setShowConfidenceChart(!showConfidenceChart)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              color: "#0d9488", // teal-600
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              padding: 0,
              outline: "none",
              alignSelf: "flex-start",
            }}
          >
            <BarChart2 size={13} />
            {showConfidenceChart ? "Hide Confidence Analysis" : "Show Confidence Analysis"}
          </button>

          {showConfidenceChart && (
            <ConfidenceChart data={currentDocument.confidenceAnalysis} />
          )}
        </div>
      )}

      <span style={{ fontSize: 11, color: "#64748b", margin: 0 }}>
        Analyze this detection:
      </span>

      {/* Messages */}
      {conversation.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            maxHeight: 260,
            overflowY: "auto",
            padding: "4px 0",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          {conversation.map((c, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                fontSize: 12,
              }}
            >
              {/* Question */}
              <div
                style={{
                  alignSelf: "flex-end",
                  backgroundColor: "#eff6ff",
                  color: "#1e293b",
                  padding: "8px 12px",
                  borderRadius: "12px 12px 0 12px",
                  maxWidth: "85%",
                  border: "1px solid #bfdbfe",
                  fontSize: 13,
                }}
              >
                {c.q}
              </div>
              {/* Answer */}
              <div
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: "#f8fafc",
                  color: "#1e293b",
                  padding: "12px 14px",
                  borderRadius: "12px 12px 12px 0",
                  maxWidth: "85%",
                  border: "1px solid #e2e8f0",
                  boxShadow: "var(--shadow-sm)",
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Sparkles size={11} style={{ color: "#6366f1" }} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#64748b" }}>
                      Conseal Explanation
                    </span>
                  </div>
                  {c.tokensUsed && (
                    <span style={{ fontSize: "9px", color: "#94a3b8" }}>
                      Tokens: {c.tokensUsed.input} in / {c.tokensUsed.output} out
                    </span>
                  )}
                </div>

                <span style={{ fontSize: 13.5, lineHeight: "1.65", color: "#1e293b" }}>
                  {c.isNew ? <TypewriterText text={c.a} /> : c.a}
                </span>

                {/* Grounding tags list */}
                {c.groundingUsed.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 4,
                      marginTop: 10,
                      paddingTop: 8,
                      borderTop: "1px solid #e2e8f0",
                    }}
                  >
                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "#64748b", alignSelf: "center", marginRight: 2 }}>
                      Grounded:
                    </span>
                    {c.groundingUsed.map((g, gi) => (
                      <span
                        key={gi}
                        style={{
                          fontSize: "9px",
                          backgroundColor: "#f1f5f9",
                          color: "#475569",
                          padding: "1px 6px",
                          borderRadius: "3px",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    fontSize: 10,
                    color: c.source === "live" ? "#0d9488" : "#f59e0b", // teal vs orange
                    fontStyle: "italic",
                    marginTop: 6,
                    textAlign: "right",
                  }}
                >
                  {c.source === "live" ? "✨ Generated live" : "Based on detection data"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Suggested Questions (Collapsible) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button
          type="button"
          onClick={() => setTemplatesExpanded(!templatesExpanded)}
          style={{
            background: "none",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            padding: 0,
            cursor: "pointer",
            outline: "none",
          }}
        >
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
            Quick questions:
          </span>
          {templatesExpanded ? (
            <ChevronUp size={14} style={{ color: "#64748b" }} />
          ) : (
            <ChevronDown size={14} style={{ color: "#64748b" }} />
          )}
        </button>

        {templatesExpanded && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSuggestedClick(q)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "4px", // Sharp corners
                  padding: "8px 12px",
                  fontSize: 13,
                  color: "#475569", // dark gray
                  cursor: "pointer",
                  fontFamily: "var(--font-ui)",
                  textAlign: "left",
                  outline: "none",
                }}
              >
                <span>{q}</span>
                <span style={{ color: "#6366f1", fontWeight: "bold" }}>→</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          border: isFocused ? "1px solid #6366f1" : "1px solid #cbd5e1", // purple focus outline
          borderRadius: "4px", // Sharp corners
          backgroundColor: "#ffffff",
          overflow: "hidden",
          transition: "all 0.15s ease",
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Ask why this was redacted/kept..."
          style={{
            flex: 1,
            border: "none",
            background: "none",
            padding: "10px 14px",
            fontSize: 14,
            color: "#1e293b",
            outline: "none",
            fontFamily: "var(--font-ui)",
          }}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!question.trim() || loading}
          style={{
            border: "none",
            padding: "0 14px",
            backgroundColor: "#818cf8", // purple/blue background
            color: "#ffffff",
            cursor: !question.trim() || loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            outline: "none",
            borderRadius: "0 4px 4px 0", // Sharp corners aligned right
          }}
          aria-label="Send question"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin text-white" />
          ) : (
            <Send size={14} style={{ color: "#ffffff" }} />
          )}
        </button>
      </form>
    </div>
  );
}

