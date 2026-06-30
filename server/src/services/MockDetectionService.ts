import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { DetectionService } from "./DetectionService.js";
import { PIISpan } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLES_DIR = join(__dirname, "../../samples");

interface SampleData {
  id: string;
  title: string;
  description: string;
  originalText: string;
  spans: Omit<PIISpan, "status" | "history">[];
}

/**
 * MockDetectionService — reads hand-written JSON sample data.
 * Phase 1 only. Phase 2 swaps this for PresidioDetectionService.
 */
export class MockDetectionService implements DetectionService {
  private samples: Map<string, SampleData> = new Map();

  constructor() {
    this.loadSamples();
  }

  private loadSamples(): void {
    const sampleFiles = ["resume.json", "medical-referral.json", "legal-demand.json"];
    for (const file of sampleFiles) {
      try {
        const raw = readFileSync(join(SAMPLES_DIR, file), "utf-8");
        const data: SampleData = JSON.parse(raw);
        
        // Correct offsets dynamically and verify correctness
        this.correctOffsets(data.originalText, data.spans);
        
        this.samples.set(data.id, data);
      } catch (err) {
        console.error(`❌ CRITICAL: Failed to load sample ${file}:`, err);
        throw err; // Fail loudly
      }
    }
  }

  private correctOffsets(originalText: string, spans: any[]): void {
    const matchCounts = new Map<string, number>();

    for (const span of spans) {
      const searchText = span.text;
      const currentOccurrence = matchCounts.get(searchText) || 0;
      
      let index = -1;
      for (let i = 0; i <= currentOccurrence; i++) {
        index = originalText.indexOf(searchText, index + 1);
        if (index === -1) {
          break;
        }
      }
      
      if (index === -1) {
        throw new Error(
          `Assertion failed: Could not find occurrence ${currentOccurrence + 1} of "${searchText}" in document text`
        );
      }

      span.startIndex = index;
      span.endIndex = index + searchText.length;
      
      matchCounts.set(searchText, currentOccurrence + 1);

      // Hard runtime assertion
      const extracted = originalText.slice(span.startIndex, span.endIndex);
      if (extracted !== span.text) {
        throw new Error(
          `Assertion failed: Offsets for span "${span.id}" do not match original text. Expected "${span.text}", got "${extracted}"`
        );
      }
    }
  }

  getSampleList() {
    return Array.from(this.samples.values()).map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      spanCount: s.spans.length,
    }));
  }

  getSample(sampleId: string): SampleData | undefined {
    return this.samples.get(sampleId);
  }

  async detect(
    text: string,
    sampleId?: string
  ): Promise<{ spans: Omit<PIISpan, "status" | "history">[] }> {
    // If a sample ID is provided, return its pre-written spans
    if (sampleId && this.samples.has(sampleId)) {
      const sample = this.samples.get(sampleId)!;
      return { spans: sample.spans };
    }

    // For arbitrary pasted text, return a default mock span set
    // Phase 1 simplification: we detect basic patterns with regex
    return { spans: this.generateDefaultSpans(text) };
  }

  /**
   * Generates basic mock spans for arbitrary pasted text.
   * Uses simple regex patterns for demo purposes.
   */
  private generateDefaultSpans(
    text: string
  ): Omit<PIISpan, "status" | "history">[] {
    interface DetectionPattern {
      regex: RegExp;
      type: PIISpan["type"];
      confidence: number;
      priority: number;
      summary: (match: string) => string;
      signals: string[];
      risk: string;
    }

    const patterns: DetectionPattern[] = [
      {
        regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
        type: "EMAIL",
        confidence: 0.95,
        priority: 4,
        summary: () =>
          "This matches the pattern of an email address and could be used to contact or identify the person it belongs to.",
        signals: ["Standard email format (user@domain)"],
        risk: "Email addresses enable unsolicited contact, phishing attacks, and can be used to look up other accounts.",
      },
      {
        regex: /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g,
        type: "SSN_OR_GOVT_ID",
        confidence: 0.95,
        priority: 3,
        summary: () =>
          "This matches the pattern of a US Social Security Number. SSNs are high-risk identifiers that can be exploited for identity theft.",
        signals: ["SSN format (XXX-XX-XXXX or similar)"],
        risk: "Social Security Numbers enable identity theft, fraudulent credit applications, and tax fraud.",
      },
      {
        regex: /\b[A-Z]{2}\d{7}\b/gi, // e.g. XK9087345
        type: "SSN_OR_GOVT_ID",
        confidence: 0.92,
        priority: 3,
        summary: () =>
          "This matches the alphanumeric format of a Passport Number.",
        signals: ["Passport format (2 letters followed by 7 digits)"],
        risk: "Passport numbers are highly sensitive government identifiers that can enable identity fraud or travel exploitation.",
      },
      {
        regex: /\b\d{2}-\d{7}\b/g, // EIN / Tax ID
        type: "SSN_OR_GOVT_ID",
        confidence: 0.90,
        priority: 3,
        summary: () =>
          "This matches the pattern of a Tax Identification Number or Employer Identification Number.",
        signals: ["Tax ID/EIN format (XX-XXXXXXX)"],
        risk: "Tax identifiers are sensitive government-issued numbers that can facilitate financial identity theft.",
      },
      {
        regex: /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
        type: "PHONE",
        confidence: 0.88,
        priority: 3,
        summary: () =>
          "This matches the pattern of a US phone number.",
        signals: ["US phone number format"],
        risk: "Phone numbers enable unwanted calls, SMS phishing, and SIM swapping attacks.",
      },
      {
        regex: /\b\d{9}\b/g, // 9-digit Routing Number
        type: "FINANCIAL_ACCOUNT",
        confidence: 0.92,
        priority: 2,
        summary: () =>
          "This 9-digit number matches the format of a bank routing transit number.",
        signals: ["9-digit financial identifier"],
        risk: "Routing numbers are used alongside account numbers to authorize electronic fund transfers and print fraudulent checks.",
      },
      {
        regex: /\b\d{6,18}\b/g, // Labeled or generic account numbers (6 to 18 digits)
        type: "FINANCIAL_ACCOUNT",
        confidence: 0.85,
        priority: 1,
        summary: () =>
          "This sequence matches the digit length of a typical bank account or credit card number.",
        signals: ["Numeric sequence of account length (6-18 digits)"],
        risk: "Exposed financial account numbers facilitate unauthorized transactions, fraud, and account takeovers.",
      },
    ];

    const allMatches: Array<{
      text: string;
      startIndex: number;
      endIndex: number;
      type: PIISpan["type"];
      confidence: number;
      priority: number;
      summary: string;
      signals: string[];
      possibleRisk: string;
    }> = [];

    // 1. Run all regex patterns and collect matches
    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0;
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        const startIndex = match.index;
        const endIndex = match.index + match[0].length;
        
        allMatches.push({
          text: match[0],
          startIndex,
          endIndex,
          type: pattern.type,
          confidence: pattern.confidence,
          priority: pattern.priority,
          summary: pattern.summary(match[0]),
          signals: pattern.signals,
          possibleRisk: pattern.risk,
        });
      }
    }

    // 2. Sort matches: longer matches first, then higher priority, then earlier matches
    allMatches.sort((a, b) => {
      if (a.startIndex !== b.startIndex) {
        return a.startIndex - b.startIndex;
      }
      const lenA = a.endIndex - a.startIndex;
      const lenB = b.endIndex - b.startIndex;
      if (lenA !== lenB) {
        return lenB - lenA; // longer match first
      }
      return b.priority - a.priority; // higher priority first
    });

    // 3. Filter out overlapping matches using greedy interval scheduling
    const filteredSpans: Omit<PIISpan, "status" | "history">[] = [];
    let lastEnd = -1;
    let id = 0;

    for (const match of allMatches) {
      if (match.startIndex >= lastEnd) {
        // Assert slice correctness
        const extracted = text.slice(match.startIndex, match.endIndex);
        if (extracted !== match.text) {
          throw new Error(
            `Assertion failed: Regex match slice mismatch for text "${match.text}" at ${match.startIndex}-${match.endIndex}`
          );
        }

        filteredSpans.push({
          id: `paste_span_${++id}`,
          text: match.text,
          startIndex: match.startIndex,
          endIndex: match.endIndex,
          type: match.type,
          confidence: match.confidence,
          decision: match.confidence >= 0.6 ? "redacted" : "kept",
          isBorderline: match.confidence >= 0.5 && match.confidence <= 0.7,
          reasoning: {
            summary: match.summary,
            signals: match.signals,
            ruleBased: true,
            detectorNote: "Matched detection rule",
            threshold: 0.6,
            possibleRisk: match.possibleRisk,
          },
          occurrenceGroup: `${match.type.toLowerCase()}_${match.text.replace(/[^a-zA-Z0-9]/g, "_")}`,
        });
        lastEnd = match.endIndex;
      }
    }

    return filteredSpans;
  }
}
