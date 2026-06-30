import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PIIDocumentResponse } from "../lib/types";
import { api } from "../lib/api";

interface SessionDocument {
  documentId: string;
  title: string;
  analyzedAt: string;
}

interface DocumentState {
  // Current document
  currentDocument: PIIDocumentResponse | null;
  initialRedactedText: string | null;
  isLoading: boolean;
  error: string | null;

  // Interaction
  selectedSpanId: string | null;
  hoveredSpanId: string | null;

  // Settings
  threshold: number;
  sidebarWidth: number;
  worriedMode: boolean;
  darkMode: boolean;

  // Session
  sessionDocuments: SessionDocument[];

  // Actions
  loadSampleDocument: (sampleId: string) => Promise<void>;
  loadPastedText: (text: string) => Promise<void>;
  loadFile: (file: File) => Promise<void>;
  refreshDocument: (documentId?: string) => Promise<void>;

  selectSpan: (spanId: string | null) => void;
  hoverSpan: (spanId: string | null) => void;

  setThreshold: (threshold: number) => void;
  setSidebarWidth: (width: number) => void;
  toggleWorriedMode: () => void;
  toggleDarkMode: () => void;
  setPickerModalOpen: (open: boolean) => void;
  pickerModalOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarOpen: boolean;
  setAuditLogCollapsed: (collapsed: boolean) => void;
  auditLogCollapsed: boolean;
  setAuditLogWidth: (width: number) => void;
  auditLogWidth: number;
  flaggedWrongSpans: Record<string, boolean>;
  toggleFlagWrong: (spanId: string) => void;

  spanAction: (
    spanId: string,
    action: "accepted" | "rejected" | "modified" | "undone" | "applied_to_all",
    modifiedText?: string
  ) => Promise<void>;

  clearError: () => void;
  reset: () => void;

  // Gemini stats
  geminiUsage: {
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    failedRequests: number;
  };
  recordGeminiCall: (inputTokens: number, outputTokens: number, success: boolean) => void;
}

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set, get) => ({
      currentDocument: null,
      initialRedactedText: null,
      isLoading: false,
      error: null,
      selectedSpanId: null,
      hoveredSpanId: null,
      threshold: 0.6,
      sidebarWidth: 440,
      worriedMode: false,
      darkMode: false,
      pickerModalOpen: false,
      sidebarOpen: false,
      auditLogCollapsed: false,
      auditLogWidth: 280,
      flaggedWrongSpans: {},
      sessionDocuments: [],
      geminiUsage: {
        totalRequests: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        failedRequests: 0,
      },

      recordGeminiCall: (inputTokens, outputTokens, success) => {
        set((state) => ({
          geminiUsage: {
            totalRequests: state.geminiUsage.totalRequests + 1,
            totalInputTokens: state.geminiUsage.totalInputTokens + inputTokens,
            totalOutputTokens: state.geminiUsage.totalOutputTokens + outputTokens,
            failedRequests: state.geminiUsage.failedRequests + (success ? 0 : 1),
          },
        }));
      },

      loadSampleDocument: async (sampleId: string) => {
        set({ isLoading: true, error: null, selectedSpanId: null });
        try {
          const doc = await api.intake({ sampleId });
          set((state) => ({
            currentDocument: doc,
            initialRedactedText: doc.redactedText,
            isLoading: false,
            pickerModalOpen: false, // Close modal on load
            sessionDocuments: [
              ...state.sessionDocuments.filter(
                (d) => d.documentId !== doc.documentId
              ),
              {
                documentId: doc.documentId,
                title: doc.title,
                analyzedAt: doc.analyzedAt,
              },
            ],
          }));
        } catch (err: any) {
          set({ isLoading: false, error: err.message });
        }
      },

      loadPastedText: async (text: string) => {
        set({ isLoading: true, error: null, selectedSpanId: null });
        try {
          const doc = await api.intake({ text });
          set((state) => ({
            currentDocument: doc,
            initialRedactedText: doc.redactedText,
            isLoading: false,
            pickerModalOpen: false, // Close modal on load
            sessionDocuments: [
              ...state.sessionDocuments.filter(
                (d) => d.documentId !== doc.documentId
              ),
              {
                documentId: doc.documentId,
                title: doc.title,
                analyzedAt: doc.analyzedAt,
              },
            ],
          }));
        } catch (err: any) {
          set({ isLoading: false, error: err.message });
        }
      },

      loadFile: async (file: File) => {
        set({ isLoading: true, error: null, selectedSpanId: null });
        try {
          const doc = await api.intakeFile(file);
          set((state) => ({
            currentDocument: doc,
            initialRedactedText: doc.redactedText,
            isLoading: false,
            pickerModalOpen: false, // Close modal on load
            sessionDocuments: [
              ...state.sessionDocuments.filter(
                (d) => d.documentId !== doc.documentId
              ),
              {
                documentId: doc.documentId,
                title: doc.title,
                analyzedAt: doc.analyzedAt,
              },
            ],
          }));
        } catch (err: any) {
          set({ isLoading: false, error: err.message });
        }
      },

      refreshDocument: async (documentId?: string) => {
        const id = documentId || get().currentDocument?.documentId;
        if (!id) return;
        set({ isLoading: true, error: null });
        try {
          const updated = await api.getDocument(id);
          set({
            currentDocument: updated,
            initialRedactedText: updated.redactedText,
            isLoading: false,
          });
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },

      selectSpan: (spanId) => set({ selectedSpanId: spanId }),
      hoverSpan: (spanId) => set({ hoveredSpanId: spanId }),

      setThreshold: (threshold) => set({ threshold }),
      setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
      toggleWorriedMode: () =>
        set((state) => ({ worriedMode: !state.worriedMode })),
      toggleDarkMode: () =>
        set((state) => ({ darkMode: !state.darkMode })),
      setPickerModalOpen: (pickerModalOpen) => set({ pickerModalOpen }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setAuditLogCollapsed: (auditLogCollapsed) => set({ auditLogCollapsed }),
      setAuditLogWidth: (auditLogWidth) => set({ auditLogWidth }),
      toggleFlagWrong: (spanId) =>
        set((state) => ({
          flaggedWrongSpans: {
            ...state.flaggedWrongSpans,
            [spanId]: !state.flaggedWrongSpans[spanId],
          },
        })),

      spanAction: async (spanId, action, modifiedText) => {
        const doc = get().currentDocument;
        if (!doc) return;

        try {
          const updated = await api.spanAction(spanId, {
            documentId: doc.documentId,
            action,
            modifiedText,
          });
          set({ currentDocument: updated });
        } catch (err: any) {
          set({ error: err.message });
        }
      },

      clearError: () => set({ error: null }),
      reset: () =>
        set({
          currentDocument: null,
          initialRedactedText: null,
          selectedSpanId: null,
          hoveredSpanId: null,
          error: null,
        }),
    }),
    {
      name: "conseal-trust-console",
      partialize: (state) => ({
        threshold: state.threshold,
        sidebarWidth: state.sidebarWidth,
        worriedMode: state.worriedMode,
        darkMode: state.darkMode,
        sessionDocuments: state.sessionDocuments,
        initialRedactedText: state.initialRedactedText,
        geminiUsage: state.geminiUsage,
      }),
    }
  )
);
