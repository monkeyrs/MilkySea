import dagre from 'dagre';

import type {
  DiagramDirection,
  DiagramEdge,
  DiagramModel,
  DiagramNode,
  MermaidBlockRecord,
} from '../types/diagram';

const DEFAULT_NODE_WIDTH = 176;
const DEFAULT_NODE_HEIGHT = 80;
const MERMAID_BLOCK_REGEX = /```mermaid\s*\r?\n([\s\S]*?)```/g;

const normalizeLabel = (label: string) => label.trim().replace(/\s+/g, ' ');

const sanitizeId = (raw: string) =>
  raw
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '') || `node_${Math.random().toString(36).slice(2, 8)}`;

const parseNodeToken = (token: string) => {
  const trimmed = token.trim();
  const labeled = trimmed.match(
    /^([A-Za-z0-9_-]+)\s*\[(?:"([^"]+)"|([^\]]+))\]\s*$/,
  );
  if (labeled) {
    return {
      id: sanitizeId(labeled[1]),
      label: normalizeLabel(labeled[2] ?? labeled[3] ?? labeled[1]),
    };
  }

  const plain = trimmed.match(/^([A-Za-z0-9_-]+)$/);
  if (plain) {
    return {
      id: sanitizeId(plain[1]),
      label: plain[1],
    };
  }

  return {
    id: sanitizeId(trimmed),
    label: trimmed,
  };
};

const parseDirection = (source: string): DiagramDirection => {
  const firstLine = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return 'TD';
  }

  const match = firstLine.match(/^(?:graph|flowchart)\s+(TD|LR)\b/i);
  return (match?.[1]?.toUpperCase() as DiagramDirection | undefined) ?? 'TD';
};

const ensureNode = (map: Map<string, DiagramNode>, id: string, label: string) => {
  if (!map.has(id)) {
    map.set(id, {
      id,
      label,
      type: 'default',
    });
  }

  const current = map.get(id);
  if (current && current.label === current.id && label !== current.id) {
    current.label = label;
  }
};

export const mermaidToDiagram = (source: string, id = 'diagram-1'): DiagramModel => {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('%%'));

  const direction = parseDirection(source);
  const nodes = new Map<string, DiagramNode>();
  const edges: DiagramEdge[] = [];

  for (const line of lines) {
    if (/^(graph|flowchart)\s+/i.test(line)) {
      continue;
    }

    const chain = line.split(/-->/).map((part) => part.trim());
    if (chain.length < 2) {
      const standalone = parseNodeToken(line);
      ensureNode(nodes, standalone.id, standalone.label);
      continue;
    }

    for (let index = 0; index < chain.length - 1; index += 1) {
      const from = parseNodeToken(chain[index]);
      const to = parseNodeToken(chain[index + 1]);

      ensureNode(nodes, from.id, from.label);
      ensureNode(nodes, to.id, to.label);

      edges.push({
        id: `edge-${edges.length + 1}`,
        from: from.id,
        to: to.id,
      });
    }
  }

  return {
    id,
    direction,
    nodes: Array.from(nodes.values()),
    edges,
  };
};

export const layoutDiagram = (model: DiagramModel): DiagramModel => {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({
    rankdir: model.direction,
    ranksep: 96,
    nodesep: 48,
    marginx: 16,
    marginy: 16,
  });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const node of model.nodes) {
    graph.setNode(node.id, {
      width: DEFAULT_NODE_WIDTH,
      height: DEFAULT_NODE_HEIGHT,
    });
  }

  for (const edge of model.edges) {
    graph.setEdge(edge.from, edge.to);
  }

  dagre.layout(graph);

  return {
    ...model,
    nodes: model.nodes.map((node) => {
      const position = graph.node(node.id);
      if (!position) {
        return node;
      }

      return {
        ...node,
        position: {
          x: position.x - DEFAULT_NODE_WIDTH / 2,
          y: position.y - DEFAULT_NODE_HEIGHT / 2,
        },
      };
    }),
  };
};

export const diagramToMermaid = (model: DiagramModel): string => {
  const lines = [`graph ${model.direction}`];
  const seen = new Set<string>();

  for (const node of model.nodes) {
    const label = normalizeLabel(node.label || node.id).replace(/"/g, '\\"');
    seen.add(node.id);
    lines.push(`  ${node.id}["${label}"]`);
  }

  for (const edge of model.edges) {
    if (!seen.has(edge.from)) {
      lines.push(`  ${edge.from}["${edge.from}"]`);
      seen.add(edge.from);
    }
    if (!seen.has(edge.to)) {
      lines.push(`  ${edge.to}["${edge.to}"]`);
      seen.add(edge.to);
    }
    lines.push(`  ${edge.from} --> ${edge.to}`);
  }

  return lines.join('\n');
};

export const extractMermaidBlocks = (markdown: string): MermaidBlockRecord[] => {
  const blocks: MermaidBlockRecord[] = [];

  for (const match of markdown.matchAll(MERMAID_BLOCK_REGEX)) {
    const fullMatch = match[0];
    const code = (match[1] ?? '').trim();
    const start = match.index ?? 0;
    const end = start + fullMatch.length;
    blocks.push({
      id: `mermaid-${blocks.length + 1}`,
      index: blocks.length,
      code,
      start,
      end,
      diagram: mermaidToDiagram(code, `diagram-${blocks.length + 1}`),
    });
  }

  return blocks;
};

export const replaceMermaidBlockAtIndex = (
  markdown: string,
  blockIndex: number,
  nextMermaid: string,
) => {
  const blocks = extractMermaidBlocks(markdown);
  const target = blocks[blockIndex];
  if (!target) {
    return markdown;
  }

  const replacement = `\`\`\`mermaid\n${nextMermaid.trim()}\n\`\`\``;
  return `${markdown.slice(0, target.start)}${replacement}${markdown.slice(target.end)}`;
};
