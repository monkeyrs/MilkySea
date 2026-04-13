# MilkySea MVP 实施计划（Electron + React + Milkdown + tldraw）

## Summary
- 从空仓库起步，建立单仓单应用 Electron 项目，技术栈固定为 `Electron + React + TypeScript + Vite + npm + electron-builder`。
- MVP 以“工作区文件夹”为核心：打开一个目录，管理多个 `.md` 文档、统一 `assets/` 目录、`.miml/metadata.json` 会话数据；文档内容唯一真源是 Markdown。
- 编辑体验以 WYSIWYG 为主，不提供源码编辑模式；Mermaid v1 仅支持 `flowchart` 基础能力（`graph TD/LR`、节点、边），双击 Mermaid block 打开 tldraw 画布编辑器。
- 图数据只持久化为 Mermaid 文本；再次打开图编辑器时从 Mermaid 解析成 `DiagramModel` 并用 `dagre` 自动布局，不额外保存节点坐标。
- 页面文案全部走 i18n，首发为中文默认并预置英文资源骨架；首轮交付以 Windows 本地可运行为先，同时预留 Win/macOS/Linux CI 打包链路。

## Implementation Changes
- 工程结构固定为 `src/main`、`src/preload`、`src/renderer`、`src/shared`、`scripts/`、`e2e/`；不拆 monorepo，避免 MVP 过度设计。
- `src/main` 负责窗口生命周期、文件系统访问、工作区扫描、自动保存、崩溃恢复、资产写入和导出命令；Renderer 不直接接触 Node API。
- `src/preload` 暴露类型化 IPC bridge，所有入参/出参用 `zod` 校验，路径统一做工作区边界校验，默认开启 `contextIsolation: true`、`sandbox: true`、`nodeIntegration: false`。
- `src/renderer` 使用 React 组织 UI：左侧基础文档树，中间 Milkdown 编辑区，右侧/弹层为 Mermaid Diagram Editor；状态管理使用 `zustand` 统一当前工作区、活动文档、保存状态、对话框状态。
- Milkdown 内实现 4 个插件：`Mermaid NodeView`、`Image Paste/Drop`、`Toolbar`、`Slash Menu`。所有按钮、菜单、错误文案都从 i18n key 读取。
- Mermaid block 以 fenced code block ` ```mermaid ` 为唯一存储格式；NodeView 负责 SVG 渲染、错误态展示、双击打开图编辑器、保存后替换当前 block 文本。
- Diagram Editor 基于 tldraw，仅支持基础节点/连线/删除/方向切换；进入时执行 `Mermaid -> DiagramModel -> dagre layout -> tldraw shapes`，保存时执行 `tldraw shapes -> DiagramModel -> Mermaid`。
- 图片插件拦截粘贴/拖拽图片，主进程将二进制写入 `./assets/<hash>_<timestamp>.<ext>`，随后在文档插入相对 Markdown 引用；文件和 JSON/Markdown 保存统一使用 UTF-8 无 BOM。
- Conversion 层使用 `unified`/`remark` 生成 AST 与 Markdown 序列化；MVP 提供两个命令：`导出当前文档 AST JSON`、`导出当前 Mermaid 图 Diagram JSON`。
- 自动保存采用 1 秒 debounce；崩溃恢复把未落盘内容保存在 `.miml/recovery/`，重启时提示恢复；`.miml/metadata.json` 只保存工作区会话信息，不保存图布局。
- 从第一版就创建根目录 `scripts/dev.ps1`、`scripts/restart.ps1`、`scripts/build.ps1`；后续凡是主进程、preload、文件服务架构调整，都同步更新这些脚本。
- 安全与合规按 CISSP 导向基线落地：Electron 安全配置、IPC 最小权限、路径穿越拦截、依赖审计、Secrets 扫描、基础日志与恢复策略，并在 CI 中跑安全检查。

## Public APIs And Types
- Preload API 固定为 `workspace.openDirectory`、`workspace.listDocuments`、`document.create`、`document.load`、`document.save`、`assets.saveImage`、`export.documentAst`、`export.diagramJson`、`recovery.loadDraft`、`recovery.clearDraft`。
- `DocumentRecord` 固定包含 `path`、`content`、`assets`、`updatedAt`；`assets` 仅记录相对路径与类型，不嵌入二进制。
- `DiagramModel` 在现有 PRD 基础上补充 `direction: 'TD' | 'LR'`；`nodes` 保持基础节点定义；`edges` 补充稳定 `id`，便于 tldraw 编辑与 JSON 导出。
- `DocumentAstExport` 固定输出文档路径、原始 Markdown、规范化 block 列表；Mermaid block 附带解析后的 `DiagramModel`，图片 block 附带相对资源路径。
- 工作区目录约定固定为：根目录 Markdown 文档、`assets/` 资源目录、`.miml/metadata.json` 会话文件、`.miml/recovery/` 崩溃恢复目录。

## Test Plan
- 单元测试覆盖 `DiagramModel <-> Mermaid` 转换、Markdown AST 导出、图片命名规则、相对路径解析、UTF-8 无 BOM 保存。
- 组件测试覆盖 Mermaid NodeView 渲染与错误态、双击打开图编辑器、工具栏插入 Mermaid、图片粘贴后文档内容更新、i18n 切换回退逻辑。
- 集成测试覆盖工作区打开、文档树切换、新建文档、自动保存、崩溃恢复、导出 AST JSON、导出 Diagram JSON。
- E2E 测试覆盖完整用户流：打开工作区、创建 Markdown、插入 Mermaid、双击编辑图、保存回 Markdown、粘贴图片落盘到 `assets/`、重启后恢复最近文档。
- 安全检查覆盖 IPC schema 校验失败、路径穿越输入、非法文件扩展名、依赖漏洞扫描、Secrets 扫描、Electron 安全配置断言。

## Assumptions And Defaults
- 当前工作区为空目录，且尚未初始化 Git；实现阶段会一并创建项目脚手架与 `.gitignore`，但不做内置 Git UI。
- 包管理器固定用 `npm`；Node 运行时按 `>=22 <25` 约束，兼容当前本机 `Node 24` 环境。
- 文档树的 MVP 范围仅包含浏览 `.md`、新建文档、切换文档；不包含全文搜索、重命名、移动、标签、云同步、多人协作。
- Mermaid 反向解析只承诺支持基础 `flowchart`；复杂样式、子图、其他图类型统一留到后续阶段。
- 跨平台策略为“Windows 本地先跑通，CI 产出 Linux AppImage 与未签名 macOS 包”；代码签名、macOS notarization、自动更新不进入 MVP。
