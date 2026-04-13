import { create } from 'zustand';

import type {
  DocumentRecord,
  DocumentSummary,
  WorkspaceSnapshot,
} from '../../shared/types/document';
import i18n from '../i18n';

export interface EditorDocumentState extends DocumentRecord {
  persistedContent: string;
}

interface AppStoreState {
  workspace: WorkspaceSnapshot | null;
  documents: DocumentSummary[];
  currentDocument: EditorDocumentState | null;
  selectedMermaidIndex: number | null;
  statusMessage: string;
  isBusy: boolean;
  setWorkspace: (workspace: WorkspaceSnapshot | null) => void;
  setDocuments: (documents: DocumentSummary[]) => void;
  setCurrentDocument: (document: DocumentRecord | null) => void;
  updateCurrentContent: (content: string) => void;
  markCurrentSaved: (document: DocumentRecord) => void;
  setStatusMessage: (message: string) => void;
  setBusy: (busy: boolean) => void;
  openDiagramEditor: (index: number) => void;
  closeDiagramEditor: () => void;
}

export const useAppStore = create<AppStoreState>((set) => ({
  workspace: null,
  documents: [],
  currentDocument: null,
  selectedMermaidIndex: null,
  statusMessage: i18n.t('status.ready'),
  isBusy: false,
  setWorkspace: (workspace) =>
    set({
      workspace,
      documents: workspace?.documents ?? [],
    }),
  setDocuments: (documents) => set({ documents }),
  setCurrentDocument: (document) =>
    set({
      currentDocument: document
        ? {
            ...document,
            persistedContent: document.content,
          }
        : null,
    }),
  updateCurrentContent: (content) =>
    set((state) => ({
      currentDocument: state.currentDocument
        ? {
            ...state.currentDocument,
            content,
          }
        : null,
    })),
  markCurrentSaved: (document) =>
    set(() => ({
      currentDocument: {
        ...document,
        persistedContent: document.content,
      },
    })),
  setStatusMessage: (statusMessage) => set({ statusMessage }),
  setBusy: (isBusy) => set({ isBusy }),
  openDiagramEditor: (selectedMermaidIndex) => set({ selectedMermaidIndex }),
  closeDiagramEditor: () => set({ selectedMermaidIndex: null }),
}));
