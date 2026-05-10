# Prism 领域语境

Prism 是一个 Markdown 桌面编辑器（Tauri 2 + React + TypeScript），产品定位为 Typora 式的单文档单窗口体验。本文档记录领域专家级别的语言与核心决策，供 AI 协作者与后续维护者对齐。

## 术语表

### Prototype（设计原型）
指 `docs/prism-openai-redesign.html` —— **视觉与交互的唯一参考标准**。任何 UI 实现遇到不确定，以此原型为准。

原先的 `prism.html`（Win11 Fluent Design 方向）已于 2026-05-10 被取代，不再作为实现依据。

### 设计方向（Design language）
**OpenAI 极简风**。核心约束：
- 纯黑白双色锚点（`--c-void` / `--c-canvas`），不使用品牌色与彩色强调
- 形状语言只有两种：**药丸（pill, `--r-pill: 9999px`）** 和 **近方形卡片（`--r-card: 6.08px`）**
- 字体分工：**Inter**（界面 + 预览正文）、**JetBrains Mono**（编辑器 + 代码块）
- 显示级排印：H1 48px、压紧字距 `-1.44px`；留白替代阴影

### 单文档单窗口（Single-document-per-window）
Prism 没有标签页。每个窗口只打开一个文档，新开文档 = 新开窗口（`Ctrl+Shift+N`）。侧边栏的文件树是导航入口，不是标签容器。

此决策已明确，早期存在的 `TabBar` 组件属于旧方向的遗留。

### 视图模式（View mode）
三态互斥：`edit`（源码）/ `split`（分栏）/ `preview`（预览）。由状态栏中央的 `mode-group` 药丸切换；菜单"视图"中作为 `checkable` 项呈现。

### 专注模式（Focus mode）
`F8` 触发。侧栏、菜单栏、标题栏 `opacity: 0.25`，鼠标 hover 恢复。不同于全屏 `F11`。

### 工作区（Workspace）
侧栏展示的根目录。一次打开一个工作区；`status-folder` 显示其名称，右键/点击弹出工作区级上下文菜单。

### 打字机模式（Typewriter mode）
`F9` 触发。开启后当前编辑行始终保持在 viewport 垂直中心。实现依赖 CodeMirror 6 的 `selection` 变化监听 + `scrollIntoView`。与专注模式**正交**，可同时打开。

### 状态栏 zone（Status bar zones）
原型的状态栏由两段式结构组成：
- `status-sidebar-zone` —— 仅当 `sidebarVisible=true` 时渲染，宽度对齐侧栏 260px。默认 `opacity: 0`，鼠标进入整段区域时淡入为 1（用于工作区快捷操作）。
- `status-main` —— 常驻。左区 mode 切换 + 侧栏折叠钮；中区绝对定位的统计信息；右区专注/导出/主题三个按钮。

### 浮动工具栏（Floating toolbar）
选中文本后在鼠标选区上方弹出的 pill 形药丸工具栏。编辑器为 CodeMirror 6，位置通过 `view.coordsAtPos(selection.main.from)` 计算，非原型里的 textarea `lineHeight * row` 估算。按钮序列：B / I / U / S / highlight / code / link / quote。

### 令牌体系（Design tokens）
颜色命名直接沿用原型：`--c-void` / `--c-canvas` / `--c-fog` / `--c-chalk` / `--c-graphite` / `--c-ash` / `--c-hair` / `--c-hover` / `--c-selection`。不再使用 Fluent 式 `--bg-*` / `--text-*` / `--accent-*` 命名。详见 ADR-0002。
