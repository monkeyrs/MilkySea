import {
  Suspense,
  lazy,
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { WorkspaceSidebar } from './components/layout/WorkspaceSidebar';
import { useAppStore } from './state/app-store';
import {
  extractMermaidBlocks,
  replaceMermaidBlockAtIndex,
} from '../shared/utils/diagram';
import type { MilkdownEditorHandle } from './components/editor/MilkdownEditor';
import type { WorkspaceSnapshot } from '../shared/types/document';

const MilkdownEditor = lazy(async () => {
  const module = await import('./components/editor/MilkdownEditor');
  return { default: module.MilkdownEditor };
});

const MermaidPreviewPanel = lazy(async () => {
  const module = await import('./components/diagram/MermaidPreviewPanel');
  return { default: module.MermaidPreviewPanel };
});

const DiagramEditorDialog = lazy(async () => {
  const module = await import('./components/diagram/DiagramEditorDialog');
  return { default: module.DiagramEditorDialog };
});

const saveTimeoutMs = 1000;
type ElectronFile = File & { path?: string };

export const App = () => {
  const { t } = useTranslation();
  const editorRef = useRef<MilkdownEditorHandle | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  const workspace = useAppStore((state) => state.workspace);
  const documents = useAppStore((state) => state.documents);
  const currentDocument = useAppStore((state) => state.currentDocument);
  const selectedMermaidIndex = useAppStore((state) => state.selectedMermaidIndex);
  const statusMessage = useAppStore((state) => state.statusMessage);
  const isBusy = useAppStore((state) => state.isBusy);
  const setWorkspace = useAppStore((state) => state.setWorkspace);
  const setDocuments = useAppStore((state) => state.setDocuments);
  const setCurrentDocument = useAppStore((state) => state.setCurrentDocument);
  const updateCurrentContent = useAppStore((state) => state.updateCurrentContent);
  const markCurrentSaved = useAppStore((state) => state.markCurrentSaved);
  const setStatusMessage = useAppStore((state) => state.setStatusMessage);
  const setBusy = useAppStore((state) => state.setBusy);
  const openDiagramEditor = useAppStore((state) => state.openDiagramEditor);
  const closeDiagramEditor = useAppStore((state) => state.closeDiagramEditor);

  const mermaidBlocks = useMemo(
    () => extractMermaidBlocks(currentDocument?.content ?? ''),
    [currentDocument?.content],
  );

  const activeMermaidBlock =
    selectedMermaidIndex !== null ? mermaidBlocks[selectedMermaidIndex] ?? null : null;

  const applyWorkspaceSnapshot = async (
    snapshot: WorkspaceSnapshot,
    documentPath?: string,
    resolvedFromDrop = false,
  ) => {
    startTransition(() => {
      setWorkspace(snapshot);
      setDocuments(snapshot.documents);
      setStatusMessage(
        resolvedFromDrop ? t('status.workspaceResolved') : t('status.workspaceOpened'),
      );
    });

    const nextDocumentPath = documentPath ?? snapshot.documents[0]?.path;
    if (nextDocumentPath) {
      await loadDocument(nextDocumentPath);
    }
  };

  const refreshWorkspace = async (rootPath: string) => {
    const snapshot = await window.milkySea.workspace.listDocuments({ rootPath });
    startTransition(() => {
      setWorkspace(snapshot);
      setDocuments(snapshot.documents);
    });
    return snapshot;
  };

  const loadDocument = async (documentPath: string) => {
    setStatusMessage(t('status.loadingDocument'));
    setBusy(true);

    try {
      const document = await window.milkySea.document.load({ path: documentPath });
      const draft = await window.milkySea.recovery.loadDraft({ documentPath });
      const nextDocument =
        draft && draft.content !== document.content && window.confirm(t('editor.recoveryPrompt'))
          ? {
              ...document,
              content: draft.content,
            }
          : document;

      if (draft && draft.content !== document.content) {
        setStatusMessage(t('editor.recoveryApplied'));
      }

      startTransition(() => {
        setCurrentDocument(nextDocument);
        setStatusMessage(t('status.documentLoaded'));
      });
    } finally {
      setBusy(false);
    }
  };

  const openWorkspace = async () => {
    setBusy(true);
    try {
      const snapshot = await window.milkySea.workspace.openDirectory();
      if (!snapshot) {
        return;
      }
      await applyWorkspaceSnapshot(snapshot);
    } catch {
      setStatusMessage(t('status.workspaceFailed'));
    } finally {
      setBusy(false);
    }
  };

  const openMarkdownFile = async () => {
    setBusy(true);
    try {
      const result = await window.milkySea.workspace.openFile();
      if (!result) {
        return;
      }
      await applyWorkspaceSnapshot(result.snapshot, result.documentPath);
    } catch {
      setStatusMessage(t('status.workspaceFailed'));
    } finally {
      setBusy(false);
    }
  };

  const createDocument = async () => {
    if (!workspace) {
      return;
    }

    const relativePath = window.prompt(t('sidebar.newDocumentPrompt'));
    if (!relativePath) {
      return;
    }

    setBusy(true);
    try {
      const document = await window.milkySea.document.create({
        rootPath: workspace.rootPath,
        relativePath,
      });
      const snapshot = await refreshWorkspace(workspace.rootPath);
      startTransition(() => {
        setWorkspace(snapshot);
        setCurrentDocument(document);
      });
    } finally {
      setBusy(false);
    }
  };

  const saveCurrentDocument = async () => {
    if (!currentDocument) {
      return;
    }

    setStatusMessage(t('status.saving'));
    try {
      const saved = await window.milkySea.document.save({
        path: currentDocument.path,
        content: currentDocument.content,
      });
      await refreshWorkspace(workspace?.rootPath ?? currentDocument.path);
      startTransition(() => {
        markCurrentSaved(saved);
        setStatusMessage(t('status.saved'));
      });
    } catch {
      setStatusMessage(t('status.saveFailed'));
    }
  };

  useEffect(() => {
    if (!currentDocument || currentDocument.content === currentDocument.persistedContent) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void saveCurrentDocument();
    }, saveTimeoutMs);

    return () => window.clearTimeout(timeout);
  }, [currentDocument?.content, currentDocument?.persistedContent]);

  const exportAst = async () => {
    if (!currentDocument) {
      return;
    }
    const result = await window.milkySea.export.documentAst({
      documentPath: currentDocument.path,
    });
    setStatusMessage(result.outputPath ? t('status.exportSuccess') : t('status.exportSkipped'));
  };

  const exportDiagram = async () => {
    if (!currentDocument) {
      return;
    }
    const result = await window.milkySea.export.diagramJson({
      documentPath: currentDocument.path,
      blockIndex: selectedMermaidIndex ?? 0,
    });
    if (!result) {
      setStatusMessage(t('status.noDiagram'));
      return;
    }
    setStatusMessage(result.outputPath ? t('status.exportSuccess') : t('status.exportSkipped'));
  };

  const handleImageSelection = async (file: File | null) => {
    if (!file || !currentDocument) {
      return;
    }

    const bytes = Array.from(new Uint8Array(await file.arrayBuffer()));
    const result = await window.milkySea.assets.saveImage({
      documentPath: currentDocument.path,
      bytes,
      fileName: file.name,
      mimeType: file.type,
    });
    editorRef.current?.insertImage(result.asset.path, file.name);
  };

  const openDroppedEntry = async (file: ElectronFile) => {
    const absolutePath = file.path;
    if (!absolutePath) {
      throw new Error('Missing dropped file path');
    }

    const result = await window.milkySea.workspace.resolvePath({
      targetPath: absolutePath,
    });
    await applyWorkspaceSnapshot(result.snapshot, result.documentPath, true);
  };

  return (
    <div
      className={`app-shell${isDraggingFiles ? ' app-shell--dragging' : ''}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDraggingFiles(true);
        setStatusMessage(t('status.dropToOpen'));
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        if (event.currentTarget === event.target) {
          setIsDraggingFiles(false);
          setStatusMessage(t('status.ready'));
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDraggingFiles(false);
        const file = event.dataTransfer.files[0] as ElectronFile | undefined;
        if (!file) {
          setStatusMessage(t('status.workspaceFailed'));
          return;
        }

        setBusy(true);
        void openDroppedEntry(file)
          .catch(() => {
            setStatusMessage(t('status.workspaceFailed'));
          })
          .finally(() => {
            setBusy(false);
          });
      }}
    >
      <header className="app-shell__header">
        <div className="app-shell__brand">
          <h1>{t('app.title')}</h1>
          <p>{t('app.subtitle')}</p>
        </div>
        <div className="app-shell__actions">
          <button onClick={openWorkspace} type="button">
            {t('actions.openWorkspace')}
          </button>
          <button onClick={openMarkdownFile} type="button">
            {t('actions.openFile')}
          </button>
          <button disabled={!workspace} onClick={createDocument} type="button">
            {t('actions.newDocument')}
          </button>
          <button
            disabled={!currentDocument}
            onClick={() => editorRef.current?.runToolbarAction('bold')}
            type="button"
          >
            B
          </button>
          <button
            disabled={!currentDocument}
            onClick={() => editorRef.current?.runToolbarAction('italic')}
            type="button"
          >
            I
          </button>
          <button
            disabled={!currentDocument}
            onClick={() => editorRef.current?.runToolbarAction('heading')}
            type="button"
          >
            H2
          </button>
          <button
            disabled={!currentDocument}
            onClick={() => editorRef.current?.runToolbarAction('bulletList')}
            type="button"
          >
            {t('actions.bulletList')}
          </button>
          <button
            disabled={!currentDocument}
            onClick={() => editorRef.current?.runToolbarAction('orderedList')}
            type="button"
          >
            {t('actions.orderedList')}
          </button>
          <button
            disabled={!currentDocument}
            onClick={() => editorRef.current?.insertMermaid()}
            type="button"
          >
            {t('actions.insertDiagram')}
          </button>
          <button
            disabled={!currentDocument}
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            {t('actions.insertImage')}
          </button>
          <button disabled={!currentDocument} onClick={exportAst} type="button">
            {t('actions.exportAst')}
          </button>
          <button disabled={!currentDocument} onClick={exportDiagram} type="button">
            {t('actions.exportDiagram')}
          </button>
          <button
            disabled={!currentDocument}
            onClick={() => void saveCurrentDocument()}
            type="button"
          >
            {t('actions.saveNow')}
          </button>
        </div>
      </header>

      <div className="app-shell__body">
        <WorkspaceSidebar
          currentPath={currentDocument?.path}
          documents={documents}
          onSelect={(documentPath) => {
            void loadDocument(documentPath);
          }}
        />

        {!currentDocument ? (
          <main className="empty-state">
            <h2>{t('empty.title')}</h2>
            <p>{t('empty.body')}</p>
          </main>
        ) : (
          <main className="workspace-content">
            <section className="editor-panel">
              <div className="editor-panel__meta">
                <strong>{currentDocument.relativePath}</strong>
                <span>{statusMessage}</span>
              </div>
              <Suspense fallback={<div className="panel-loading">{t('editor.loading')}</div>}>
                <MilkdownEditor
                  documentPath={currentDocument.path}
                  key={currentDocument.path}
                  onChange={updateCurrentContent}
                  ref={editorRef}
                  value={currentDocument.content}
                />
              </Suspense>
            </section>
            <Suspense fallback={<div className="panel-loading">{t('preview.loading')}</div>}>
              <MermaidPreviewPanel
                markdown={currentDocument.content}
                onOpenDiagram={openDiagramEditor}
              />
            </Suspense>
          </main>
        )}
      </div>

      <footer className="app-shell__status">
        <span>{isBusy ? t('status.loadingDocument') : statusMessage}</span>
      </footer>

      <input
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          void handleImageSelection(file);
          event.currentTarget.value = '';
        }}
        ref={fileInputRef}
        type="file"
      />
      {isDraggingFiles ? (
        <div className="dropzone-overlay">
          <div className="dropzone-overlay__card">
            <h2>{t('dropzone.title')}</h2>
            <p>{t('dropzone.body')}</p>
          </div>
        </div>
      ) : null}

      <Suspense fallback={<div className="dialog-loading">{t('diagram.loading')}</div>}>
        <DiagramEditorDialog
          diagram={activeMermaidBlock?.diagram ?? null}
          isOpen={selectedMermaidIndex !== null}
          onClose={closeDiagramEditor}
          onSave={(nextMermaid) => {
            if (!currentDocument || selectedMermaidIndex === null) {
              return;
            }
            const nextMarkdown = replaceMermaidBlockAtIndex(
              currentDocument.content,
              selectedMermaidIndex,
              nextMermaid,
            );
            updateCurrentContent(nextMarkdown);
            setStatusMessage(t('status.diagramSaved'));
            closeDiagramEditor();
          }}
        />
      </Suspense>
    </div>
  );
};
