import { PIISpan } from "../types.js";

/**
 * ExplanationGenerator — passthrough in Phase 1 (mock data already has explanations).
 * Phase 2: this becomes the seam where Presidio raw output gets enriched with
 * LLM-generated reasoning text.
 */
export class ExplanationGenerator {
  /**
   * In Phase 1, spans already have complete reasoning objects from the mock JSON.
   * This method just validates and returns them unchanged.
   * Phase 2 will populate reasoning fields from raw Presidio + LLM output.
   */
  enrich(spans: Omit<PIISpan, "status" | "history">[]): Omit<PIISpan, "status" | "history">[] {
    return spans.map((span) => {
      // Ensure all reasoning fields are populated — never send a bare label
      if (!span.reasoning.summary || span.reasoning.summary.length < 10) {
        span.reasoning.summary = `This text was detected as ${span.type} with ${span.confidence !== null ? Math.round(span.confidence * 100) + "% confidence" : "unknown confidence"}.`;
      }
      if (!span.reasoning.possibleRisk) {
        span.reasoning.possibleRisk = "The specific risk of exposing this information has not been assessed.";
      }
      if (!span.reasoning.signals || span.reasoning.signals.length === 0) {
        span.reasoning.signals = ["Pattern match"];
      }
      return span;
    });
  }
}
