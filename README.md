<div align="center">

# Prism

**A quiet, native-feeling Markdown editor for writers who care about typography.**

**为中文写作、预览排版和高质量导出而打磨的 Markdown 桌面编辑器。**

<p>
  <a href="https://github.com/AlexPlum405/Prism/releases/latest">
    <img src="https://img.shields.io/github/v/release/AlexPlum405/Prism?style=flat-square&color=315f43" alt="Latest release">
  </a>
  <img src="https://img.shields.io/github/downloads/AlexPlum405/Prism/total?style=flat-square&color=315f43" alt="Downloads">
  <img src="https://img.shields.io/github/stars/AlexPlum405/Prism?style=flat-square&color=315f43" alt="Stars">
  <img src="https://img.shields.io/badge/Tauri-2.x-24C8DB?style=flat-square&logo=tauri&logoColor=white" alt="Tauri">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=111" alt="React">
  <img src="https://img.shields.io/badge/CodeMirror-6-1f2937?style=flat-square" alt="CodeMirror 6">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License">
</p>

<p>
  <a href="#download">Download</a>
  ·
  <a href="#why-prism">Why Prism</a>
  ·
  <a href="#screenshots">Screenshots</a>
  ·
  <a href="#中文简介">中文简介</a>
</p>

<a href="docs/screenshot/prism-intro/prism-intro-final.mp4">
  <img src="docs/screenshot/prism-intro/prism-intro-readme.gif" alt="Prism 20-second product demo" width="920">
</a>

<sub>Click the animation to open the MP4 demo with sound.</sub>

</div>

---

## Why Prism

Prism is a desktop Markdown editor built around one idea: writing tools should feel calm, precise, and out of the way.

It combines a native Tauri shell, CodeMirror 6 editing, polished Markdown preview, Chinese-friendly typography, document search, multiple visual themes, and one-click export to HTML, PDF, Word, and PNG.

Prism is still young, but it is already usable for real writing workflows: drafts, technical notes, product docs, README pages, and long-form Chinese writing.

## Highlights

| What you get | Why it matters |
| --- | --- |
| **Edit / Split / Preview modes** | Switch between focused writing, live comparison, and clean reading. |
| **Chinese-first typography** | Comfortable spacing, centered preview, writing themes, and code styling tuned for mixed Chinese and technical content. |
| **CodeMirror 6 editor core** | Reliable text editing, selection, search, replace, and keyboard-driven workflows. |
| **Markdown power features** | GitHub Flavored Markdown, syntax highlighting, Mermaid diagrams, KaTeX math, tables, task lists, blockquotes. |
| **Beautiful content themes** | MiaoYan, Inkstone, Slate, Mono, and Nocturne Dark, each with its own visual tokens. |
| **Product-grade export** | Export HTML, PDF, Word (`.docx`), and PNG with themed rendering and Prism-native save dialogs. |
| **Desktop workspace** | Sidebar, file tree, outline, context menu, status bar, auto-save, and recent workflow affordances. |

## Download

Latest release: **v0.1.1**

| Platform | Download |
| --- | --- |
| macOS Apple Silicon | [Prism_0.1.1_aarch64.dmg](https://github.com/AlexPlum405/Prism/releases/latest/download/Prism_0.1.1_aarch64.dmg) |
| Windows installer | [Prism_0.1.1_x64-setup.exe](https://github.com/AlexPlum405/Prism/releases/latest/download/Prism_0.1.1_x64-setup.exe) |
| Windows portable | [app.exe](https://github.com/AlexPlum405/Prism/releases/latest/download/app.exe) |

macOS builds are currently unsigned. If macOS blocks the app on first launch, use **Right click -> Open**.

## Screenshots

### Split writing

<img src="docs/screenshot/prism-intro/assets/split.png" alt="Prism split mode with editor and preview" width="920">

### Focused editing

<img src="docs/screenshot/prism-intro/assets/edit.png" alt="Prism edit mode" width="920">

### Preview typography

<img src="docs/screenshot/prism-intro/assets/preview-typography.png" alt="Prism preview typography" width="920">

### Code and diagrams

<p>
  <img src="docs/screenshot/prism-intro/assets/preview-code.png" alt="Prism code preview" width="456">
  <img src="docs/screenshot/prism-intro/assets/preview-diagram.png" alt="Prism Mermaid diagram preview" width="456">
</p>

### Export menu

<img src="docs/screenshot/prism-intro/assets/export.png" alt="Prism export menu with HTML, PDF, Word, PNG" width="920">

## Feature Details

### Editing

- CodeMirror 6 editor with Markdown-friendly behavior
- Document search, replacement, current-hit highlighting, and navigation
- Edit, split, and preview modes
- Auto-save and dirty-state tracking
- Floating formatting toolbar for common Markdown actions
- Sidebar file tree, outline, and context menu

### Preview

- GitHub Flavored Markdown
- Syntax-highlighted code blocks
- Mermaid diagrams
- KaTeX inline and block math
- Tables, task lists, blockquotes, links, marks, and horizontal rules
- Centered long-form preview layout

### Themes

Prism themes are not just color filters. Each theme owns its own font, background, border, code, blockquote, table, search, and export-dialog treatment.

- **MiaoYan**: quiet Chinese writing, warm paper, refined spacing
- **Inkstone**: ink-and-paper editorial tone
- **Slate**: cool blue-gray technical writing
- **Mono**: black-and-white lab notebook feeling
- **Nocturne Dark**: calm dark theme for night writing

### Export

Prism currently supports:

- **HTML**: standalone themed document
- **PDF**: rendered from the preview result
- **Word `.docx`**: structured document export
- **PNG**: full-page visual export

The export flow uses Prism's own save and overwrite UI instead of native replacement prompts, so the product feels consistent across the writing and delivery flow.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Desktop shell | Tauri 2 |
| Frontend | React 18 + TypeScript |
| Editor | CodeMirror 6 |
| State | Zustand |
| Build | Vite |
| Markdown | unified, remark, rehype |
| Math | KaTeX |
| Diagrams | Mermaid |
| Export | docx, pdf-lib, html2canvas |
| Tests | Vitest + Testing Library |

## Development

### Prerequisites

- Node.js 18+
- Rust 1.77+
- Tauri 2 prerequisites for your platform

### Run locally

```bash
git clone https://github.com/AlexPlum405/Prism.git
cd Prism
npm install
npm run tauri:dev
```

### Build

```bash
npm run build
npm run tauri:build
```

Artifacts are written to:

```text
src-tauri/target/release/bundle/
```

### Test

```bash
npm test
npm run build
```

## Roadmap

- Code signing and smoother macOS first-launch experience
- Linux release build
- More export fidelity for complex Word documents
- Theme gallery and theme authoring docs
- Spell checking
- More keyboard-first writing workflows

## 中文简介

Prism 是一个基于 **Tauri 2 + React + TypeScript + CodeMirror 6** 的 Markdown 桌面编辑器。

它更关注中文写作时真正会影响体验的细节：字号、行高、预览居中、代码块颜色、表格、Mermaid 图表、KaTeX 公式、搜索替换、主题一致性，以及最后交付时的 HTML / PDF / Word / PNG 导出。

如果你需要一个适合写中文长文、技术笔记、产品文档和 README 的桌面 Markdown 编辑器，Prism 正在朝这个方向打磨。

欢迎 star、试用、提 issue，也欢迎提供你喜欢的写作主题和排版参考。

## Contributing

Issues and pull requests are welcome. If you are reporting a visual bug, please include:

- OS and app version
- View mode: edit, split, or preview
- Current theme
- A screenshot or a minimal Markdown sample

## License

[MIT](LICENSE)

---

<div align="center">

Made with Tauri, React, CodeMirror, and a stubborn affection for good typography.

If Prism feels useful, a star helps more people find it.

</div>
