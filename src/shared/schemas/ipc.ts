import { z } from 'zod';

export const openDirectorySchema = z
  .object({
    suggestedPath: z.string().optional(),
  })
  .optional();

export const openFileSchema = z
  .object({
    suggestedPath: z.string().optional(),
  })
  .optional();

export const resolveWorkspacePathSchema = z.object({
  targetPath: z.string().min(1),
});

export const listDocumentsSchema = z.object({
  rootPath: z.string().min(1),
});

export const createDocumentSchema = z.object({
  rootPath: z.string().min(1),
  relativePath: z.string().min(1),
});

export const loadDocumentSchema = z.object({
  path: z.string().min(1),
});

export const saveDocumentSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
});

export const saveImageSchema = z.object({
  documentPath: z.string().min(1),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  bytes: z.array(z.number().int().min(0).max(255)),
});

export const exportDocumentAstSchema = z.object({
  documentPath: z.string().min(1),
});

export const exportDiagramJsonSchema = z.object({
  documentPath: z.string().min(1),
  blockIndex: z.number().int().min(0).optional(),
});

export const recoverySchema = z.object({
  documentPath: z.string().min(1),
});
