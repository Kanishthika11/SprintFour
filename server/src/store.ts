import { PIIDocument } from "./types.js";

/**
 * In-memory document store. Maps documentId → PIIDocument.
 * This is the ONLY place originalText is held. It is never serialized
 * into any API response after the initial detection pass.
 */
class DocumentStore {
  private documents: Map<string, PIIDocument> = new Map();

  set(doc: PIIDocument): void {
    this.documents.set(doc.documentId, doc);
  }

  get(documentId: string): PIIDocument | undefined {
    return this.documents.get(documentId);
  }

  has(documentId: string): boolean {
    return this.documents.has(documentId);
  }

  /**
   * Returns a frontend-safe copy with originalText stripped.
   * This is the gateway enforcing the architectural guarantee:
   * originalText never leaves the server.
   */
  getSafe(documentId: string) {
    const doc = this.documents.get(documentId);
    if (!doc) return undefined;

    const { originalText, ...safe } = doc;
    return safe;
  }

  /**
   * Returns ONLY the original text for a specific span (for reveal-underneath).
   * This is the only controlled leak of original content — one span at a time.
   */
  getSpanOriginalText(documentId: string, spanId: string): string | undefined {
    const doc = this.documents.get(documentId);
    if (!doc) return undefined;
    const span = doc.spans.find((s) => s.id === spanId);
    if (!span) return undefined;
    return span.text;
  }

  listAll(): PIIDocument[] {
    return Array.from(this.documents.values());
  }

  delete(documentId: string): boolean {
    return this.documents.delete(documentId);
  }
}

export const store = new DocumentStore();
