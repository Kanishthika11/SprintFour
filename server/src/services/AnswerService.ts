import { AskWhyRequest, AskWhyResponse, PIISpan, PII_CATEGORY_LABELS, ConfidenceDistribution } from "../types.js";

/**
 * AnswerService interface — Phase 1: MockAnswerService.
 * Phase 2: swap in GeminiAnswerService without changing consumers.
 */
export interface AnswerService {
  answer(req: AskWhyRequest, span: PIISpan, documentContext?: ConfidenceDistribution): Promise<AskWhyResponse>;
}

/**
 * MockAnswerService — keyword-routed template engine.
 * Produces grounded, span-specific answers with zero API calls.
 * See Section 7 of the spec for the full design rationale.
 */
export class MockAnswerService implements AnswerService {
  async answer(req: AskWhyRequest, span: PIISpan, _documentContext?: ConfidenceDistribution): Promise<AskWhyResponse> {
    // Artificial delay to simulate a real round-trip (400–800ms)
    const delay = 400 + Math.random() * 400;
    await new Promise((resolve) => setTimeout(resolve, delay));

    const question = req.question.toLowerCase();
    const categoryLabel = PII_CATEGORY_LABELS[span.type] || span.type;
    let answer: string;

    if (this.matchesKeywords(question, ["how sure", "confident", "confidence", "percent", "%", "accuracy"])) {
      answer = this.confidenceAnswer(span, categoryLabel, req.worriedMode);
    } else if (this.matchesKeywords(question, ["why does it matter", "risk", "what if exposed", "danger", "harm", "leak", "consequence"])) {
      answer = this.riskAnswer(span, categoryLabel, req.worriedMode);
    } else if (this.matchesKeywords(question, ["cutoff", "threshold", "why not", "borderline", "why was", "why wasn"])) {
      answer = this.thresholdAnswer(span, categoryLabel, req.worriedMode);
    } else if (this.matchesKeywords(question, ["other", "different", "elsewhere", "inconsistent", "same", "occur", "group"])) {
      answer = this.comparisonAnswer(span, categoryLabel, req.worriedMode);
    } else if (this.matchesKeywords(question, ["how", "pattern", "regex", "method", "detect", "found", "ai", "algorithm"])) {
      answer = this.methodAnswer(span, categoryLabel, req.worriedMode);
    } else if (this.matchesKeywords(question, ["safe", "share", "okay", "fine", "can i"])) {
      answer = this.safetyAnswer(span, categoryLabel, req.worriedMode);
    } else {
      answer = this.fallbackAnswer(span, categoryLabel, req.worriedMode);
    }

    return {
      answer,
      generatedAt: new Date().toISOString(),
      source: "mock",
      groundingUsed: [],
    };
  }

  private matchesKeywords(question: string, keywords: string[]): boolean {
    return keywords.some((k) => question.includes(k));
  }

  private confidenceAnswer(span: PIISpan, label: string, worried: boolean): string {
    if (span.confidence === null) {
      return worried
        ? `We honestly don't have a confidence score for this detection — the system flagged it based on pattern matching alone, without enough context to assign a numerical confidence. That uncertainty is exactly why it wasn't automatically redacted. You should review this one carefully.`
        : `Confidence is not available for this span. It was detected through pattern matching without enough context for a numerical confidence score. Because we can't quantify certainty, it was kept visible rather than risk a false positive.`;
    }

    const pct = Math.round(span.confidence * 100);
    const signalList = span.reasoning.signals.join(", ");

    if (worried) {
      return `This was flagged at ${pct}% confidence. ${pct >= 80 ? "That's quite high — the system is fairly certain this is real " + label + " data." : pct >= 60 ? "That's above our threshold but not overwhelmingly high — there's some room for doubt." : "That's actually below our cutoff, which is why it wasn't automatically hidden."} The main signals were: ${signalList}. Our threshold is set at ${Math.round(span.reasoning.threshold * 100)}%. ${pct >= 80 ? "I'd recommend keeping this redacted." : "You may want to double-check this one personally."}`;
    }

    return `This was flagged at ${pct}% confidence, ${span.confidence >= span.reasoning.threshold ? "above" : "below"} our ${Math.round(span.reasoning.threshold * 100)}% cutoff, mainly because of: ${signalList}.`;
  }

  private riskAnswer(span: PIISpan, label: string, worried: boolean): string {
    if (worried) {
      return `Here's why this matters: ${span.reasoning.possibleRisk} As a ${label}, this type of information ${span.decision === "redacted" ? "was flagged for hiding because leaving it visible" : "was kept visible, but if it were actually sensitive, leaving it exposed"} could create real problems. ${span.reasoning.signals.length > 0 ? "The detection signals (" + span.reasoning.signals[0] + ") suggest this is a genuine concern." : ""}`;
    }

    return `${span.reasoning.possibleRisk} This was categorized as ${label} — ${span.decision === "redacted" ? "which is why it was redacted" : "though it was kept visible because the confidence was below the threshold"}.`;
  }

  private thresholdAnswer(span: PIISpan, label: string, worried: boolean): string {
    const thresholdPct = Math.round(span.reasoning.threshold * 100);
    const confPct = span.confidence !== null ? Math.round(span.confidence * 100) : null;

    if (span.decision === "redacted") {
      if (worried) {
        return `Our cutoff for automatic redaction is ${thresholdPct}%. This ${label} came in at ${confPct !== null ? confPct + "%" : "unknown confidence"}, ${confPct !== null && confPct >= span.reasoning.threshold * 100 ? "which put it above the line" : "but it was redacted based on other factors"}. ${span.isBorderline ? "It IS sitting in the borderline zone (50-70%), so it's worth a second look — it could go either way." : "It's well clear of the borderline zone, so the system is fairly confident about this call."} ${span.reasoning.summary}`;
      }
      return `The redaction threshold is ${thresholdPct}%. This span's confidence of ${confPct !== null ? confPct + "%" : "N/A"} ${confPct !== null && confPct >= span.reasoning.threshold * 100 ? "exceeds" : "relates to"} that cutoff. ${span.isBorderline ? "Note: this is in the borderline range (50-70%)." : ""} ${span.reasoning.summary}`;
    } else {
      if (worried) {
        return `This was kept visible because ${confPct !== null ? "its confidence of " + confPct + "% falls below our " + thresholdPct + "% threshold" : "no confidence score was available, and we never redact without quantified certainty"}. ${span.reasoning.summary} That said, if you're uncomfortable with it being visible, you can still manually redact it using the Reject button.`;
      }
      return `This was kept visible because ${confPct !== null ? "its confidence of " + confPct + "% is below the " + thresholdPct + "% threshold" : "confidence is unavailable"}. ${span.reasoning.summary}`;
    }
  }

  private comparisonAnswer(span: PIISpan, label: string, worried: boolean): string {
    if (worried) {
      return `This ${label} belongs to the occurrence group "${span.occurrenceGroup}". If there are other mentions of the same entity in this document, they should ideally be treated consistently — redacting a name in one place but leaving it visible elsewhere defeats the purpose. Check the Review Queue for any consistency warnings. You can use "Apply to all occurrences" to ensure uniform treatment.`;
    }
    return `This span belongs to the occurrence group "${span.occurrenceGroup}". If the same entity appears multiple times, the system checks for consistent treatment. Use "Apply to all occurrences" to ensure all mentions are handled the same way.`;
  }

  private methodAnswer(span: PIISpan, label: string, worried: boolean): string {
    const signalList = span.reasoning.signals.join("; ");
    if (worried) {
      return `The system identified this as ${label} using ${span.reasoning.ruleBased ? "a combination of pattern matching rules (like regex for standard formats) and contextual analysis" : "contextual analysis of the surrounding text"}. The specific signals were: ${signalList}. ${span.reasoning.detectorNote}. In Phase 1, this is based on pre-analyzed detection data — a production version would use Microsoft Presidio for entity recognition combined with an LLM for context understanding.`;
    }
    return `Detection method: ${span.reasoning.ruleBased ? "Rule-based pattern matching" : "Contextual analysis"}. Signals: ${signalList}. ${span.reasoning.detectorNote}.`;
  }

  private safetyAnswer(span: PIISpan, label: string, worried: boolean): string {
    if (span.decision === "redacted") {
      if (worried) {
        return `This ${label} is currently set to be redacted, which means it will be replaced with "[REDACTED: ${span.type}]" in any exported text. That's the safer option. ${span.reasoning.possibleRisk} If you're confident this specific instance is harmless (for example, if it's a fictional name or publicly available info), you can choose to keep it visible — but that decision is yours to make.`;
      }
      return `This is currently redacted. In the exported text, it will appear as "[REDACTED: ${span.type}]". If you believe this is a false positive, you can reject the redaction.`;
    } else {
      if (worried) {
        return `This ${label} is currently set to remain visible in the document. ${span.reasoning.summary} However, ${span.reasoning.possibleRisk} If you're not comfortable with it being visible, you can manually redact it. Remember, the system's decision isn't final — your judgment matters.`;
      }
      return `This is currently kept visible. ${span.reasoning.summary} You can choose to redact it if you prefer.`;
    }
  }

  private fallbackAnswer(span: PIISpan, label: string, worried: boolean): string {
    if (worried) {
      return `Here's what we know about this detection: ${span.reasoning.summary} The potential risk is: ${span.reasoning.possibleRisk} ${span.confidence !== null ? "The system's confidence is " + Math.round(span.confidence * 100) + "% (threshold: " + Math.round(span.reasoning.threshold * 100) + "%)." : "No confidence score is available for this detection."} I can tell you what we detected and why, but I can't go beyond the detection data without more context — feel free to ask a more specific question.`;
    }
    return `${span.reasoning.summary} Possible risk: ${span.reasoning.possibleRisk} ${span.confidence !== null ? "Confidence: " + Math.round(span.confidence * 100) + "% (threshold: " + Math.round(span.reasoning.threshold * 100) + "%)." : "Confidence: not available."} I can tell you what we detected and why, but I can't go beyond that without more context — happy to take another question.`;
  }
}
