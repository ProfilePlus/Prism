# Codex 工作指南

## 语言偏好

**始终使用中文与用户交流。**

- 所有对话、问题、设计讨论都用中文
- 代码注释可以用英文（遵循行业惯例）
- 文档、设计文档、规划文档都用中文
- commit message 用中文

## 项目背景

Prism 是一个 Markdown 桌面编辑器，基于 Tauri 2 + React + TypeScript，采用 **OpenAI 极简设计方向**。

视觉与交互的唯一参考标准：`docs/prism-openai-redesign.html`。领域术语与核心决策见 `CONTEXT.md`，架构决策见 `docs/adr/`。

当前状态：
- 核心编辑功能已实现（编辑/分栏/预览、自动保存、KaTeX、Mermaid）
- 产品定位为 Typora 式单文档单窗口
- 视觉正在从原 Win11 Fluent 方向重构为 OpenAI 极简方向（2026-05-10 起）

## 工作原则

1. **使用 superpowers 工作流**
   - 任何新功能或重构都先走 brainstorming → writing-plans → executing-plans
   - 不要跳过设计阶段直接写代码

2. **原型对齐优先**
   - `docs/prism-openai-redesign.html` 是视觉和交互的参考标准
   - 实现时要对照原型的细节：令牌、间距、颜色、动画、交互反馈
   - 术语、设计哲学与关键决策请先读 `CONTEXT.md` 与 `docs/adr/`

3. **产品决策权在用户**
   - 如果用户说"这个不对"或"改成这样"，立即调整
   - 不要坚持技术方案或设计理念，用户体验优先

4. **诚实汇报进度**
   - 不要说"完成了"除非真的完成了
   - 遇到问题或不确定时，明确说出来

## 当前待办

OpenAI 风格视觉重构分 5 批递进推进（2026-05-10 起）：

1. 基座：`global.css` 令牌整体换成 `--c-*` / `--r-*` / `--shadow-*`；Inter + JetBrains Mono 本地打包；删除 `TabBar.tsx + test`
2. 外壳：`WindowShell / TitleBar / MenuBar / MenuDropdown` 重写
3. 状态栏：`StatusBar` 按原型 `status-sidebar-zone + status-main` 结构改造
4. 浮层：`FloatingToolbar / CommandPalette / ShortcutPanel / ContextMenu`；新增 `AboutModal / SettingsModal`；Toast 改 pill；打字机模式实现
5. 预览排印：`PreviewPane` 排印细节（h1–h6、代码块、表格、引用、列表、mark、kbd、hr）+ 五套内容主题（Newsprint / Night / Github / Pixyll / Whitey）

## Agent skills

### Issue tracker

使用 GitHub Issues（仓库：AlexPlum405/Prism），通过 `gh` CLI 操作。详见 `docs/agents/issue-tracker.md`。

### Triage labels

使用规范默认标签：needs-triage / needs-info / ready-for-agent / ready-for-human / wontfix。详见 `docs/agents/triage-labels.md`。

### Domain docs

单上下文布局：仓库根目录一份 `CONTEXT.md` + `docs/adr/`。详见 `docs/agents/domain.md`。
