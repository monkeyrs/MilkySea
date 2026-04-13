import { unified } from 'unified';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';

import { extractMermaidBlocks } from './diagram.js';
import type { DiagramModel } from '../types/diagram';

export interface DocumentAstBlockExport {
  type: string;
  text?: string;
  language?: string;
  url?: string;
  alt?: string;
  diagram?: DiagramModel;
}

export interface DocumentAstExport {
  path: string;
  markdown: string;
  blocks: DocumentAstBlockExport[];
}

export const extractImagePaths = (markdown: string) => {
  const imagePaths = new Set<string>();
  const imageRegex = /!\[[^\]]*]\(([^)]+)\)/g;

  for (const match of markdown.matchAll(imageRegex)) {
    if (match[1]) {
      imagePaths.add(match[1]);
    }
  }

  return Array.from(imagePaths.values());
};

export const buildDocumentAstExport = (
  path: string,
  markdown: string,
): DocumentAstExport => {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown);
  const mermaidBlocks = extractMermaidBlocks(markdown);
  let mermaidIndex = 0;
  const blocks: DocumentAstBlockExport[] = [];

  visit(tree, (node: any) => {
    if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'blockquote') {
      const text =
        node.children
          ?.map((child: any) => {
            if (child.type === 'text') {
              return child.value;
            }
            if (child.type === 'inlineCode') {
              return child.value;
            }
            if (child.type === 'image') {
              blocks.push({
                type: 'image',
                url: child.url,
                alt: child.alt,
              });
              return '';
            }
            return '';
          })
          .join('')
          .trim() ?? '';

      if (text) {
        blocks.push({
          type: node.type,
          text,
        });
      }
    }

    if (node.type === 'list') {
      blocks.push({
        type: 'list',
      });
    }

    if (node.type === 'code') {
      if (node.lang === 'mermaid') {
        const diagram = mermaidBlocks[mermaidIndex]?.diagram;
        mermaidIndex += 1;
        blocks.push({
          type: 'mermaid',
          language: 'mermaid',
          text: node.value,
          diagram,
        });
      } else {
        blocks.push({
          type: 'code',
          language: node.lang ?? 'plain',
          text: node.value,
        });
      }
    }
  });

  return {
    path,
    markdown,
    blocks,
  };
};
