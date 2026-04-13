import { describe, expect, it } from 'vitest';

import {
  buildDocumentAstExport,
  extractImagePaths,
} from '../../src/shared/utils/markdown';

describe('markdown utilities', () => {
  it('extracts image paths from markdown', () => {
    const images = extractImagePaths(`
![cover](./assets/cover.png)

![diagram](../assets/diagram.jpg)
`);

    expect(images).toEqual(['./assets/cover.png', '../assets/diagram.jpg']);
  });

  it('exports document blocks including mermaid diagrams', () => {
    const exported = buildDocumentAstExport(
      '/workspace/doc.md',
      `# MilkySea

Paragraph text.

![cover](./assets/cover.png)

\`\`\`mermaid
graph TD
  A --> B
\`\`\`
`,
    );

    expect(exported.blocks.some((block) => block.type === 'heading')).toBe(true);
    expect(exported.blocks.some((block) => block.type === 'image')).toBe(true);
    const mermaidBlock = exported.blocks.find((block) => block.type === 'mermaid');
    expect(mermaidBlock?.diagram?.edges).toHaveLength(1);
  });
});
