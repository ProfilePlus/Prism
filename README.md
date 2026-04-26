<div align="center">

# Prism

**Windows 11 风格的现代 Markdown 桌面编辑器**

**A modern Markdown desktop editor with Windows 11 Fluent Design**

<video src="docs/assets/brand/Prism_Ultimate_Launch.mp4" width="100%" controls autoplay muted loop></video>

[![Tauri](https://img.shields.io/badge/Tauri-2.x-blue?logo=tauri)](https://tauri.app)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

[简体中文](#中文) · [English](#english)

</div>

---

## 中文

### 简介

Prism 是一款基于 **Tauri 2 + React + TypeScript** 构建的 Markdown 桌面编辑器，采用 Windows 11 Fluent Design 视觉语言。它提供编辑 / 分栏 / 预览三种模式，支持 KaTeX 数学公式与 Mermaid 图表，内置完整的菜单系统与选中文本浮动工具栏。

### 主要功能

**编辑体验**
- 三种视图模式：纯编辑、分栏、纯预览
- **专注模式 (F8)**：沉浸式暗场写作环境
- 选中文本浮动工具栏（加粗、斜体、行内代码、链接、引用）
- KaTeX 数学公式渲染
- Mermaid 流程图 / 时序图渲染
- 大纲视图与一键跳转
- 文档内全文搜索
- 自动保存

**界面与外壳**
- **品牌设计**：采用 Segment Iris（分瓣光圈）原创图标体系
- **分裂地基状态栏**：具备物理滑出感与动态唤醒（Hover Reveal）逻辑的精细底座
- Windows 11 Fluent Design 视觉（Mica 背景渐变）
- 深 / 浅双主题
- 完整菜单栏与下拉菜单
- 侧边栏（文件树 / 大纲 / 搜索）
- 深度交互统计（字数、字符数、行数、阅读时长）

**文件操作**
- **系统级接管菜单**：在资源管理器中显示、复制完整路径、创建副本等
- 最近文件夹快捷访问
- 打开 / 保存 / 另存为 / 新建文档
- HTML 导出
- 命令行 / 关联打开文件

### 技术栈

| 层 | 技术 |
| --- | --- |
| 桌面外壳 | Tauri 2.x |
| 前端框架 | React 18 + TypeScript 5 |
| 构建工具 | Vite 6 |
| 状态管理 | Zustand |
| 编辑器 | CodeMirror 6 |
| Markdown | remark + rehype + remark-gfm |
| 数学渲染 | KaTeX |
| 图表渲染 | Mermaid |
| 测试框架 | Vitest + Testing Library |

### 开始使用

#### 环境要求

- Node.js 18+
- Rust 1.77+
- Windows 10/11（其他平台理论支持，未做完整验证）

#### 安装与开发

```bash
# 克隆仓库
git clone https://github.com/ProfilePlus/Prism.git
cd Prism

# 安装依赖
npm install

# 启动开发模式
npm run tauri:dev
```

#### 构建发布版

```bash
npm run tauri:build
```

构建产物在 `src-tauri/target/release/bundle/` 下。

#### 运行测试

```bash
npm test           # 持续模式
npm test -- --run  # 单次运行
npx tsc --noEmit   # 类型检查
```

### 项目结构

```
Prism/
├── src/                          # 前端源码
│   ├── App.tsx                   # 应用根组件
│   ├── components/shell/         # 桌面外壳（窗口、标题栏、菜单栏）
│   ├── domains/                  # 业务领域
│   │   ├── document/             # 文档管理
│   │   ├── editor/               # 编辑器与浮动工具栏
│   │   ├── workspace/            # 工作区（侧边栏、状态栏）
│   │   └── settings/             # 设置
│   ├── lib/                      # 工具与菜单动作
│   └── styles/                   # 全局样式
├── src-tauri/                    # Tauri 后端 (Rust)
│   ├── src/                      # Rust 源码
│   ├── capabilities/             # 权限配置
│   └── tauri.conf.json           # Tauri 配置
├── docs/                         # 设计与计划文档
└── prism.html                    # 视觉原型参考
```

### 开发说明

- 视觉规范以 `prism.html` 为参考标准
- 设计令牌（圆角、强调色、表面、阴影）集中在 `src/styles/global.css`
- 菜单动作集中在 `src/lib/menuActions.ts`
- 当前版本部分菜单项被 `hidden: true` 标记，后续版本会逐步开放

### 路线图

- [ ] 偏好设置面板
- [ ] 专注模式 / 打字机模式
- [ ] 打印支持
- [ ] 帮助文档与外链系统（Tauri opener 集成）
- [ ] 多窗口管理
- [ ] 拼写检查
- [ ] 更多导出格式（PDF、DOCX）

### 许可证

[MIT](LICENSE)

---

## English

### Introduction

Prism is a Markdown desktop editor built with **Tauri 2 + React + TypeScript**, embracing Windows 11 Fluent Design. It offers edit / split / preview modes, KaTeX math rendering, Mermaid diagram support, a complete menu system, and a floating formatting toolbar for selected text.

### Features

**Editing**
- Three view modes: edit / split / preview
- Floating toolbar on text selection (bold, italic, inline code, link, quote)
- KaTeX math rendering
- Mermaid flowchart / sequence diagram rendering
- Document outline with quick jump
- In-document full-text search
- Auto-save

**Shell & UI**
- Windows 11 Fluent Design visuals
- Custom borderless window with Mica background
- Light / Dark themes
- Full menu bar with dropdowns
- Sidebar (files / outline / search)
- Status bar (view mode, word count, cursor, focus toggle, theme switch, HTML export)

**File Operations**
- Open / Save / Save As / New
- Open folder (file tree)
- Export to HTML
- Open file from CLI / file association

### Tech Stack

| Layer | Technology |
| --- | --- |
| Desktop shell | Tauri 2.x |
| Frontend | React 18 + TypeScript 5 |
| Build tool | Vite 6 |
| State | Zustand |
| Editor | CodeMirror 6 |
| Markdown | remark + rehype + remark-gfm |
| Math | KaTeX |
| Diagrams | Mermaid |
| Testing | Vitest + Testing Library |

### Getting Started

#### Prerequisites

- Node.js 18+
- Rust 1.77+
- Windows 10/11 (other platforms should work but are not fully verified)

#### Install & Develop

```bash
git clone https://github.com/ProfilePlus/Prism.git
cd Prism

npm install

npm run tauri:dev
```

#### Build Release

```bash
npm run tauri:build
```

Artifacts will be under `src-tauri/target/release/bundle/`.

#### Tests

```bash
npm test           # watch mode
npm test -- --run  # single run
npx tsc --noEmit   # type check
```

### Project Structure

```
Prism/
├── src/                          # Frontend source
│   ├── App.tsx                   # Root component
│   ├── components/shell/         # Desktop shell (window, titlebar, menubar)
│   ├── domains/                  # Business domains
│   │   ├── document/             # Document management
│   │   ├── editor/               # Editor + floating toolbar
│   │   ├── workspace/            # Workspace (sidebar, status bar)
│   │   └── settings/             # Settings
│   ├── lib/                      # Utilities & menu actions
│   └── styles/                   # Global styles
├── src-tauri/                    # Tauri backend (Rust)
│   ├── src/                      # Rust source
│   ├── capabilities/             # Permission configs
│   └── tauri.conf.json           # Tauri config
├── docs/                         # Specs & plans
└── prism.html                    # Visual prototype reference
```

### Development Notes

- Visual reference: `prism.html`
- Design tokens (radius, accent colors, surfaces, elevation) centralized in `src/styles/global.css`
- Menu actions centralized in `src/lib/menuActions.ts`
- Some menu items are flagged `hidden: true` in v1.0 and will be progressively enabled in future releases

### Roadmap

- [ ] Preferences panel
- [ ] Focus / Typewriter modes
- [ ] Print support
- [ ] Help docs & external links (via Tauri opener plugin)
- [ ] Multi-window management
- [ ] Spell checking
- [ ] More export formats (PDF, DOCX)

### License

[MIT](LICENSE)

---

<div align="center">

Built with ❤️ using [Tauri](https://tauri.app), [React](https://react.dev), and [CodeMirror](https://codemirror.net)

</div>
