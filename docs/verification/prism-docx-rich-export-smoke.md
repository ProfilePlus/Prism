# Prism DOCX 富内容导出 Smoke

> 日期：2026-05-18  
> 目标：验证 DOCX 导出能尽量保留 Markdown 渲染后的完整内容，复杂视觉块不能静默空白或退化为源码。

## 方案结论

本轮没有把整篇 Markdown 直接截图塞进 DOCX。采用混合方案：

- 标题、段落、强调、链接、引用、列表、任务列表、代码块、表格、目录、页眉页脚仍走原生 DOCX 结构，保证正文可编辑。
- 本地 SVG 和 Mermaid 输出 SVG，并附带 PNG fallback，兼顾 Word / WPS / Quick Look 的兼容性。
- KaTeX 行内公式、块级公式和安全 HTML 块先按 Prism 预览主题渲染，再以 PNG 视觉 fallback 写入 DOCX。
- 表格和代码块写入明确的 dxa 页面内容宽度，避免 Word / Quick Look 把列宽按默认 `100` twips 解释成竖排。
- Mermaid DOCX 链路优先使用 root-level `htmlLabels: false`，保留 `flowchart.htmlLabels: false` 兼容旧配置，避免 foreignObject 标签在 Word 中只剩方框或丢文字。

## 本轮改动

- `src/domains/export/exportPipeline.ts`
  - 新增 DOCX SVG 图片类型：`ImageRun` 写入 SVG，并提供 PNG fallback。
  - SVG 本地图片和 Mermaid 图表都进入 SVG + PNG fallback 链路。
  - 新增 KaTeX / HTML 块视觉 fallback，失败时产生 warning 并回退文本，不静默空白。
  - DOCX 表格和代码块改为基于 A4 / Letter 与边距计算的 dxa 宽度。
- `src/domains/export/exportPipeline.test.ts`
  - 覆盖 SVG + PNG fallback。
  - 覆盖 Mermaid root-level `htmlLabels: false` 与 SVG + PNG fallback。
  - 覆盖行内公式、块级公式、HTML 块会生成视觉 drawing。
  - 覆盖 DOCX 表格写入 `tcW` / `gridCol` 宽度。

## 真实 App Smoke

Fixture：

```text
.codex-smoke/docx-rich-export/docx-rich-export.md
.codex-smoke/docx-rich-export/assets/local-diagram.svg
```

真实应用：

```text
src-tauri/target/release/bundle/macos/Prism.app
```

操作：

1. 用当前 `.app` 打开 `.codex-smoke/docx-rich-export/docx-rich-export.md`。
2. 底部导出菜单选择 `导出为 Word (.docx)`。
3. 选择 `替换并导出`，输出到 `.codex-smoke/docx-rich-export/docx-rich-export.docx`。

产物检查：

```text
May 18 00:43:17 2026 127911
drawingCount 5
dxaCellWidthCount 11
gridColMatches [
  '<w:gridCol w:w="4933"',
  '<w:gridCol w:w="4933"',
  '<w:gridCol w:w="9866"'
]
tableWidth <w:tblW w:type="dxa" w:w="9866"
hasSvg true
hasPng true
containsGraphSource false
containsTitle true
containsTaskDone true
containsTaskTodo true
containsTableText true
containsCodeText true
```

Quick Look：

```bash
qlmanage -t -s 1024 -o .codex-smoke/docx-rich-export \
  .codex-smoke/docx-rich-export/docx-rich-export.docx
```

结果：

- DOCX 可解析并生成 thumbnail。
- 本地 SVG 图可见。
- 表格不再竖排。
- 代码块不再竖排。
- Mermaid 图在第一页可见，节点文字和边标签可见。
- KaTeX / HTML fallback 已通过 `word/media/` 和 `drawingCount` 证明进入 DOCX；逐页视觉仍建议用 Word / Pages 人工补查。

## 验证命令

```bash
npm test -- --run src/domains/export/exportPipeline.test.ts
npm run tauri:build:app-smoke
```

结果：

- `src/domains/export/exportPipeline.test.ts`：通过，1 file / 42 tests。
- `npm run tauri:build:app-smoke`：通过，生成 `src-tauri/target/release/bundle/macos/Prism.app`。

## 剩余风险

- DOCX 不等于浏览器 DOM，任意复杂 HTML / CSS 无法保证完全可编辑；当前策略是复杂块以高保真 PNG fallback 呈现。
- Quick Look thumbnail 只显示第一页，不能替代 Word / Pages 的逐页人工视觉审阅。
- 如果用户关闭 front matter 覆盖，YAML front matter 会按普通 Markdown 内容导出，这是现有设置语义，不属于本轮 DOCX 富内容修复。
