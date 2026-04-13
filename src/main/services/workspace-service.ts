import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { dialog, type BrowserWindow } from 'electron';

import {
  APP_NAME,
  DEFAULT_DOCUMENT_CONTENT,
  DEFAULT_DOCUMENT_NAME,
  WORKSPACE_DIRS,
} from '../../shared/constants/defaults.js';
import { extractMermaidBlocks } from '../../shared/utils/diagram.js';
import {
  buildDocumentAstExport,
  extractImagePaths,
} from '../../shared/utils/markdown.js';
import type {
  DocumentRecord,
  DocumentSummary,
  ExportResult,
  RecoveryDraft,
  SaveImageResult,
  WorkspaceMetadata,
  WorkspaceOpenResult,
  WorkspaceSnapshot,
} from '../../shared/types/document';
import type { DiagramModel } from '../../shared/types/diagram';

const IGNORED_DIRS = new Set([
  '.git',
  '.github',
  '.miml',
  'assets',
  'dist',
  'dist-electron',
  'node_modules',
  'release',
  'test-results',
]);

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
};

const normalizePath = (value: string) => value.replace(/\\/g, '/');

const ensureRelativeAssetPath = (fromFile: string, toFile: string) => {
  const relative = normalizePath(path.relative(path.dirname(fromFile), toFile));
  if (relative.startsWith('.')) {
    return relative;
  }
  return `./${relative}`;
};

const recoveryFileName = (documentPath: string, workspaceRoot: string) => {
  const relative = normalizePath(path.relative(workspaceRoot, documentPath));
  const safeName = Buffer.from(relative, 'utf8').toString('hex');
  return `${safeName}.md`;
};

const isInside = (rootPath: string, targetPath: string) => {
  const relative = path.relative(rootPath, targetPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const ensureInside = (rootPath: string, targetPath: string) => {
  if (!isInside(rootPath, targetPath)) {
    throw new Error(`Path escapes workspace boundary: ${targetPath}`);
  }
};

const ensureDirectory = async (targetPath: string) => {
  await fs.mkdir(targetPath, { recursive: true });
};

const readJson = async <T>(targetPath: string, fallback: T): Promise<T> => {
  try {
    const content = await fs.readFile(targetPath, 'utf8');
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
};

const writeUtf8File = async (targetPath: string, content: string) => {
  await ensureDirectory(path.dirname(targetPath));
  await fs.writeFile(targetPath, content, 'utf8');
};

const metadataPaths = (rootPath: string) => ({
  metadataRoot: path.join(rootPath, WORKSPACE_DIRS.metadataRoot),
  recoveryRoot: path.join(rootPath, WORKSPACE_DIRS.recoveryRoot),
  metadataFile: path.join(rootPath, WORKSPACE_DIRS.metadataFile),
  assetsRoot: path.join(rootPath, WORKSPACE_DIRS.assets),
});

const defaultMetadata = (): WorkspaceMetadata => ({
  version: 1,
  lastOpenedAt: new Date().toISOString(),
  recentDocuments: [],
});

const ensureWorkspaceStructure = async (rootPath: string) => {
  const paths = metadataPaths(rootPath);
  await ensureDirectory(paths.assetsRoot);
  await ensureDirectory(paths.metadataRoot);
  await ensureDirectory(paths.recoveryRoot);

  try {
    await fs.access(paths.metadataFile);
  } catch {
    await writeUtf8File(paths.metadataFile, JSON.stringify(defaultMetadata(), null, 2));
  }

  return paths;
};

const findWorkspaceRoot = async (documentPath: string) => {
  let current = path.extname(documentPath)
    ? path.dirname(documentPath)
    : documentPath;

  while (true) {
    const candidate = path.join(current, WORKSPACE_DIRS.metadataFile);
    try {
      await fs.access(candidate);
      return current;
    } catch {
      const parent = path.dirname(current);
      if (parent === current) {
        return path.extname(documentPath) ? path.dirname(documentPath) : documentPath;
      }
      current = parent;
    }
  }
};

const listMarkdownFiles = async (rootPath: string): Promise<string[]> => {
  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const targetPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) {
        continue;
      }

      files.push(...(await listMarkdownFiles(targetPath)));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      files.push(targetPath);
    }
  }

  return files;
};

const getRecoveryDraftPath = async (documentPath: string, workspaceRoot?: string) => {
  const rootPath = workspaceRoot ?? (await findWorkspaceRoot(documentPath));
  const { recoveryRoot } = metadataPaths(rootPath);
  return path.join(recoveryRoot, recoveryFileName(documentPath, rootPath));
};

const loadMetadata = async (rootPath: string) => {
  const { metadataFile } = metadataPaths(rootPath);
  return readJson<WorkspaceMetadata>(metadataFile, defaultMetadata());
};

const saveMetadata = async (rootPath: string, metadata: WorkspaceMetadata) => {
  const { metadataFile } = metadataPaths(rootPath);
  await writeUtf8File(metadataFile, JSON.stringify(metadata, null, 2));
};

const touchMetadata = async (rootPath: string, documentPath?: string) => {
  const metadata = await loadMetadata(rootPath);
  metadata.lastOpenedAt = new Date().toISOString();

  if (documentPath) {
    const relativePath = normalizePath(path.relative(rootPath, documentPath));
    metadata.recentDocuments = [
      relativePath,
      ...metadata.recentDocuments.filter((item) => item !== relativePath),
    ].slice(0, 20);
  }

  await saveMetadata(rootPath, metadata);
};

const toDocumentSummary = async (
  rootPath: string,
  documentPath: string,
): Promise<DocumentSummary> => {
  const stats = await fs.stat(documentPath);
  const draftPath = await getRecoveryDraftPath(documentPath, rootPath);

  let hasRecoveryDraft = false;
  try {
    await fs.access(draftPath);
    hasRecoveryDraft = true;
  } catch {
    hasRecoveryDraft = false;
  }

  return {
    path: documentPath,
    relativePath: normalizePath(path.relative(rootPath, documentPath)),
    updatedAt: stats.mtime.toISOString(),
    hasRecoveryDraft,
  };
};

const sortDocuments = (documents: DocumentSummary[]) =>
  [...documents].sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath, 'en'),
  );

const maybeCreateWelcomeDocument = async (rootPath: string) => {
  const files = await listMarkdownFiles(rootPath);
  if (files.length > 0) {
    return;
  }

  const welcomePath = path.join(rootPath, DEFAULT_DOCUMENT_NAME);
  await writeUtf8File(welcomePath, DEFAULT_DOCUMENT_CONTENT);
};

export const getWorkspaceSnapshot = async (rootPath: string): Promise<WorkspaceSnapshot> => {
  await ensureWorkspaceStructure(rootPath);
  await maybeCreateWelcomeDocument(rootPath);
  await touchMetadata(rootPath);

  const files = await listMarkdownFiles(rootPath);
  const documents = await Promise.all(files.map((file) => toDocumentSummary(rootPath, file)));

  return {
    rootPath,
    metadataPath: path.join(rootPath, WORKSPACE_DIRS.metadataFile),
    documents: sortDocuments(documents),
  };
};

export const openWorkspaceDirectory = async (
  mainWindow: BrowserWindow,
  suggestedPath?: string,
) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: `${APP_NAME} Workspace`,
    defaultPath: suggestedPath,
    properties: ['openDirectory', 'createDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return getWorkspaceSnapshot(result.filePaths[0]);
};

export const openWorkspaceFile = async (
  mainWindow: BrowserWindow,
  suggestedPath?: string,
): Promise<WorkspaceOpenResult | null> => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: `${APP_NAME} Markdown`,
    defaultPath: suggestedPath,
    properties: ['openFile'],
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return resolveWorkspaceTarget(result.filePaths[0]);
};

export const resolveWorkspaceTarget = async (
  targetPath: string,
): Promise<WorkspaceOpenResult> => {
  const stats = await fs.stat(targetPath);

  if (stats.isDirectory()) {
    const snapshot = await getWorkspaceSnapshot(targetPath);
    return {
      snapshot,
      documentPath: snapshot.documents[0]?.path,
      sourcePath: targetPath,
    };
  }

  const extension = path.extname(targetPath).toLowerCase();
  const workspaceRoot =
    extension === '.md' || extension === '.markdown'
      ? await findWorkspaceRoot(targetPath)
      : path.dirname(targetPath);
  const snapshot = await getWorkspaceSnapshot(workspaceRoot);

  return {
    snapshot,
    documentPath:
      extension === '.md' || extension === '.markdown'
        ? targetPath
        : snapshot.documents[0]?.path,
    sourcePath: targetPath,
  };
};

export const createDocument = async (
  rootPath: string,
  relativePath: string,
): Promise<DocumentRecord> => {
  await ensureWorkspaceStructure(rootPath);
  const normalizedRelative = relativePath.endsWith('.md')
    ? relativePath
    : `${relativePath}.md`;
  const targetPath = path.resolve(rootPath, normalizedRelative);
  ensureInside(rootPath, targetPath);

  await writeUtf8File(targetPath, '# Untitled\n');
  await touchMetadata(rootPath, targetPath);

  return loadDocument(targetPath);
};

export const loadDocument = async (documentPath: string): Promise<DocumentRecord> => {
  const workspaceRoot = await findWorkspaceRoot(documentPath);
  await ensureWorkspaceStructure(workspaceRoot);
  ensureInside(workspaceRoot, documentPath);
  await touchMetadata(workspaceRoot, documentPath);

  const [content, summary] = await Promise.all([
    fs.readFile(documentPath, 'utf8'),
    toDocumentSummary(workspaceRoot, documentPath),
  ]);

  return {
    ...summary,
    content,
    assets: extractImagePaths(content).map((assetPath) => ({
      id: randomUUID(),
      path: assetPath,
      type: 'image',
    })),
  };
};

export const saveDocument = async (
  documentPath: string,
  content: string,
): Promise<DocumentRecord> => {
  const workspaceRoot = await findWorkspaceRoot(documentPath);
  await ensureWorkspaceStructure(workspaceRoot);
  ensureInside(workspaceRoot, documentPath);

  const draftPath = await getRecoveryDraftPath(documentPath, workspaceRoot);
  await writeUtf8File(draftPath, content);
  await writeUtf8File(documentPath, content);
  await fs.rm(draftPath, { force: true });
  await touchMetadata(workspaceRoot, documentPath);

  return loadDocument(documentPath);
};

export const saveImage = async (
  documentPath: string,
  bytes: number[],
  fileName?: string,
  mimeType?: string,
): Promise<SaveImageResult> => {
  const workspaceRoot = await findWorkspaceRoot(documentPath);
  const { assetsRoot } = await ensureWorkspaceStructure(workspaceRoot);
  ensureInside(workspaceRoot, documentPath);

  const extension =
    path.extname(fileName ?? '') || MIME_TO_EXTENSION[mimeType ?? ''] || '.png';
  const hash = createHash('sha256')
    .update(Buffer.from(bytes))
    .digest('hex')
    .slice(0, 12);
  const assetName = `${hash}_${Date.now()}${extension}`;
  const assetPath = path.join(assetsRoot, assetName);
  const relativeAssetPath = ensureRelativeAssetPath(documentPath, assetPath);

  await fs.writeFile(assetPath, Buffer.from(bytes));

  return {
    asset: {
      id: randomUUID(),
      path: relativeAssetPath,
      type: 'image',
      mimeType,
    },
  };
};

export const loadRecoveryDraft = async (
  documentPath: string,
): Promise<RecoveryDraft | null> => {
  const workspaceRoot = await findWorkspaceRoot(documentPath);
  const draftPath = await getRecoveryDraftPath(documentPath, workspaceRoot);

  try {
    const [content, stats] = await Promise.all([
      fs.readFile(draftPath, 'utf8'),
      fs.stat(draftPath),
    ]);
    return {
      path: draftPath,
      content,
      updatedAt: stats.mtime.toISOString(),
    };
  } catch {
    return null;
  }
};

export const clearRecoveryDraft = async (documentPath: string) => {
  const workspaceRoot = await findWorkspaceRoot(documentPath);
  const draftPath = await getRecoveryDraftPath(documentPath, workspaceRoot);
  await fs.rm(draftPath, { force: true });
  return true;
};

const saveJsonExport = async <T>(
  mainWindow: BrowserWindow,
  documentPath: string,
  suffix: string,
  payload: T,
): Promise<ExportResult<T>> => {
  const fileName = path.basename(documentPath, '.md');
  const result = await dialog.showSaveDialog(mainWindow, {
    title: `${APP_NAME} Export`,
    defaultPath: path.join(path.dirname(documentPath), `${fileName}.${suffix}.json`),
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });

  if (!result.canceled && result.filePath) {
    await writeUtf8File(result.filePath, JSON.stringify(payload, null, 2));
    return {
      outputPath: result.filePath,
      payload,
    };
  }

  return {
    payload,
  };
};

export const exportDocumentAst = async (
  mainWindow: BrowserWindow,
  documentPath: string,
) => {
  const content = await fs.readFile(documentPath, 'utf8');
  const payload = buildDocumentAstExport(documentPath, content);
  return saveJsonExport(mainWindow, documentPath, 'ast', payload);
};

export const exportDiagramJson = async (
  mainWindow: BrowserWindow,
  documentPath: string,
  blockIndex = 0,
): Promise<ExportResult<DiagramModel> | null> => {
  const content = await fs.readFile(documentPath, 'utf8');
  const blocks = extractMermaidBlocks(content);
  const target = blocks[blockIndex];
  if (!target) {
    return null;
  }

  return saveJsonExport(mainWindow, documentPath, `diagram-${blockIndex + 1}`, target.diagram);
};
