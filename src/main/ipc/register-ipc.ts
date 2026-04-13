import { ipcMain, type BrowserWindow } from 'electron';

import {
  createDocumentSchema,
  exportDiagramJsonSchema,
  exportDocumentAstSchema,
  listDocumentsSchema,
  loadDocumentSchema,
  openDirectorySchema,
  openFileSchema,
  recoverySchema,
  resolveWorkspacePathSchema,
  saveDocumentSchema,
  saveImageSchema,
} from '../../shared/schemas/ipc.js';
import {
  clearRecoveryDraft,
  createDocument,
  exportDiagramJson,
  exportDocumentAst,
  getWorkspaceSnapshot,
  loadDocument,
  loadRecoveryDraft,
  openWorkspaceDirectory,
  openWorkspaceFile,
  resolveWorkspaceTarget,
  saveDocument,
  saveImage,
} from '../services/workspace-service.js';

export const registerIpcHandlers = (getMainWindow: () => BrowserWindow | null) => {
  ipcMain.handle('workspace:openDirectory', async (_event, payload) => {
    const win = getMainWindow();
    if (!win) return null;
    const parsed = openDirectorySchema.parse(payload);
    return openWorkspaceDirectory(win, parsed?.suggestedPath);
  });

  ipcMain.handle('workspace:listDocuments', async (_event, payload) => {
    const parsed = listDocumentsSchema.parse(payload);
    return getWorkspaceSnapshot(parsed.rootPath);
  });

  ipcMain.handle('workspace:openFile', async (_event, payload) => {
    const win = getMainWindow();
    if (!win) return null;
    const parsed = openFileSchema.parse(payload);
    return openWorkspaceFile(win, parsed?.suggestedPath);
  });

  ipcMain.handle('workspace:resolvePath', async (_event, payload) => {
    const parsed = resolveWorkspacePathSchema.parse(payload);
    return resolveWorkspaceTarget(parsed.targetPath);
  });

  ipcMain.handle('document:create', async (_event, payload) => {
    const parsed = createDocumentSchema.parse(payload);
    return createDocument(parsed.rootPath, parsed.relativePath);
  });

  ipcMain.handle('document:load', async (_event, payload) => {
    const parsed = loadDocumentSchema.parse(payload);
    return loadDocument(parsed.path);
  });

  ipcMain.handle('document:save', async (_event, payload) => {
    const parsed = saveDocumentSchema.parse(payload);
    return saveDocument(parsed.path, parsed.content);
  });

  ipcMain.handle('assets:saveImage', async (_event, payload) => {
    const parsed = saveImageSchema.parse(payload);
    return saveImage(
      parsed.documentPath,
      parsed.bytes,
      parsed.fileName,
      parsed.mimeType,
    );
  });

  ipcMain.handle('export:documentAst', async (_event, payload) => {
    const win = getMainWindow();
    if (!win) return null;
    const parsed = exportDocumentAstSchema.parse(payload);
    return exportDocumentAst(win, parsed.documentPath);
  });

  ipcMain.handle('export:diagramJson', async (_event, payload) => {
    const win = getMainWindow();
    if (!win) return null;
    const parsed = exportDiagramJsonSchema.parse(payload);
    return exportDiagramJson(win, parsed.documentPath, parsed.blockIndex);
  });

  ipcMain.handle('recovery:loadDraft', async (_event, payload) => {
    const parsed = recoverySchema.parse(payload);
    return loadRecoveryDraft(parsed.documentPath);
  });

  ipcMain.handle('recovery:clearDraft', async (_event, payload) => {
    const parsed = recoverySchema.parse(payload);
    return clearRecoveryDraft(parsed.documentPath);
  });
};
