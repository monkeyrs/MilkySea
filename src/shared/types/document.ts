export type AssetType = 'image' | 'file';

export interface AssetRecord {
  id: string;
  path: string;
  type: AssetType;
  mimeType?: string;
}

export interface DocumentSummary {
  path: string;
  relativePath: string;
  updatedAt: string;
  hasRecoveryDraft: boolean;
}

export interface DocumentRecord extends DocumentSummary {
  content: string;
  assets: AssetRecord[];
}

export interface WorkspaceMetadata {
  version: 1;
  lastOpenedAt: string;
  recentDocuments: string[];
}

export interface WorkspaceSnapshot {
  rootPath: string;
  metadataPath: string;
  documents: DocumentSummary[];
}

export interface WorkspaceOpenResult {
  snapshot: WorkspaceSnapshot;
  documentPath?: string;
  sourcePath: string;
}

export interface RecoveryDraft {
  path: string;
  content: string;
  updatedAt: string;
}

export interface SaveImageResult {
  asset: AssetRecord;
}

export interface ExportResult<T> {
  outputPath?: string;
  payload: T;
}
