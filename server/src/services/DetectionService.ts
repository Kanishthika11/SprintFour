import { PIISpan } from "../types.js";

/**
 * DetectionService interface — Phase 1: MockDetectionService.
 * Phase 2: swap in PresidioDetectionService without changing consumers.
 */
export interface DetectionService {
  detect(text: string, sampleId?: string): Promise<{
    spans: Omit<PIISpan, "status" | "history">[];
  }>;
}
