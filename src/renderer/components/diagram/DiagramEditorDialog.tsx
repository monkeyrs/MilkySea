import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Tldraw,
  createShapeId,
  renderPlaintextFromRichText,
  toRichText,
  type Editor,
  type TLArrowShape,
  type TLGeoShape,
} from 'tldraw';

import { diagramToMermaid, layoutDiagram } from '../../../shared/utils/diagram';
import type { DiagramDirection, DiagramModel } from '../../../shared/types/diagram';

interface DiagramEditorDialogProps {
  isOpen: boolean;
  diagram: DiagramModel | null;
  onClose: () => void;
  onSave: (nextMermaid: string) => void;
}

const NODE_WIDTH = 176;
const NODE_HEIGHT = 80;

const nearestNodeId = (
  point: { x: number; y: number },
  nodes: Array<{ id: string; center: { x: number; y: number } }>,
) => {
  let candidate: string | null = null;
  let distance = Number.POSITIVE_INFINITY;

  for (const node of nodes) {
    const nextDistance = Math.hypot(point.x - node.center.x, point.y - node.center.y);
    if (nextDistance < distance) {
      distance = nextDistance;
      candidate = node.id;
    }
  }

  return candidate;
};

const hydrateDiagram = (editor: Editor, diagram: DiagramModel) => {
  const shapes = editor.getCurrentPageShapes();
  if (shapes.length > 0) {
    editor.deleteShapes(shapes.map((shape) => shape.id));
  }

  const laidOut = layoutDiagram(diagram);
  const nodeShapes = laidOut.nodes.map((node) => ({
    id: createShapeId(node.id),
    type: 'geo',
    x: node.position?.x ?? 0,
    y: node.position?.y ?? 0,
    props: {
      geo: 'rectangle',
      w: NODE_WIDTH,
      h: NODE_HEIGHT,
      richText: toRichText(node.label),
    },
  }));

  const centers = new Map(
    laidOut.nodes.map((node) => [
      node.id,
      {
        x: (node.position?.x ?? 0) + NODE_WIDTH / 2,
        y: (node.position?.y ?? 0) + NODE_HEIGHT / 2,
      },
    ]),
  );

  const edgeShapes = laidOut.edges
    .map((edge) => {
      const from = centers.get(edge.from);
      const to = centers.get(edge.to);
      if (!from || !to) {
        return null;
      }

      return {
        id: createShapeId(edge.id),
        type: 'arrow',
        x: 0,
        y: 0,
        props: {
          start: from,
          end: to,
          bend: 0,
          richText: toRichText(''),
        },
      };
    })
    .filter(Boolean);

  editor.createShapes([...nodeShapes, ...edgeShapes] as any);
  editor.zoomToFit();
};

const extractDiagram = (editor: Editor, direction: DiagramDirection): DiagramModel => {
  const shapes = editor.getCurrentPageShapes();
  const nodeShapes = shapes.filter((shape): shape is TLGeoShape => shape.type === 'geo');
  const arrowShapes = shapes.filter((shape): shape is TLArrowShape => shape.type === 'arrow');

  const nodes = nodeShapes.map((shape) => ({
    id: shape.id.replace(/^shape:/, ''),
    label: renderPlaintextFromRichText(editor, shape.props.richText).trim() || shape.id,
    type: 'default',
    position: {
      x: shape.x,
      y: shape.y,
    },
  }));

  const nodeCenters = nodes.map((node) => ({
    id: node.id,
    center: {
      x: (node.position?.x ?? 0) + NODE_WIDTH / 2,
      y: (node.position?.y ?? 0) + NODE_HEIGHT / 2,
    },
  }));

  const edges = arrowShapes
    .map((shape, index) => {
      const startPoint = {
        x: shape.x + shape.props.start.x,
        y: shape.y + shape.props.start.y,
      };
      const endPoint = {
        x: shape.x + shape.props.end.x,
        y: shape.y + shape.props.end.y,
      };
      const from = nearestNodeId(startPoint, nodeCenters);
      const to = nearestNodeId(endPoint, nodeCenters);

      if (!from || !to || from === to) {
        return null;
      }

      return {
        id: shape.id.replace(/^shape:/, '') || `edge-${index + 1}`,
        from,
        to,
      };
    })
    .filter((edge): edge is NonNullable<typeof edge> => Boolean(edge));

  return {
    id: 'diagram-editor',
    direction,
    nodes,
    edges,
  };
};

export const DiagramEditorDialog = ({
  isOpen,
  diagram,
  onClose,
  onSave,
}: DiagramEditorDialogProps) => {
  const { t } = useTranslation();
  const editorRef = useRef<Editor | null>(null);
  const [direction, setDirection] = useState<DiagramDirection>('TD');

  const hydratedDiagram = useMemo(() => {
    if (!diagram) {
      return null;
    }

    return {
      ...diagram,
      direction,
    };
  }, [diagram, direction]);

  useEffect(() => {
    if (diagram) {
      setDirection(diagram.direction);
    }
  }, [diagram]);

  useEffect(() => {
    if (isOpen && editorRef.current && hydratedDiagram) {
      hydrateDiagram(editorRef.current, hydratedDiagram);
    }
  }, [hydratedDiagram, isOpen]);

  if (!isOpen || !diagram) {
    return null;
  }

  return (
    <div className="diagram-dialog">
      <div className="diagram-dialog__scrim" onClick={onClose} />
      <div className="diagram-dialog__panel">
        <header className="diagram-dialog__header">
          <div>
            <h2>{t('diagram.title')}</h2>
            <p>{t('diagram.intro')}</p>
          </div>
          <div className="diagram-dialog__controls">
            <label>
              <span>{t('diagram.direction')}</span>
              <select
                onChange={(event) => setDirection(event.target.value as DiagramDirection)}
                value={direction}
              >
                <option value="TD">{t('diagram.directionTD')}</option>
                <option value="LR">{t('diagram.directionLR')}</option>
              </select>
            </label>
            <button onClick={onClose} type="button">
              {t('actions.close')}
            </button>
            <button
              onClick={() => {
                if (!editorRef.current) {
                  return;
                }
                const nextDiagram = extractDiagram(editorRef.current, direction);
                onSave(diagramToMermaid(nextDiagram));
              }}
              type="button"
            >
              {t('actions.saveDiagram')}
            </button>
          </div>
        </header>
        <div className="diagram-dialog__canvas">
          <Tldraw
            hideUi={false}
            onMount={(editor) => {
              editorRef.current = editor;
              hydrateDiagram(editor, hydratedDiagram ?? diagram);
            }}
            persistenceKey="milkysea-mermaid-diagram"
          />
        </div>
      </div>
    </div>
  );
};
