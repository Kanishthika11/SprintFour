import type { PIIDocumentResponse, AskWhyResponse, SampleDocumentInfo } from "./types";

const API_BASE = "/api";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  getSamples: () =>
    request<{ samples: SampleDocumentInfo[] }>("/samples"),

  intake: (data: { text?: string; sampleId?: string }) =>
    request<PIIDocumentResponse>("/intake", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  intakeFile: async (file: File): Promise<PIIDocumentResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/intake`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `Upload failed: ${res.status}`);
    }
    return res.json();
  },

  getDocument: (id: string) =>
    request<PIIDocumentResponse>(`/document/${id}`),

  ask: (data: {
    documentId: string;
    spanId: string;
    question: string;
    worriedMode: boolean;
  }) =>
    request<AskWhyResponse>("/ask", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  spanAction: (
    spanId: string,
    data: {
      documentId: string;
      action: string;
      modifiedText?: string;
    }
  ) =>
    request<PIIDocumentResponse>(`/span/${spanId}/action`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  reveal: (spanId: string, documentId: string) =>
    request<{ spanId: string; originalText: string; note: string }>(
      `/reveal/${spanId}`,
      {
        method: "POST",
        body: JSON.stringify({ documentId }),
      }
    ),

  exportDocument: (documentId: string) =>
    request<{
      documentId: string;
      title: string;
      redactedText: string;
      meta: PIIDocumentResponse["meta"];
      exportedAt: string;
    }>("/export", {
      method: "POST",
      body: JSON.stringify({ documentId }),
    }),
};
