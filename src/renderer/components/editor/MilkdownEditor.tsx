import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Crepe } from '@milkdown/crepe';
import { uploadConfig } from '@milkdown/kit/plugin/upload';
import {
  createCodeBlockCommand,
  insertImageCommand,
  toggleEmphasisCommand,
  toggleStrongCommand,
  wrapInBulletListCommand,
  wrapInHeadingCommand,
  wrapInOrderedListCommand,
} from '@milkdown/kit/preset/commonmark';
import { callCommand, replaceAll } from '@milkdown/kit/utils';

interface MilkdownEditorProps {
  documentPath?: string;
  value: string;
  onChange: (markdown: string) => void;
}

export interface MilkdownEditorHandle {
  insertMermaid: () => void;
  insertImage: (assetPath: string, alt: string) => void;
  runToolbarAction: (
    action: 'bold' | 'italic' | 'heading' | 'bulletList' | 'orderedList',
  ) => void;
}

const buildMermaidSnippet = (current: string) => {
  const suffix = current.endsWith('\n') ? '' : '\n';
  return `${current}${suffix}\n\`\`\`mermaid\ngraph TD\n  A[Start] --> B[Finish]\n\`\`\`\n`;
};

export const MilkdownEditor = forwardRef<MilkdownEditorHandle, MilkdownEditorProps>(
  ({ documentPath, value, onChange }, ref) => {
    const { t } = useTranslation();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const editorRef = useRef<Crepe | null>(null);
    const latestValueRef = useRef(value);
    const latestOnChange = useRef(onChange);

    latestOnChange.current = onChange;
    latestValueRef.current = value;

    const featureConfigs = useMemo(
      () => ({
        [Crepe.Feature.Placeholder]: {
          text: t('editor.placeholder'),
          mode: 'doc' as const,
        },
        [Crepe.Feature.BlockEdit]: {
          textGroup: {
            label: 'Text',
            text: { label: 'Text', icon: 'text' },
            h1: { label: 'H1', icon: 'h1' },
            h2: { label: 'H2', icon: 'h2' },
            h3: { label: 'H3', icon: 'h3' },
            h4: { label: 'H4', icon: 'h4' },
            h5: { label: 'H5', icon: 'h5' },
            h6: { label: 'H6', icon: 'h6' },
            quote: { label: 'Quote', icon: 'quote' },
            divider: { label: 'Divider', icon: 'minus' },
          },
          listGroup: {
            label: 'List',
            bulletList: { label: 'Bullet list', icon: 'list' },
            orderedList: { label: 'Ordered list', icon: 'listOrdered' },
            taskList: null,
          },
          advancedGroup: {
            label: 'Insert',
            image: { label: 'Image', icon: 'image' },
            codeBlock: { label: 'Code block', icon: 'code' },
            table: null,
            math: null,
          },
        },
      }),
      [t],
    );

    useEffect(() => {
      if (!containerRef.current) {
        return;
      }

      const editor = new Crepe({
        root: containerRef.current,
        defaultValue: value,
        features: {
          [Crepe.Feature.BlockEdit]: true,
          [Crepe.Feature.Placeholder]: true,
          [Crepe.Feature.Toolbar]: false,
          [Crepe.Feature.TopBar]: false,
          [Crepe.Feature.Table]: false,
          [Crepe.Feature.Latex]: false,
        },
        featureConfigs,
      });

      editor.editor.config((ctx) => {
        ctx.update(uploadConfig.key, (previous) => ({
          ...previous,
          uploader: async (files, schema) => {
            if (!documentPath) {
              return [];
            }

            const nodeType = schema.nodes.image;
            const createdNodes = await Promise.all(
              Array.from(files).map(async (file) => {
                if (!file.type.startsWith('image/')) {
                  return null;
                }

                const bytes = Array.from(new Uint8Array(await file.arrayBuffer()));
                const result = await window.milkySea.assets.saveImage({
                  documentPath,
                  bytes,
                  fileName: file.name,
                  mimeType: file.type,
                });

                return nodeType.createAndFill({
                  src: result.asset.path,
                  alt: file.name,
                  title: file.name,
                });
              }),
            );

            return createdNodes.filter(
              (node): node is NonNullable<typeof node> => Boolean(node),
            );
          },
        }));
      });

      editor.on((listener) => {
        listener.markdownUpdated((_ctx, markdown) => {
          latestValueRef.current = markdown;
          latestOnChange.current(markdown);
        });
      });

      void editor.create();
      editorRef.current = editor;

      return () => {
        editorRef.current = null;
        void editor.destroy();
      };
    }, [documentPath, featureConfigs, value]);

    useEffect(() => {
      const editor = editorRef.current?.editor;
      if (!editor) {
        return;
      }

      const currentMarkdown = editorRef.current?.getMarkdown() ?? '';
      if (currentMarkdown === value) {
        return;
      }

      editor.action(replaceAll(value, true));
    }, [value]);

    useImperativeHandle(ref, () => ({
      insertMermaid: () => {
        const editor = editorRef.current?.editor;
        const current = editorRef.current?.getMarkdown() ?? latestValueRef.current;
        if (!editor) {
          latestOnChange.current(buildMermaidSnippet(current));
          return;
        }

        editor.action(replaceAll(buildMermaidSnippet(current), true));
        editor.action(callCommand(createCodeBlockCommand.key, 'mermaid'));
      },
      insertImage: (assetPath, alt) => {
        const editor = editorRef.current?.editor;
        if (!editor) {
          return;
        }

        editor.action(
          callCommand(insertImageCommand.key, {
            src: assetPath,
            alt,
            title: alt,
          }),
        );
      },
      runToolbarAction: (action) => {
        const editor = editorRef.current?.editor;
        if (!editor) {
          return;
        }

        switch (action) {
          case 'bold':
            editor.action(callCommand(toggleStrongCommand.key));
            break;
          case 'italic':
            editor.action(callCommand(toggleEmphasisCommand.key));
            break;
          case 'heading':
            editor.action(callCommand(wrapInHeadingCommand.key, 2));
            break;
          case 'bulletList':
            editor.action(callCommand(wrapInBulletListCommand.key));
            break;
          case 'orderedList':
            editor.action(callCommand(wrapInOrderedListCommand.key));
            break;
          default:
            break;
        }
      },
    }));

    return <div className="milkdown-editor" ref={containerRef} />;
  },
);

MilkdownEditor.displayName = 'MilkdownEditor';
