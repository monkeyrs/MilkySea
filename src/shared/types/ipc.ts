import type { ExportResult } from './document';
import type {
  DocumentRecord,
  RecoveryDraft,
  SaveImageResult,
  WorkspaceOpenResult,
  WorkspaceSnapshot,
} from './document';
import type { DiagramModel } from './diagram';
import type { DocumentAstExport } from '../utils/markdown';

export interface OpenDirectoryPayload {
  suggestedPath?: string;
}

export interface OpenFilePayload {
  suggestedPath?: string;
}

export interface ResolveWorkspacePathPayload {
  targetPath: string;
}

export interface ListDocumentsPayload {
  rootPath: string;
}

export interface CreateDocumentPayload {
  rootPath: string;
  relativePath: string;
}

export interface LoadDocumentPayload {
  path: string;
}

export interface SaveDocumentPayload {
  path: string;
  content: string;
}

export interface SaveImagePayload {
  documentPath: string;
  fileName?: string;
  mimeType?: string;
  bytes: number[];
}

export interface ExportDocumentAstPayload {
  documentPath: string;
}

export interface ExportDiagramJsonPayload {
  documentPath: string;
  blockIndex?: number;
}

export interface RecoveryPayload {
  documentPath: string;
}

export interface MilkySeaApi {
  workspace: {
    openDirectory: (
      payload?: OpenDirectoryPayload,
    ) => Promise<WorkspaceSnapshot | null>;
    openFile: (payload?: OpenFilePayload) => Promise<WorkspaceOpenResult | null>;
    resolvePath: (
      payload: ResolveWorkspacePathPayload,
    ) => Promise<WorkspaceOpenResult>;
    listDocuments: (payload: ListDocumentsPayload) => Promise<WorkspaceSnapshot>;
  };
  document: {
    create: (payload: CreateDocumentPayload) => Promise<DocumentRecord>;
    load: (payload: LoadDocumentPayload) => Promise<DocumentRecord>;
    save: (payload: SaveDocumentPayload) => Promise<DocumentRecord>;
  };
  assets: {
    saveImage: (payload: SaveImagePayload) => Promise<SaveImageResult>;
  };
  export: {
    documentAst: (
      payload: ExportDocumentAstPayload,
    ) => Promise<ExportResult<DocumentAstExport>>;
    diagramJson: (
      payload: ExportDiagramJsonPayload,
    ) => Promise<ExportResult<DiagramModel> | null>;
  };
  recovery: {
    loadDraft: (payload: RecoveryPayload) => Promise<RecoveryDraft | null>;
    clearDraft: (payload: RecoveryPayload) => Promise<boolean>;
  };
}
