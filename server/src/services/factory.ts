import { MockDetectionService } from "./MockDetectionService.js";
import { MockAnswerService, type AnswerService } from "./AnswerService.js";
import { GeminiAnswerService } from "./GeminiAnswerService.js";
import { DecisionEngine } from "./DecisionEngine.js";
import { ExplanationGenerator } from "./ExplanationGenerator.js";
import { ExportService } from "./ExportService.js";
import type { DetectionService } from "./DetectionService.js";

/**
 * Service factory — controlled by environment variables.
 * Phase 1: both return mock implementations.
 * Phase 2: flip ANSWER_MODE=live for Gemini.
 */

const DETECTION_MODE = process.env.DETECTION_MODE || "mock";
const ANSWER_MODE = process.env.ANSWER_MODE || "mock";

let detectionService: MockDetectionService;
let answerService: AnswerService;
let decisionEngine: DecisionEngine;
let explanationGenerator: ExplanationGenerator;
let exportService: ExportService;

export function getDetectionService(): MockDetectionService {
  if (!detectionService) {
    if (DETECTION_MODE === "mock") {
      detectionService = new MockDetectionService();
    } else {
      throw new Error(`Unknown DETECTION_MODE: ${DETECTION_MODE}`);
    }
  }
  return detectionService;
}

export function getAnswerService(): AnswerService {
  if (!answerService) {
    if (ANSWER_MODE === "live") {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn("⚠ ANSWER_MODE=live but GEMINI_API_KEY is not set. Falling back to mock.");
        answerService = new MockAnswerService();
      } else {
        answerService = new GeminiAnswerService({
          apiKey,
          model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
          endpoint: process.env.GEMINI_API_ENDPOINT || "https://generativelanguage.googleapis.com/v1beta/models",
          timeoutMs: parseInt(process.env.GEMINI_TIMEOUT_MS || "10000"),
        });
        console.log(`✅ GeminiAnswerService initialized (model: ${process.env.GEMINI_MODEL || "gemini-2.5-flash"})`);
      }
    } else {
      answerService = new MockAnswerService();
    }
  }
  return answerService;
}

export function getDecisionEngine(): DecisionEngine {
  if (!decisionEngine) {
    decisionEngine = new DecisionEngine();
  }
  return decisionEngine;
}

export function getExplanationGenerator(): ExplanationGenerator {
  if (!explanationGenerator) {
    explanationGenerator = new ExplanationGenerator();
  }
  return explanationGenerator;
}

export function getExportService(): ExportService {
  if (!exportService) {
    exportService = new ExportService();
  }
  return exportService;
}
