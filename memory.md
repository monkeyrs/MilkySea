# 项目声明

- `memory.md` 是 MilkySea 项目的唯一交接真源。任何 AI 接手前必须完整通读本文档，再开始分析、编码或验证。
- 新 AI 接手时，必须先更新“当前状态”；完成任一步骤后，必须同步更新“里程碑看板”和“执行日志”。
- 项目默认目标是先交付 Windows 可运行 MVP，再补齐多端构建与发布链路；如目标发生变化，必须先更新本文档再执行。
- 所有页面文案必须通过 i18n 资源管理，不允许在页面组件中硬编码最终用户可见文案。
- 所有文本文件、前后端通信与 JSON 持久化统一使用 UTF-8 无 BOM，避免中文乱码链路问题。

# 目标与非目标

## 目标

- 基于 `Electron + React + TypeScript + Vite + electron-builder + Milkdown + tldraw + Mermaid` 构建桌面 Markdown IDE。
- 支持工作区文件夹模式、Markdown WYSIWYG 编辑、Mermaid 基础 flowchart 可视化编辑、图片自动落盘到 `assets/`。
- 所有文档本地保存为 Markdown，保证 Git friendly 与 AI friendly。
- 提供 AST JSON 和 Diagram JSON 导出能力。
- 建立可持续交接机制，让多个 AI 能基于同一份项目真源连续推进。

## 非目标

- 不实现完整 Notion block system。
- 不实现多人协作。
- 不实现云同步。
- 不追求 Mermaid 100% 可逆解析。
- 第一发布版不包含代码签名、自动更新、macOS notarization。

# 冻结决策

- 包管理器固定使用 `npm`。
- 渲染层框架固定使用 `React + TypeScript`。
- 桌面壳固定使用 `Electron`，构建与打包固定使用 `Vite + electron-builder`。
- 编辑器核心固定使用 `Milkdown`；当前实现采用 `@milkdown/crepe` 作为 React 中的落地载体。
- 图编辑器固定使用 `tldraw`。
- Mermaid v1 范围固定为基础 `flowchart`，支持 `graph TD/LR`、基础节点、边。
- 工作模式固定为工作区文件夹模式；文档唯一真源是 Markdown，图序列化真源是 Mermaid。
- 页面文案默认中文，预置英文资源骨架。
- 所有后端架构调整必须同步更新根目录 `scripts/dev.ps1` 与 `scripts/restart.ps1`。
- 当前发布入口固定为 `package.json -> main = dist-electron/src/main/index.js`，因为可执行主进程产物目前由 `tsc -b` 输出在该路径。

# 里程碑看板

| 编号 | 名称 | 状态 | 说明 |
| --- | --- | --- | --- |
| M0 | 初始化与记忆机制 | done | `memory.md`、Git、基础目录、根脚本已建立 |
| M1 | MVP 脚手架 | done | Electron/React/Vite/TypeScript、i18n、CI、测试骨架已建立 |
| M2 | 工作区与文档服务 | done | 工作区打开、文档树、Markdown 读写、自动保存、恢复目录已实现 |
| M3 | 编辑器 MVP | done | Milkdown 编辑器、工具栏按钮、slash menu（Crepe block edit）已接入 |
| M4 | 图片系统 | done | 图片选择与粘贴上传已写入 `assets/` 并插入 Markdown |
| M5 | Mermaid 展示 | done | Mermaid block 检测、预览渲染、错误态与双击入口已实现 |
| M6 | 图编辑器 MVP | done | tldraw 弹层编辑、DiagramModel 与 Mermaid 转换已实现 |
| M7 | AI Friendly 导出与恢复 | done | AST/Diagram 导出、恢复草稿检测与清理能力已实现 |
| M8 | 首个多端发布版 | in_progress | Windows 本地安装包已产出；CI 三平台构建仍未实跑验证 |

# 接手声明

1. 新 AI 接手时，先核对当前分支、工作区状态、未完成步骤、阻塞项，再决定第一步动作。
2. 任一时刻只能有一个步骤标记为 `in_progress`；如果要切换进行中的步骤，必须在“执行日志”中注明原因。
3. 完成任务后必须记录：完成内容、涉及文件、验证结果、未解决问题、下一步建议。
4. 若修改后端架构，必须同步更新根目录 `scripts/dev.ps1`、`scripts/restart.ps1`，并在日志中注明。
5. 若新增或修改页面文案，必须同步更新 i18n 资源，不允许硬编码文案。
6. 若执行安全检查，必须把工具、结果、残留风险写入“执行日志”与“风险与阻塞”。
7. 若发现编码异常、乱码、BOM、路径穿越或 IPC 权限边界问题，优先修复并写入日志，再继续功能开发。

# 当前状态

- 当前负责人：Codex（GPT-5）
- 当前步骤：M8 首个多端发布版
- 最近完成：2026-04-12 16:47 生成包含“目录选择兜底 + 拖入 Markdown 自动定位工作区”修复的新发布目录 `release-dropfix/`
- 下一推荐动作：在 GitHub Actions 中实际运行新的 `dist` + artifact 上传流程，确认 Linux AppImage 与 macOS 未签名产物都能落地
- 相关命令/注意事项：
  - `npm run dev`
  - `npm run build`
  - `npm run test`
  - `npm run security`
  - `npm run dist`
  - 所有文本文件需保持 UTF-8 无 BOM
  - 目录中存在历史文件 `MilkySea build plan.md`，读取时曾出现乱码迹象，后续若处理该文件需单独验证编码

# 风险与阻塞

- `MilkySea build plan.md` 读取时曾出现乱码迹象，说明仓库外部输入文件可能存在编码不一致问题。
- 渲染层当前引入 `Milkdown + Mermaid + tldraw + KaTeX`，产物较大；`vite build` 已提示有大 chunk，后续可做按需拆分。
- `electron-builder` 的 Windows 打包已通过，但 CI 三平台构建仍未实跑，当前“多端发布版”还缺 Linux/macOS 产物验证。
- 当前发布链路依赖 `tsc -b` 产生主进程可执行入口；后续若优化打包链路，应统一 `dist-electron` 目录结构并确认 `main` 指向不再依赖 TypeScript 额外输出。

# 执行日志

## 2026-04-12 15:30 Asia/Shanghai | 执行者：高级开发者 | 步骤：M8 Bug 修复

- 摘要：修复三个生产包运行时问题：DevTools 弹窗、白屏不渲染、文件选择窗口无响应
- 根因：
  1. DevTools 弹窗 —— `openDevTools()` 缺少 `app.isPackaged` 守卫；已加守卫，打包后绝不弹出
  2. 白屏 —— `sandbox: true` 导致 preload 中 ipcRenderer 行为受限；渲染器路径未区分打包与非打包；改为 `sandbox: false` + `app.getAppPath()` 统一路径解析
  3. 文件选择失效 —— `registerIpcHandlers` 传入的是启动时固定的 `mainWindow` 引用，窗口重建后引用失效；改为传入 `() => mainWindow` getter，IPC 每次动态取最新窗口
- 涉及文件：`src/main/index.ts`、`src/main/ipc/register-ipc.ts`
- 验证：`npm run typecheck` ✅、`npm run build` ✅、`npm run dist` ✅（产出 `release/MilkySea Setup 0.1.0.exe`）
- 未解决：需用户安装新包验证三项修复实际表现
- 下一步建议：安装 `release/MilkySea Setup 0.1.0.exe`，依次测试：启动无 DevTools 窗口 → 内容正常渲染 → 文件夹选择按钮可弹出系统对话框

## 2026-04-11 12:45 Asia/Shanghai | 执行者：Codex | 步骤：M8

## 2026-04-11 12:55 Asia/Shanghai | 执行者：Codex | 步骤：M8

- 摘要：补充 `win.signAndEditExecutable=false` 后再次执行 `npm run dist`，Windows 本地安装包已成功产出。
- 涉及文件：`package.json`、`release/MilkySea Setup 0.1.0.exe`
- 验证：`npm run dist` 成功；产物位于 `release/MilkySea Setup 0.1.0.exe`
- 未解决问题：CI 三平台构建矩阵尚未实跑；Linux 与 macOS 产物仍未验证
- 下一步建议：在 CI 中执行 `npm run ci` + `npm run dist`，补齐 Linux AppImage 与 macOS 未签名包验证

## 2026-04-11 12:58 Asia/Shanghai | 执行者：Codex | 步骤：M8

- 摘要：将 secrets 扫描改为跨平台 Node 脚本，并把 GitHub Actions 更新为在三平台矩阵中执行 `npm run dist` 并上传 `release/**` 产物。
- 涉及文件：`package.json`、`.github/workflows/ci.yml`、`scripts/security-secrets.mjs`
- 验证：`npm run security`、`npm run test` 通过
- 未解决问题：新的 CI 产物链路尚未在线上 runner 实跑
- 下一步建议：推送到远端后观察三个 runner 的 artifact 结果，并按平台补充已知限制

## 2026-04-11 13:17 Asia/Shanghai | 执行者：Codex | 步骤：M8

- 摘要：修复 Electron 主进程 ESM 运行时问题，补齐 Node 侧相对导入的 `.js` 扩展名，并将 `__dirname` 替换为 `fileURLToPath(import.meta.url)` 推导出的目录路径。
- 涉及文件：`src/main/index.ts`、`src/main/ipc/register-ipc.ts`、`src/main/services/workspace-service.ts`、`src/shared/utils/markdown.ts`
- 验证：`npm run typecheck`、`npm run build` 通过；`npx electron .` 在启动窗口阶段未再报 `register-ipc` 或 `__dirname` 异常
- 未解决问题：仍需用户在 `scripts/dev.ps1` 的完整开发链路下复验前端热更新与窗口交互
- 下一步建议：重新执行 `powershell -ExecutionPolicy Bypass -File .\scripts\restart.ps1`，若仍有报错则继续按最新堆栈修复

## 2026-04-11 13:21 Asia/Shanghai | 执行者：Codex | 步骤：M8

- 摘要：重新执行发布流程，成功生成最新 Windows 安装包与 blockmap，确认本地 release 产物可交付。
- 涉及文件：`release/MilkySea Setup 0.1.0.exe`、`release/MilkySea Setup 0.1.0.exe.blockmap`、`release/builder-debug.yml`
- 验证：`npm run dist` 成功；`release/` 目录包含安装包、blockmap 与 `win-unpacked/`
- 未解决问题：CI 三平台 runner 仍未实跑；当前仍只有 Windows 本地产物经过本机验证
- 下一步建议：如需对外分发，可先使用当前 `.exe`；并在后续补跑 GitHub Actions 以完成 Linux/macOS 构建验证

## 2026-04-12 16:31 Asia/Shanghai | 执行者：Codex | 步骤：M8

- 摘要：针对打包版窗口白屏问题，补充 `file://` 场景可用的 CSP，加入渲染错误边界与首屏懒加载，并修复 i18n 文案乱码；由于旧 `release/win-unpacked` 被占用，改为输出到新的 `release-fixed/` 目录。
- 涉及文件：`index.html`、`src/renderer/main.tsx`、`src/renderer/App.tsx`、`src/renderer/components/system/RenderErrorBoundary.tsx`、`src/renderer/state/app-store.ts`、`src/renderer/i18n/locales/zh-CN.ts`、`src/renderer/i18n/locales/en-US.ts`、`src/renderer/styles/app.css`、`release-fixed/*`
- 验证：`npm run typecheck`、`npm run build` 通过；`npx electron-builder --config.directories.output=release-fixed` 成功；`release-fixed/` 已产出新的安装包与 `win-unpacked/`
- 未解决问题：仍需用户实际打开 `release-fixed/win-unpacked/MilkySea.exe` 或安装新版 `.exe`，确认白屏是否消失；旧 `release/` 目录仍存在文件占用
- 下一步建议：优先验证 `release-fixed` 产物；若仍异常，错误边界应会显示可见报错信息，继续把报错原文回传即可

## 2026-04-12 16:48 Asia/Shanghai | 执行者：Codex | 步骤：M8

- 摘要：为规避“打开工作区失败”，将打开工作区按钮改为前端目录选择器兜底，并新增拖入 Markdown 文件自动定位到所在文件夹后打开的交互；同时补全相关 i18n 文案并修复默认欢迎文档乱码。
- 涉及文件：`src/renderer/App.tsx`、`src/renderer/components/layout/WorkspaceSidebar.tsx`、`src/renderer/i18n/locales/zh-CN.ts`、`src/renderer/i18n/locales/en-US.ts`、`src/renderer/styles/app.css`、`src/shared/constants/defaults.ts`、`release-dropfix/*`
- 验证：`npm run typecheck`、`npm run build` 通过；`npx electron-builder --config.directories.output=release-dropfix` 成功；`release-dropfix/` 已产出新的安装包与 `win-unpacked/`
- 未解决问题：仍需用户实际验证目录选择器在本机是否能正常返回路径，以及拖入 `.md` 文件是否会自动打开对应工作区和文档
- 下一步建议：优先测试 `release-dropfix/win-unpacked/MilkySea.exe`；如果仍失败，请回传底部状态栏文字或新错误信息

## 2026-04-13 00:00 Asia/Shanghai | 执行者：Codex | 步骤：M8

- 摘要：移除前端隐藏文件输入的工作区选择方案，改为 Electron 原生“打开工作区文件夹”与“打开 Markdown 文件”两条入口；拖拽 `.md` 或文件夹时统一走主进程路径解析，并同步更新启动/重启脚本备注。
- 涉及文件：`src/shared/types/document.ts`、`src/shared/types/ipc.ts`、`src/shared/schemas/ipc.ts`、`src/preload/index.ts`、`src/main/ipc/register-ipc.ts`、`src/main/services/workspace-service.ts`、`src/renderer/App.tsx`、`src/renderer/i18n/locales/zh-CN.ts`、`src/renderer/i18n/locales/en-US.ts`、`scripts/dev.ps1`、`scripts/restart.ps1`、`release-nativepick/*`
- 验证：`npm run typecheck`、`npm run build` 通过；`npx electron-builder --config.directories.output=release-nativepick` 成功；`release-nativepick/` 已产出新的安装包与 `win-unpacked/`
- 未解决问题：仍需用户在本机验证原生文件夹选择、原生 Markdown 文件选择、拖拽 `.md` 打开三条路径是否全部恢复正常
- 下一步建议：优先测试 `release-nativepick/win-unpacked/MilkySea.exe`；若仍有问题，请回传按钮点击后的状态栏文字或任何弹窗/无响应现象

## 2026-04-11 12:45 Asia/Shanghai | 执行者：Codex | 步骤：M8

- 摘要：完成 Windows MVP 主体实现并进入发布验证；首次 `npm run dist` 因 `winCodeSign` 解压权限失败。
- 涉及文件：`package.json`、`vite.config.ts`、`src/main/**`、`src/preload/**`、`src/renderer/**`、`scripts/security-secrets.ps1`
- 验证：`npm run typecheck`、`npm run build`、`npm run test`、`npm run security` 通过；首次 `npm run dist` 失败
- 未解决问题：Windows 本地安装包当时尚未成功产出；CI 三平台构建矩阵尚未实跑验证
- 下一步建议：尝试关闭 Windows 可执行文件编辑步骤后重新打包

## 2026-04-11 12:30 Asia/Shanghai | 执行者：Codex | 步骤：M2-M7

- 摘要：实现工作区服务、Markdown 文档读写、恢复目录、Milkdown 编辑器、图片上传、Mermaid 预览、tldraw 图编辑器、AST/Diagram 导出。
- 涉及文件：`src/shared/**`、`src/main/**`、`src/preload/index.ts`、`src/renderer/**`
- 验证：`npm run typecheck`、`npm run build`
- 未解决问题：Windows 打包仍未验证；大 chunk 警告仍存在
- 下一步建议：补单测、安全扫描、打包验证并回写 memory

## 2026-04-11 12:20 Asia/Shanghai | 执行者：Codex | 步骤：M1

- 摘要：完成依赖安装、工程配置、根目录脚本、CI 骨架、Vitest/Playwright 基础配置。
- 涉及文件：`.editorconfig`、`.gitignore`、`package.json`、`tsconfig*.json`、`vite.config.ts`、`vitest.config.ts`、`playwright.config.ts`、`.github/workflows/ci.yml`、`scripts/*.ps1`
- 验证：依赖安装成功；基础配置文件落盘
- 未解决问题：源码实现尚未接入；安全扫描脚本需结合真实项目再验证
- 下一步建议：实现主进程、preload、工作区服务与编辑器 UI

## 2026-04-11 00:00 Asia/Shanghai | 执行者：Codex | 步骤：M0

- 摘要：创建 Git 仓库，建立项目目录框架，确认 `Node 24`、`npm 11`、`git` 可用，发现现有 `MilkySea build plan.md` 存在编码异常风险。
- 涉及文件：`.git/`、目录结构、[MilkySea build plan.md](C:\Users\monke\Desktop\MilkySea\MilkySea%20build%20plan.md)
- 验证：`git init`、`node -v`、`npm -v`、读取现有计划文件
- 未解决问题：项目配置、依赖、脚本、可运行工程尚未创建
- 下一步建议：完成根目录配置、脚本与基础工程搭建，随后更新 M0/M1 状态
