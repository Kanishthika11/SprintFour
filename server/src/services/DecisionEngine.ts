import { PIISpan, ConsistencyFlag } from "../types.js";

const DEFAULT_THRESHOLD = 0.6;
const BORDERLINE_LOW = 0.5;
const BORDERLINE_HIGH = 0.7;

/**
 * DecisionEngine — applies threshold logic, marks borderline spans,
 * groups occurrences, detects consistency issues, and resolves overlaps.
 */
export class DecisionEngine {
  private threshold: number;

  constructor(threshold: number = DEFAULT_THRESHOLD) {
    this.threshold = threshold;
  }

  /**
   * Process raw detection spans through the full decision pipeline.
   */
  process(
    rawSpans: Omit<PIISpan, "status" | "history">[]
  ): {
    spans: PIISpan[];
    consistencyFlags: ConsistencyFlag[];
  } {
    // 1. Resolve overlapping spans
    const resolved = this.resolveOverlaps(rawSpans);

    // 2. Apply threshold decisions and mark borderline
    const decided = resolved.map((span) => this.applyThreshold(span));

    // 3. Add status and history
    const withStatus: PIISpan[] = decided.map((span) => ({
      ...span,
      status: "pending" as const,
      history: [],
    }));

    // 4. Detect consistency issues
    const consistencyFlags = this.detectConsistencyIssues(withStatus);

    return { spans: withStatus, consistencyFlags };
  }

  private applyThreshold(
    span: Omit<PIISpan, "status" | "history">
  ): Omit<PIISpan, "status" | "history"> {
    const confidence = span.confidence;

    // null confidence → always kept (never redact on unknown)
    if (confidence === null) {
      return {
        ...span,
        decision: "kept",
        isBorderline: false,
      };
    }

    const decision = confidence >= this.threshold ? "redacted" : "kept";
    const isBorderline =
      confidence >= BORDERLINE_LOW && confidence <= BORDERLINE_HIGH;

    return { ...span, decision, isBorderline };
  }

  /**
   * Resolve overlapping spans by keeping the longest/most specific one.
   */
  private resolveOverlaps(
    spans: Omit<PIISpan, "status" | "history">[]
  ): Omit<PIISpan, "status" | "history">[] {
    if (spans.length <= 1) return spans;

    // Sort by startIndex, then by length (descending) to prefer longer spans
    const sorted = [...spans].sort((a, b) => {
      if (a.startIndex !== b.startIndex) return a.startIndex - b.startIndex;
      return (b.endIndex - b.startIndex) - (a.endIndex - a.startIndex);
    });

    const result: Omit<PIISpan, "status" | "history">[] = [];

    for (const span of sorted) {
      const overlapping = result.find(
        (existing) =>
          span.startIndex < existing.endIndex &&
          span.endIndex > existing.startIndex
      );

      if (overlapping) {
        // Keep the longer span; add overlap note to signals
        const existingLen = overlapping.endIndex - overlapping.startIndex;
        const newLen = span.endIndex - span.startIndex;

        if (newLen > existingLen) {
          // Replace with the longer span
          const idx = result.indexOf(overlapping);
          result[idx] = {
            ...span,
            reasoning: {
              ...span.reasoning,
              signals: [
                ...span.reasoning.signals,
                `Overlapping entity resolved: kept "${span.text}" over shorter "${overlapping.text}"`,
              ],
            },
          };
        } else {
          // Keep existing, note the overlap
          overlapping.reasoning.signals = [
            ...overlapping.reasoning.signals,
            `Overlapping entity resolved: kept "${overlapping.text}" over shorter "${span.text}"`,
          ];
        }
      } else {
        result.push({ ...span });
      }
    }

    return result;
  }

  /**
   * Detect consistency issues — when an occurrence group has mixed decisions.
   */
  private detectConsistencyIssues(spans: PIISpan[]): ConsistencyFlag[] {
    const groups = new Map<string, PIISpan[]>();

    for (const span of spans) {
      const existing = groups.get(span.occurrenceGroup) || [];
      existing.push(span);
      groups.set(span.occurrenceGroup, existing);
    }

    const flags: ConsistencyFlag[] = [];

    for (const [group, groupSpans] of groups) {
      if (groupSpans.length < 2) continue;

      const decisions = new Set(groupSpans.map((s) => s.decision));
      if (decisions.size > 1) {
        const redactedIds = groupSpans
          .filter((s) => s.decision === "redacted")
          .map((s) => s.id);
        const keptIds = groupSpans
          .filter((s) => s.decision === "kept")
          .map((s) => s.id);

        flags.push({
          occurrenceGroup: group,
          issue: `The same entity "${groupSpans[0].text}" is treated differently: redacted in ${redactedIds.join(", ")} but kept visible in ${keptIds.join(", ")}. This inconsistency could undermine the redaction.`,
          spanIds: groupSpans.map((s) => s.id),
        });
      }
    }

    return flags;
  }
}
