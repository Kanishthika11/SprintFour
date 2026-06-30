import { useState } from "react";
import { useDocumentStore } from "../../store/documentStore";
import type { PIISpan, PIIDocumentResponse } from "../../lib/types";
import { Check, X, Undo, Edit2, CheckCircle2 } from "lucide-react";
import { Button } from "../common/Button";

interface SpanActionsProps {
  span: PIISpan;
  document: PIIDocumentResponse;
  groupCount: number;
}

export function SpanActions({ span, groupCount }: SpanActionsProps) {
  const { spanAction } = useDocumentStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(span.text);

  const handleAction = async (action: "accepted" | "rejected" | "undone" | "applied_to_all") => {
    await spanAction(span.id, action);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editText.trim()) return;
    await spanAction(span.id, "modified", editText);
    setIsEditing(false);
  };

  const isRedacted = span.decision === "redacted";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {isEditing ? (
        <form onSubmit={handleEditSubmit} style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            style={{
              flex: 1,
              padding: "6px 10px",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-sm)",
              fontSize: 12,
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono)",
              outline: "none",
            }}
          />
          <Button type="submit" variant="primary">
            Save
          </Button>
          <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </form>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {/* If the span is pending/original decision, show primary options */}
          {span.status === "pending" ? (
            <>
              <Button
                variant="primary"
                onClick={() => handleAction(isRedacted ? "accepted" : "rejected")}
                style={{ fontSize: 12, padding: "6px 12px" }}
              >
                <Check size={13} />
                Accept {isRedacted ? "Redaction" : "Visibility"}
              </Button>

              <Button
                variant="danger"
                onClick={() => handleAction(isRedacted ? "rejected" : "accepted")}
                style={{ fontSize: 12, padding: "6px 12px" }}
              >
                <X size={13} />
                Override
              </Button>

              <Button
                variant="secondary"
                onClick={() => {
                  setEditText(span.text);
                  setIsEditing(true);
                }}
                style={{ fontSize: 12, padding: "6px 12px" }}
              >
                <Edit2 size={13} />
                Modify
              </Button>
            </>
          ) : (
            // Resolved states: Show Undo button
            <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <CheckCircle2 size={14} style={{ color: "var(--color-success)" }} />
                Decision reviewed ({span.status})
              </div>
              <Button
                variant="secondary"
                onClick={() => handleAction("undone")}
                style={{
                  padding: "4px 10px",
                  fontSize: 11,
                }}
              >
                <Undo size={11} />
                Undo
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Apply to all N occurrences */}
      {groupCount > 1 && span.status !== "pending" && (
        <Button
          variant="primary"
          onClick={() => handleAction("applied_to_all")}
          style={{
            width: "100%",
            fontSize: 12,
            padding: "6px 12px",
            marginTop: 4,
          }}
        >
          Apply to all {groupCount} occurrences
        </Button>
      )}
    </div>
  );
}
