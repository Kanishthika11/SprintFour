import { AskWhyRequest, AskWhyResponse, PIISpan, PII_CATEGORY_LABELS, ConfidenceDistribution } from "../types.js";
import { AnswerService } from "./AnswerService.js";

interface GeminiConfig {
  apiKey: string;
  model: string;
  endpoint: string;
  timeoutMs: number;
}

/**
 * GeminiAnswerService — calls the Gemini API with a grounded prompt.
 * Falls back to mock-style answers on any error.
 */
export class GeminiAnswerService implements AnswerService {
  private config: GeminiConfig;

  constructor(config: GeminiConfig) {
    this.config = config;
  }

  async answer(
    req: AskWhyRequest,
    span: PIISpan,
    documentContext?: ConfidenceDistribution
  ): Promise<AskWhyResponse> {
    try {
      const prompt = this.buildGroundedPrompt(
        req.question,
        span,
        req.worriedMode,
        documentContext
      );

      const response = await this.callGemini(prompt);

      return {
        answer: response.text,
        generatedAt: new Date().toISOString(),
        source: "live",
        tokensUsed: {
          input: response.inputTokens,
          output: response.outputTokens,
        },
        groundingUsed: this.extractGroundingUsed(span, documentContext),
      };
    } catch (error: any) {
      console.error("Gemini API error:", error?.message || error);
      return {
        answer: `I couldn't reach the explanation service just now, but here's what we detected: ${span.reasoning.summary} The possible risk: ${span.reasoning.possibleRisk}`,
        generatedAt: new Date().toISOString(),
        source: "mock",
        groundingUsed: ["span reasoning", "span risk"],
      };
    }
  }

  private buildGroundedPrompt(
    userQuestion: string,
    span: PIISpan,
    worriedMode: boolean,
    documentContext?: ConfidenceDistribution
  ): string {
    const categoryLabel = PII_CATEGORY_LABELS[span.type] || span.type;
    const toneNote = worriedMode
      ? "The user is anxious about data leakage. Be reassuring but honest."
      : "Be clear and clinical.";

    const documentStats = documentContext
      ? `\nDocument-level stats: ${documentContext.buckets
          .map((b) => `${b.label}: ${b.count} spans`)
          .join(", ")}. Mean confidence: ${(documentContext.mean * 100).toFixed(0)}%.`
      : "";

    return `You are a PII detection explainer. A user is asking about a specific piece of text that was flagged during PII analysis.

${toneNote}

**CONSTRAINTS:**
- Only use the facts provided below. Do not invent facts about the document, the organization, or the detection method.
- Keep your answer to 1–3 sentences. Be specific and grounded.
- If the user asks about something not in the facts below, say "I don't have that information" rather than guessing.

**FACTS ABOUT THIS SPAN:**
- Text flagged: "${span.text}"
- PII Category: ${categoryLabel}
- Confidence: ${span.confidence !== null ? `${(span.confidence * 100).toFixed(0)}%` : "Not available"}
- Decision: ${span.decision}
- Detection signals: ${span.reasoning.signals.join("; ")}
- Why this matters: ${span.reasoning.possibleRisk}
- Our decision threshold: ${(span.reasoning.threshold * 100).toFixed(0)}%
${documentStats}

**USER QUESTION:**
"${userQuestion}"

**YOUR RESPONSE:**
Provide a clear, grounded answer (1–3 sentences) that helps the user understand the detection decision. Do not apologize, do not explain the system in abstract terms — just answer their specific question about this specific text.`;
  }

  private async callGemini(prompt: string): Promise<{
    text: string;
    inputTokens: number;
    outputTokens: number;
  }> {
    const url = `${this.config.endpoint}/${this.config.model}:generateContent?key=${this.config.apiKey}`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 400,
        temperature: 0.3,
        topP: 0.8,
        thinkingConfig: {
          thinkingBudget: 0
        }
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ],
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        throw new Error("Rate limited by Gemini API — please try again in a moment.");
      }

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini API returned ${response.status}: ${errorBody}`);
      }

      const data = await response.json();
      const text =
        data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
      const usageMetadata = data.usageMetadata || {};

      return {
        text,
        inputTokens: usageMetadata.promptTokenCount || 0,
        outputTokens: usageMetadata.candidatesTokenCount || 0,
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error(`Gemini API timeout after ${this.config.timeoutMs}ms`);
      }
      throw error;
    }
  }

  private extractGroundingUsed(
    span: PIISpan,
    documentContext?: ConfidenceDistribution
  ): string[] {
    const grounding = [
      `PII type: ${PII_CATEGORY_LABELS[span.type] || span.type}`,
      `Confidence: ${span.confidence !== null ? `${(span.confidence * 100).toFixed(0)}%` : "unavailable"}`,
      `Signals: ${span.reasoning.signals[0] || "none"}`,
      `Risk: ${span.reasoning.possibleRisk.substring(0, 60)}…`,
    ];

    if (documentContext) {
      grounding.push(
        `Doc context: ${documentContext.buckets.length} bands, mean ${(documentContext.mean * 100).toFixed(0)}%`
      );
    }

    return grounding;
  }
}
