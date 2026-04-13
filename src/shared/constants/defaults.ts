export const APP_NAME = 'MilkySea';

export const DEFAULT_DOCUMENT_NAME = 'welcome.md';

export const DEFAULT_DOCUMENT_CONTENT = `# MilkySea

欢迎来到 MilkySea。
- 这是一个基于 Markdown 的桌面 IDE。
- 页面文案已经接入 i18n。
- 图片会自动保存到工作区的 \`assets/\` 目录。

\`\`\`mermaid
graph TD
  Start["打开工作区"] --> Edit["编辑 Markdown"]
  Edit --> Diagram["双击 Mermaid 预览"]
  Diagram --> Save["保存为 Mermaid 文本"]
\`\`\`
`;

export const WORKSPACE_DIRS = {
  assets: 'assets',
  metadataRoot: '.miml',
  metadataFile: '.miml/metadata.json',
  recoveryRoot: '.miml/recovery',
} as const;
