import { describe, expect, it } from 'vitest';

import {
  diagramToMermaid,
  extractMermaidBlocks,
  mermaidToDiagram,
  replaceMermaidBlockAtIndex,
} from '../../src/shared/utils/diagram';

describe('diagram utilities', () => {
  it('parses simple Mermaid chains into a DiagramModel', () => {
    const model = mermaidToDiagram('graph TD\nA["Start"] --> B["Done"] --> C');

    expect(model.direction).toBe('TD');
    expect(model.nodes.map((node) => node.id)).toEqual(['A', 'B', 'C']);
    expect(model.edges).toEqual([
      { id: 'edge-1', from: 'A', to: 'B' },
      { id: 'edge-2', from: 'B', to: 'C' },
    ]);
  });

  it('replaces Mermaid blocks by index without touching other content', () => {
    const markdown = `# Title

\`\`\`mermaid
graph TD
  A --> B
\`\`\`

Text

\`\`\`mermaid
graph LR
  C --> D
\`\`\`
`;

    const nextMarkdown = replaceMermaidBlockAtIndex(
      markdown,
      1,
      diagramToMermaid({
        id: 'diagram-2',
        direction: 'LR',
        nodes: [
          { id: 'C', label: 'C', type: 'default' },
          { id: 'E', label: 'E', type: 'default' },
        ],
        edges: [{ id: 'edge-1', from: 'C', to: 'E' }],
      }),
    );

    const blocks = extractMermaidBlocks(nextMarkdown);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].code).toContain('A --> B');
    expect(blocks[1].code).toContain('C --> E');
  });
});
