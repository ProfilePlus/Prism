<div align="center">

# Prism

**OpenAI-inspired minimalist Markdown editor for Windows**

**OpenAI 极简风格的 Markdown 桌面编辑器**

<p align="center">
  <img src="https://img.shields.io/github/v/release/AlexPlum405/Prism?style=flat-square&color=0066FF" alt="Release">
  <img src="https://img.shields.io/github/downloads/AlexPlum405/Prism/total?style=flat-square&color=0066FF" alt="Downloads">
  <img src="https://img.shields.io/badge/Tauri-2.x-0066FF?style=flat-square&logo=tauri" alt="Tauri">
  <img src="https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
</p>

[English](#english) · [简体中文](#中文)

</div>

---

## English

### ✨ What is Prism?

Prism is a **distraction-free Markdown editor** built with Tauri 2, React, and TypeScript. Inspired by OpenAI's minimal design philosophy, it strips away visual noise and focuses on what matters: **your writing**.

- 🎯 **Zero clutter**: Clean interface, no decorative borders, no visual distractions
- ⚡ **Instant sync**: Real-time scroll synchronization between editor and preview
- 🌓 **Dark mode done right**: Material Design-compliant dark themes (Linear, The Verge)
- 📐 **Golden ratio layout**: Preview width follows the golden ratio (0.618) for optimal readability
- 🚀 **Native performance**: Built on Tauri 2 — fast startup, low memory footprint

### 🎬 Demo

> Coming soon: GIF/video showcasing the editing experience

### 📦 Download

**Latest Release: v0.1.1**

- [Windows Installer (4.6 MB)](https://github.com/AlexPlum405/Prism/releases/latest/download/Prism_0.1.1_x64-setup.exe)
- [Portable .exe (13 MB)](https://github.com/AlexPlum405/Prism/releases/latest/download/app.exe)

> macOS and Linux builds coming soon

### 🚀 Features

**Core Editing**
- Three view modes: **Edit** (default), **Split**, **Preview**
- Smart scroll sync: Editor and preview stay aligned by source line, not ratio
- Floating toolbar on text selection (bold, italic, code, link, quote, highlight)
- Auto-save with dirty state tracking
- Full-text search within document

**Markdown Rendering**
- GitHub Flavored Markdown (GFM)
- KaTeX math equations (`$inline$` and `$$block$$`)
- Mermaid diagrams (flowcharts, sequence diagrams, etc.)
- Syntax highlighting for code blocks
- Five content themes: Newsprint, Night, GitHub, Pixyll, Whitey

**File Management**
- Smart file tree: Only shows folders containing Markdown files
- Recent folders quick access
- System integration: "Show in Explorer", "Copy Path", "Duplicate"
- HTML export

**Developer Experience**
- Built with TypeScript 5 + React 18
- CodeMirror 6 editor core
- Vite 6 for instant HMR
- Comprehensive test coverage (Vitest + Testing Library)

### 🛠️ Tech Stack

| Layer | Technology |
| --- | --- |
| Desktop Shell | Tauri 2.x |
| Frontend | React 18 + TypeScript 5 |
| Build Tool | Vite 6 |
| State Management | Zustand |
| Editor | CodeMirror 6 |
| Markdown Pipeline | unified (remark + rehype) |
| Math Rendering | KaTeX |
| Diagram Rendering | Mermaid |
| Testing | Vitest + Testing Library |

### 🏗️ Build from Source

#### Prerequisites

- Node.js 18+ (or pnpm 8+)
- Rust 1.77+
- Windows 10/11 (macOS/Linux support coming soon)

#### Steps

```bash
# Clone the repository
git clone https://github.com/AlexPlum405/Prism.git
cd Prism

# Install dependencies
pnpm install

# Start development server
pnpm tauri:dev

# Build release
pnpm tauri:build
```

Artifacts will be in `src-tauri/target/release/bundle/`.

#### Run Tests

```bash
pnpm test           # Watch mode
pnpm test -- --run  # Single run
pnpm tsc --noEmit   # Type check
```

### 📂 Project Structure

```
Prism/
├── src/                          # Frontend source
│   ├── components/shell/         # Window shell (titlebar, menubar)
│   ├── domains/                  # Business domains
│   │   ├── document/             # Document state management
│   │   ├── editor/               # Editor + preview + split view
│   │   ├── workspace/            # Sidebar (file tree, outline, search)
│   │   └── settings/             # User preferences
│   ├── lib/                      # Utilities (Markdown pipeline, menu actions)
│   └── styles/                   # Global CSS (design tokens)
├── src-tauri/                    # Tauri backend (Rust)
│   ├── src/                      # Rust source
│   └── tauri.conf.json           # Tauri configuration
├── docs/                         # Design specs & ADRs
└── prism-openai-redesign.html    # Visual prototype reference
```

### 🗺️ Roadmap

- [ ] Preferences panel (font size, line height, etc.)
- [ ] Typewriter mode (keep cursor centered)
- [ ] Print support
- [ ] Multi-window management
- [ ] Spell checking
- [ ] Export to PDF/DOCX
- [ ] macOS and Linux builds

### 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### 📄 License

[MIT](LICENSE)

---

## 中文

### ✨ Prism 是什么？

Prism 是一款基于 **Tauri 2 + React + TypeScript** 构建的 **极简 Markdown 编辑器**。受 OpenAI 设计哲学启发，它剔除了视觉噪音，让你专注于最重要的事：**写作本身**。

- 🎯 **零干扰**：干净界面，无装饰性边框，无视觉噪音
- ⚡ **即时同步**：编辑器与预览实时滚动同步
- 🌓 **深色模式标杆**：符合 Material Design 规范的深色主题（Linear、The Verge）
- 📐 **黄金比例布局**：预览宽度遵循黄金比例（0.618），最佳阅读体验
- 🚀 **原生性能**：基于 Tauri 2 构建——快速启动，低内存占用

### 🎬 演示

> 即将上线：编辑体验 GIF/视频演示

### 📦 下载

**最新版本：v0.1.1**

- [Windows 安装包 (4.6 MB)](https://github.com/AlexPlum405/Prism/releases/latest/download/Prism_0.1.1_x64-setup.exe)
- [绿色版 .exe (13 MB)](https://github.com/AlexPlum405/Prism/releases/latest/download/app.exe)

> macOS 和 Linux 版本即将推出

### 🚀 功能特性

**核心编辑**
- 三种视图模式：**编辑**（默认）、**分栏**、**预览**
- 智能滚动同步：编辑器与预览按源码行号对齐，而非简单比例
- 选中文本浮动工具栏（加粗、斜体、代码、链接、引用、高亮）
- 自动保存 + 脏状态追踪
- 文档内全文搜索

**Markdown 渲染**
- GitHub Flavored Markdown (GFM)
- KaTeX 数学公式（`$行内$` 和 `$$块级$$`）
- Mermaid 图表（流程图、时序图等）
- 代码块语法高亮
- 五套内容主题：Newsprint、Night、GitHub、Pixyll、Whitey

**文件管理**
- 智能文件树：只显示包含 Markdown 文件的文件夹
- 最近文件夹快捷访问
- 系统集成："在资源管理器中显示"、"复制路径"、"创建副本"
- HTML 导出

**开发者体验**
- TypeScript 5 + React 18 构建
- CodeMirror 6 编辑器内核
- Vite 6 即时热更新
- 完整测试覆盖（Vitest + Testing Library）

### 🛠️ 技术栈

| 层级 | 技术 |
| --- | --- |
| 桌面外壳 | Tauri 2.x |
| 前端框架 | React 18 + TypeScript 5 |
| 构建工具 | Vite 6 |
| 状态管理 | Zustand |
| 编辑器 | CodeMirror 6 |
| Markdown 管道 | unified (remark + rehype) |
| 数学渲染 | KaTeX |
| 图表渲染 | Mermaid |
| 测试框架 | Vitest + Testing Library |

### 🏗️ 从源码构建

#### 环境要求

- Node.js 18+（或 pnpm 8+）
- Rust 1.77+
- Windows 10/11（macOS/Linux 支持即将推出）

#### 步骤

```bash
# 克隆仓库
git clone https://github.com/AlexPlum405/Prism.git
cd Prism

# 安装依赖
pnpm install

# 启动开发服务器
pnpm tauri:dev

# 构建发布版
pnpm tauri:build
```

构建产物在 `src-tauri/target/release/bundle/` 下。

#### 运行测试

```bash
pnpm test           # 持续模式
pnpm test -- --run  # 单次运行
pnpm tsc --noEmit   # 类型检查
```

### 📂 项目结构

```
Prism/
├── src/                          # 前端源码
│   ├── components/shell/         # 窗口外壳（标题栏、菜单栏）
│   ├── domains/                  # 业务领域
│   │   ├── document/             # 文档状态管理
│   │   ├── editor/               # 编辑器 + 预览 + 分栏视图
│   │   ├── workspace/            # 侧边栏（文件树、大纲、搜索）
│   │   └── settings/             # 用户偏好设置
│   ├── lib/                      # 工具函数（Markdown 管道、菜单动作）
│   └── styles/                   # 全局 CSS（设计令牌）
├── src-tauri/                    # Tauri 后端（Rust）
│   ├── src/                      # Rust 源码
│   └── tauri.conf.json           # Tauri 配置
├── docs/                         # 设计规范与 ADR
└── prism-openai-redesign.html    # 视觉原型参考
```

### 🗺️ 路线图

- [ ] 偏好设置面板（字体大小、行高等）
- [ ] 打字机模式（光标居中）
- [ ] 打印支持
- [ ] 多窗口管理
- [ ] 拼写检查
- [ ] 导出为 PDF/DOCX
- [ ] macOS 和 Linux 版本

### 🤝 贡献

欢迎贡献！请随时提交 Pull Request。

### 📄 许可证

[MIT](LICENSE)

---

<div align="center">

Built with ❤️ using [Tauri](https://tauri.app), [React](https://react.dev), and [CodeMirror](https://codemirror.net)

**Star ⭐ this repo if you find it useful!**

</div>
