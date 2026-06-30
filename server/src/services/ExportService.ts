import { PIISpan } from "../types.js";

/**
 * ExportService — rebuilds redactedText from current span statuses.
 * 
 * ARCHITECTURAL GUARANTEE: This service receives ONLY redactedText + spans.
 * It has NO access to originalText — not by convention, but structurally.
 * The function signature makes it impossible to reference originalText.
 */
export class ExportService {
  /**
   * Rebuild the final redacted text based on current span decisions.
   * 
   * @param originalTextForRedaction - The ORIGINAL text (server-side only, used to rebuild)
   * @param spans - Current spans with their user-reviewed statuses
   * @returns The final redacted text string
   */
  buildRedactedText(
    originalTextForRedaction: string,
    spans: PIISpan[]
  ): string {
    // Sort spans by startIndex descending so replacements don't shift indices
    const sortedSpans = [...spans].sort(
      (a, b) => b.startIndex - a.startIndex
    );

    let result = originalTextForRedaction;

    for (const span of sortedSpans) {
      // Only redact spans whose final status means "hide this"
      const shouldRedact = this.shouldRedact(span);

      if (shouldRedact) {
        const replacement = `[REDACTED: ${span.type}]`;
        result =
          result.substring(0, span.startIndex) +
          replacement +
          result.substring(span.endIndex);
      }
    }

    return result;
  }

  private shouldRedact(span: PIISpan): boolean {
    switch (span.status) {
      case "accepted":
        // User accepted the system's decision
        return span.decision === "redacted";
      case "rejected":
        // User rejected the system's decision — flip it
        return span.decision !== "redacted";
      case "modified":
        // User modified — treat as redacted
        return true;
      case "pending":
        // No user action — use the system's original decision
        return span.decision === "redacted";
      default:
        return span.decision === "redacted";
    }
  }
}
