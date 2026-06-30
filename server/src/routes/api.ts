import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import {
  getDetectionService,
  getAnswerService,
  getDecisionEngine,
  getExplanationGenerator,
  getExportService,
} from "../services/factory.js";
import { store } from "../store.js";
import {
  PIIDocument,
  AskWhyRequest,
  SpanActionRequest,
  TextSegment,
} from "../types.js";
import { computeConfidenceDistribution } from "../utils/ConfidenceAnalyzer.js";

const router = Router();

// Multer for .txt file upload (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 }, // 200KB cap
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === "text/plain" ||
      file.originalname.endsWith(".txt")
    ) {
      cb(null, true);
    } else {
      cb(new Error("We support pasted text and .txt files in this version."));
    }
  },
});

// ============================================================
// GET /api/samples — list available sample documents
// ============================================================
router.get("/samples", (_req: Request, res: Response) => {
  const detection = getDetectionService();
  const samples = detection.getSampleList();
  res.json({ samples });
});

// ============================================================
// POST /api/intake — accept pasted text or .txt upload or sampleId
// ============================================================
router.post(
  "/intake",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const { text, sampleId } = req.body;
      const file = req.file;

      let documentText: string;
      let title: string;

      if (sampleId) {
        // Load a sample document
        const detection = getDetectionService();
        const sample = detection.getSample(sampleId);
        if (!sample) {
          res.status(404).json({
            error: "Sample not found",
            message: `No sample document found with ID "${sampleId}". Use GET /api/samples to see available options.`,
          });
          return;
        }
        documentText = sample.originalText;
        title = sample.title;
      } else if (file) {
        // .txt file upload
        documentText = file.buffer.toString("utf-8");
        title = file.originalname.replace(/\.txt$/i, "");
      } else if (text && typeof text === "string") {
        // Pasted text
        documentText = text;
        title = "Pasted Document";
      } else {
        res.status(400).json({
          error: "No content provided",
          message:
            "Please paste some text, upload a .txt file, or select a sample document.",
        });
        return;
      }

      // Validate: empty
      if (!documentText.trim()) {
        res.status(400).json({
          error: "Empty document",
          message:
            "This document appears to be empty — please add some content.",
        });
        return;
      }

      // Validate: oversized (200KB)
      if (Buffer.byteLength(documentText, "utf-8") > 200 * 1024) {
        res.status(400).json({
          error: "Document too large",
          message:
            "This document exceeds our 200KB limit. Please shorten it or split it into smaller sections.",
        });
        return;
      }

      // Run detection
      const detection = getDetectionService();
      const explanationGen = getExplanationGenerator();
      const decisionEngine = getDecisionEngine();

      const { spans: rawSpans } = await detection.detect(
        documentText,
        sampleId || undefined
      );

      // Enrich explanations (passthrough in Phase 1)
      const enriched = explanationGen.enrich(rawSpans);

      // Apply decision logic
      const { spans, consistencyFlags } = decisionEngine.process(enriched);

      // Build redacted text
      const exportService = getExportService();
      const redactedText = exportService.buildRedactedText(
        documentText,
        spans
      );

      // Compute meta
      const meta = {
        totalSpans: spans.length,
        redactedCount: spans.filter((s) => s.decision === "redacted").length,
        keptCount: spans.filter((s) => s.decision === "kept").length,
        borderlineCount: spans.filter((s) => s.isBorderline).length,
        riskScore: computeRiskScore(spans),
      };

      // Build segments
      const segments = buildSegments(documentText, spans);

      // Compute confidence analytics
      const confidenceAnalysis = computeConfidenceDistribution(spans);

      // Create document
      const doc: PIIDocument = {
        documentId: uuidv4(),
        title,
        originalText: documentText, // Stays server-side ONLY
        redactedText,
        spans,
        segments,
        confidenceAnalysis,
        consistencyFlags,
        meta,
        analyzedAt: new Date().toISOString(),
      };

      store.set(doc);

      // Return frontend-safe response (no originalText)
      const safe = store.getSafe(doc.documentId);
      res.json(safe);
    } catch (err: any) {
      console.error("Intake error:", err);
      if (err.message?.includes("We support pasted text")) {
        res.status(400).json({
          error: "Unsupported file type",
          message: err.message,
        });
        return;
      }
      res.status(500).json({
        error: "Processing failed",
        message:
          "Something went wrong while analyzing your document. Please try again.",
      });
    }
  }
);

// ============================================================
// GET /api/document/:id — get document data (never originalText)
// ============================================================
router.get("/document/:id", (req: Request, res: Response) => {
  const doc = store.getSafe(req.params.id);
  if (!doc) {
    res.status(404).json({
      error: "Document not found",
      message: "This document may have expired. Try loading it again.",
    });
    return;
  }
  res.json(doc);
});

// ============================================================
// POST /api/ask — Ask-Why question about a span
// ============================================================
router.post("/ask", async (req: Request, res: Response) => {
  try {
    const { documentId, spanId, question, worriedMode } =
      req.body as AskWhyRequest;

    if (!documentId || !spanId || !question) {
      res.status(400).json({
        error: "Missing fields",
        message: "Please provide documentId, spanId, and question.",
      });
      return;
    }

    const doc = store.get(documentId);
    if (!doc) {
      res.status(404).json({
        error: "Document not found",
        message: "This document may have expired.",
      });
      return;
    }

    const span = doc.spans.find((s) => s.id === spanId);
    if (!span) {
      res.status(404).json({
        error: "Span not found",
        message: `No span with ID "${spanId}" found in this document.`,
      });
      return;
    }

    const answerSvc = getAnswerService();
    const response = await answerSvc.answer(
      { documentId, spanId, question, worriedMode: !!worriedMode },
      span,
      doc.confidenceAnalysis
    );

    res.json(response);
  } catch (err) {
    console.error("Ask error:", err);
    res.status(500).json({
      error: "Answer failed",
      message: "Could not generate an answer. Please try again.",
    });
  }
});

// ============================================================
// POST /api/span/:spanId/action — Accept/Reject/Modify/Undo a span
// ============================================================
router.post("/span/:spanId/action", (req: Request, res: Response) => {
  const { spanId } = req.params;
  const { action, modifiedText, documentId } = req.body as SpanActionRequest & {
    documentId: string;
  };

  if (!documentId || !action) {
    res.status(400).json({
      error: "Missing fields",
      message: "Please provide documentId and action.",
    });
    return;
  }

  const doc = store.get(documentId);
  if (!doc) {
    res.status(404).json({
      error: "Document not found",
      message: "This document may have expired.",
    });
    return;
  }

  const span = doc.spans.find((s) => s.id === spanId);
  if (!span) {
    res.status(404).json({
      error: "Span not found",
      message: `No span with ID "${spanId}" found.`,
    });
    return;
  }

  if (action === "undone") {
    // Revert to pending
    span.status = "pending";
    span.history.push({
      timestamp: new Date().toISOString(),
      action: "undone",
      spanId,
    });
  } else if (action === "applied_to_all") {
    // Apply current span's status to all in the same occurrence group
    const groupSpans = doc.spans.filter(
      (s) => s.occurrenceGroup === span.occurrenceGroup
    );
    for (const gs of groupSpans) {
      gs.status = span.status === "pending" ? "accepted" : span.status;
      gs.decision = span.decision;
      gs.history.push({
        timestamp: new Date().toISOString(),
        action: "applied_to_all",
        spanId: gs.id,
      });
    }
  } else {
    span.status = action;
    if (action === "modified" && modifiedText !== undefined) {
      span.text = modifiedText;
    }
    span.history.push({
      timestamp: new Date().toISOString(),
      action,
      spanId,
    });
  }

  // Rebuild redacted text with updated decisions
  const exportService = getExportService();
  doc.redactedText = exportService.buildRedactedText(
    doc.originalText,
    doc.spans
  );

  // Update meta
  doc.meta = {
    totalSpans: doc.spans.length,
    redactedCount: doc.spans.filter((s) => {
      if (s.status === "rejected") return s.decision !== "redacted";
      return s.decision === "redacted";
    }).length,
    keptCount: doc.spans.filter((s) => {
      if (s.status === "rejected") return s.decision === "redacted";
      return s.decision === "kept";
    }).length,
    borderlineCount: doc.spans.filter((s) => s.isBorderline).length,
    riskScore: computeRiskScore(doc.spans),
  };

  const safe = store.getSafe(doc.documentId);
  res.json(safe);
});

// ============================================================
// POST /api/reveal/:spanId — Reveal original text for one span
// ============================================================
router.post("/reveal/:spanId", (req: Request, res: Response) => {
  const { spanId } = req.params;
  const { documentId } = req.body;

  if (!documentId) {
    res.status(400).json({
      error: "Missing documentId",
      message: "Please provide the document ID.",
    });
    return;
  }

  const originalText = store.getSpanOriginalText(documentId, spanId);
  if (originalText === undefined) {
    res.status(404).json({
      error: "Not found",
      message: "Span or document not found.",
    });
    return;
  }

  res.json({
    spanId,
    originalText,
    note: "This text never leaves your machine — you are viewing the local redaction proof.",
  });
});

// ============================================================
// POST /api/export — Build final redacted text for export
// ============================================================
router.post("/export", (req: Request, res: Response) => {
  const { documentId } = req.body;

  if (!documentId) {
    res.status(400).json({
      error: "Missing documentId",
      message: "Please provide a document ID.",
    });
    return;
  }

  const doc = store.get(documentId);
  if (!doc) {
    res.status(404).json({
      error: "Document not found",
      message: "This document may have expired.",
    });
    return;
  }

  const exportService = getExportService();
  const redactedText = exportService.buildRedactedText(
    doc.originalText,
    doc.spans
  );

  res.json({
    documentId,
    title: doc.title,
    redactedText,
    meta: doc.meta,
    exportedAt: new Date().toISOString(),
  });
});

/**
 * Compute a 0–100 risk score based on span confidences and types.
 * Higher risk = more high-confidence sensitive items still exposed.
 */
function computeRiskScore(spans: PIIDocument["spans"]): number {
  if (spans.length === 0) return 0;

  const HIGH_RISK_TYPES = new Set([
    "SSN_OR_GOVT_ID",
    "FINANCIAL_ACCOUNT",
    "MEDICAL_INFO",
  ]);
  const MED_RISK_TYPES = new Set([
    "PERSON_NAME",
    "EMAIL",
    "PHONE",
    "ADDRESS",
    "DATE_OF_BIRTH",
  ]);

  let totalRisk = 0;

  for (const span of spans) {
    const isExposed =
      span.decision === "kept" ||
      span.status === "rejected";

    if (!isExposed) continue;

    const conf = span.confidence ?? 0.5;
    let weight = 1;

    if (HIGH_RISK_TYPES.has(span.type)) weight = 3;
    else if (MED_RISK_TYPES.has(span.type)) weight = 2;

    totalRisk += conf * weight;
  }

  // Normalize: max possible risk if everything were exposed
  const maxRisk = spans.length * 3;
  return Math.min(100, Math.round((totalRisk / maxRisk) * 100));
}

function buildSegments(originalText: string, spans: any[]): TextSegment[] {
  const result: TextSegment[] = [];
  const sortedSpans = [...spans].sort((a, b) => a.startIndex - b.startIndex);

  let lastIndex = 0;
  for (const span of sortedSpans) {
    if (span.startIndex > lastIndex) {
      result.push({
        text: originalText.substring(lastIndex, span.startIndex),
        spanId: null,
      });
    }
    result.push({
      text: originalText.substring(span.startIndex, span.endIndex),
      spanId: span.id,
    });
    lastIndex = span.endIndex;
  }

  if (lastIndex < originalText.length) {
    result.push({
      text: originalText.substring(lastIndex),
      spanId: null,
    });
  }

  return result;
}

export default router;
