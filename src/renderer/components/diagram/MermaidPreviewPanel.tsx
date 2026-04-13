import { useDeferredValue, useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import mermaid from 'mermaid';

import { extractMermaidBlocks } from '../../../shared/utils/diagram';

let mermaidReady = false;

const ensureMermaid = () => {
  if (mermaidReady) {
    return;
  }

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
  });
  mermaidReady = true;
};

const MermaidCard = ({
  code,
  onOpen,
}: {
  code: string;
  onOpen: () => void;
}) => {
  const { t } = useTranslation();
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const renderId = useId().replace(/:/g, '');

  useEffect(() => {
    ensureMermaid();
    let disposed = false;

    const run = async () => {
      try {
        const result = await mermaid.render(`mermaid-${renderId}`, code);
        if (!disposed) {
          setSvg(result.svg);
          setError('');
        }
      } catch (renderError) {
        if (!disposed) {
          setSvg('');
          setError(renderError instanceof Error ? renderError.message : 'Unknown error');
        }
      }
    };

    void run();

    return () => {
      disposed = true;
    };
  }, [code, renderId]);

  return (
    <article className="mermaid-card" onDoubleClick={onOpen}>
      <div className="mermaid-card__toolbar">
        <button onClick={onOpen} type="button">
          {t('preview.openButton')}
        </button>
      </div>
      {error ? (
        <div className="mermaid-card__error">
          <strong>{t('preview.renderError')}</strong>
          <p>{error}</p>
        </div>
      ) : (
        <div
          className="mermaid-card__canvas"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
    </article>
  );
};

interface MermaidPreviewPanelProps {
  markdown: string;
  onOpenDiagram: (index: number) => void;
}

export const MermaidPreviewPanel = ({
  markdown,
  onOpenDiagram,
}: MermaidPreviewPanelProps) => {
  const { t } = useTranslation();
  const deferredMarkdown = useDeferredValue(markdown);
  const blocks = useMemo(() => extractMermaidBlocks(deferredMarkdown), [deferredMarkdown]);

  return (
    <section className="mermaid-preview">
      <div className="mermaid-preview__header">
        <h2>{t('preview.title')}</h2>
        <p>{t('preview.openHint')}</p>
      </div>
      {blocks.length === 0 ? (
        <p className="mermaid-preview__empty">{t('preview.empty')}</p>
      ) : (
        <div className="mermaid-preview__list">
          {blocks.map((block) => (
            <MermaidCard
              code={block.code}
              key={block.id}
              onOpen={() => onOpenDiagram(block.index)}
            />
          ))}
        </div>
      )}
    </section>
  );
};
