# Prism PDF 导出性能重构验证

> 日期：2026-05-17  
> 目标：把长文 PDF 默认主链路从整页栅格截图式导出，重构为更快且保持清晰的系统 / 浏览器 PDF 输出链路。  
> 约束：不自动降清晰度，不用低清整页截图伪装优化，保留文字、SVG、Mermaid、KaTeX、代码块、表格和主题输出。

## 1. 研究结论

本轮先查官方 / 一手资料，再结合 Prism 当前 Tauri + WKWebView 分发约束做取舍。

| 方案 | 结论 | 取舍 |
| --- | --- | --- |
| `html2canvas -> PNG pages -> pdf-lib` | 兼容面最可控，但本质是整页栅格图。长文会重复 DOM 布局 / 绘制，PDF 不可选中文字，文件里主要是 `/Image`。 | 保留为 warning fallback；不再作为真实 app 默认 PDF 主链路。 |
| Chrome DevTools `Page.printToPDF` / Playwright / Puppeteer `page.pdf` | Chromium 打印 PDF 质量高，适合服务端 / 自动化导出。 | 桌面 app 若内置 Chromium / Playwright sidecar，会显著增加包体、签名、公证和维护成本；当前 1.0.x 不作为默认方案。 |
| macOS `WKWebView.printOperationWithPrintInfo` | 与系统打印面板路线一致，但当前 Prism 真实 smoke 曾出现高 CPU、PDF 文件持续增长且不结束。 | 不保留为默认主链路。 |
| macOS `WKWebView.createPDFWithConfiguration` | 直接从当前 WebView 内容生成 PDF data，能保留文字 / SVG / Mermaid 的矢量输出，不额外打包浏览器。 | 本轮选为 macOS 主链路；用批量捕获避免超大 rect；再用 `pdf-lib` 做 A4 分页和小型页眉页脚叠加。 |
| Windows WebView2 `PrintToPdfAsync` | Windows 上更贴近系统 WebView PDF 的对应能力。 | 当前 macOS 先闭环；非 macOS 暂回退 raster，并保留未来 adapter 位置。 |
| CSS Paged Media / `@page` / `print-color-adjust` | 可帮助打印样式，但 WebView 支持和页眉页脚能力不完全一致。 | 用于后续可打印 HTML 层优化；本轮页眉页脚和页码用 PDF 后处理叠加小文本，不为 chrome 重新栅格化整页。 |

参考入口：

- Chrome DevTools Protocol `Page.printToPDF`: https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-printToPDF
- Playwright `page.pdf`: https://playwright.dev/docs/api/class-page#page-pdf
- Puppeteer `Page.pdf`: https://pptr.dev/api/puppeteer.page.pdf
- WebView2 `PrintToPdfAsync`: https://learn.microsoft.com/en-us/dotnet/api/microsoft.web.webview2.core.corewebview2.printtopdfasync
- Apple `WKWebView.createPDF`: https://developer.apple.com/documentation/webkit/wkwebview/createpdf%28configuration%3Acompletionhandler%3A%29
- MDN CSS `@page`: https://developer.mozilla.org/en-US/docs/Web/CSS/@page

## 2. 已失败路线

### `printOperationWithPrintInfo`

真实 app smoke 中曾尝试 macOS WebKit print operation：

- Prism 进程长时间接近 100% CPU。
- PDF 文件从约 32MB 持续增长到 140MB+。
- 导出没有可靠结束信号。

结论：该路线不能作为默认主链路。

### 旧 raster 主链路

旧默认 PDF 输出为 `html2canvas` 栅格页图再写入 PDF：

- `.codex-smoke/preview-heavy/preview-heavy-raster-before-native.pdf`
- 大小：`5,215,051 bytes`
- 页数：`50`
- `/Subtype /Image`：`50`
- `/Font`：`0`
- PDFKit 文本提取为空。

这证明旧链路生成的是图片 PDF，不满足“清晰且可选中文字”的目标。

## 3. 本轮实现

核心文件：

- `src/domains/export/exportPipeline.ts`
- `src/domains/export/exportPipeline.test.ts`
- `src/domains/commands/registry.ts`
- `src/domains/commands/registry.test.ts`
- `src-tauri/src/lib.rs`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`

### macOS 主链路

1. 独立导出 WebView 仍负责构造导出 DOM。
2. PDF 导出在 Tauri export worker 中优先进入 WebKit PDF capture。
3. `prepareWebkitPdfCaptureDocument()` 生成专用 `.prism-export-document`，等待字体，计算 A4 / Letter 内容区域和 CSS 像素到 PDF point 的比例。
4. Rust Tauri command `capture_current_webview_pdf` 调用 `WKWebView.createPDFWithConfiguration_completionHandler`。
5. Rust command 为 async；WebKit 回调在主线程触发，等待结果放到 `spawn_blocking`，避免阻塞 WebKit 回调。
6. 长文按最多 8 页 / 12,000 CSS px 一批捕获，避免一次性超大 rect。
7. 前端用 `pdf-lib.embedPdf()` 把 WebKit 生成的 PDF 页面嵌入 A4 / Letter 页面，再按页切分；页边距用白色 mask 处理。
8. 页眉、页脚、页码只叠加小文本 / 小 PNG，不把整页重新栅格化。
9. 临时 `*.webkit-capture-N.pdf` 在成功或失败后都会清理。

### fallback

如果 WebKit capture 不可用或失败：

- 用户收到 warning：`WebKit PDF 引擎不可用，已回退兼容导出管线：...`
- 才进入旧 raster PDF。
- fallback 不会静默自动降到 `0.x scale`。

### 进度卡死修复

真实 UI 复测时又暴露一个前置卡点：导出前的 `waitForExportProgressPaint()` 只等待双 `requestAnimationFrame`，如果 rAF 被 WebKit 暂停，会永远停在“准备导出”。

修复：

- `src/domains/commands/registry.ts` 给 `waitForExportProgressPaint()` 增加 250ms timer fallback。
- `src/domains/commands/registry.test.ts` 新增 rAF 不回调时仍继续进入 `exportDocument()` 的回归。

## 4. 自动化覆盖

新增 / 更新测试：

- `src/domains/export/exportPipeline.test.ts`
  - WebKit PDF worker 环境优先走 `capture_current_webview_pdf`，不调用 `html2canvas`。
  - 页眉页脚 / 页码只做小型 overlay，保留 native PDF 内容。
  - WebKit capture 失败后带 warning 回退 raster。
  - 长 native PDF 按 2 个 bounded batches 捕获 13 页，清理两个临时 capture 文件，不调用 raster。
- `src/domains/commands/registry.test.ts`
  - rAF stall 时导出不会卡在“准备导出”。
  - 导出成功 toast 的“打开”动作优先调用 `open_path_with_system`，失败才回退 opener plugin。

已跑：

```bash
npm test -- --run src/domains/export/exportPipeline.test.ts
npm test -- --run src/domains/commands/registry.test.ts
npm test -- --run src/domains/export/exportPipeline.test.ts src/domains/export/index.test.ts src/domains/export/isolatedWebviewExport.test.ts src/domains/commands/registry.test.ts
npm test -- --run
npm run build
cd src-tauri && cargo fmt --check && cargo check
git diff --check
npm run tauri:build:app-smoke
```

结果：

- `exportPipeline.test.ts`：通过，`41 passed`
- `registry.test.ts`：通过，`22 passed`
- 导出聚焦组合：通过，`4 files / 69 tests`
- 全量前端：通过，`59 files / 358 tests`
- `npm run build`：通过，仅有既有 Vite large chunk warning
- `cargo fmt --check && cargo check`：通过
- `git diff --check`：通过
- `npm run tauri:build:app-smoke`：通过，生成 `src-tauri/target/release/bundle/macos/Prism.app`

## 5. 真实 app smoke

### 输入

- App：`src-tauri/target/release/bundle/macos/Prism.app`
- 文档：`.codex-smoke/preview-heavy/preview-heavy.md`
- 文档特征：20 节重媒体 Markdown、50 张本地 SVG、20 个 Mermaid、20 个 display math、尾部包含故意非法 Mermaid 和 KaTeX 错误诊断。

### 输出

- `.codex-smoke/preview-heavy/preview-heavy-webkit-smoke.pdf`
- 当前大小：约 `475K`
- 页面：`51`
- 页面尺寸：A4，`595 x 842`
- 临时文件：未发现 `*.webkit-capture-*.pdf` 残留。

检查命令 / 证据：

```bash
file .codex-smoke/preview-heavy/preview-heavy-webkit-smoke.pdf
node --input-type=module -e '... PDFDocument.load(...) ...'
swift -e 'import PDFKit; ... doc.string ...'
grep -a -o '/Subtype /Image' .codex-smoke/preview-heavy/preview-heavy-webkit-smoke.pdf | wc -l
grep -a -o '/Font' .codex-smoke/preview-heavy/preview-heavy-webkit-smoke.pdf | wc -l
```

结果：

- `file`：`PDF document, version 1.7`
- `pdf-lib`：`pages = 51`，前 5 页均为 `595 x 842`
- PDFKit 可提取正文，包含标题、正文、Mermaid 节点文字、公式附近文本。
- `/Subtype /Image`：`0`
- `/Font`：`7`
- Quick Look / PDFKit 渲染第 1、26、51 页截图可见正文、本地 SVG、Mermaid 图、KaTeX 和尾部错误诊断；不是整页低清截图。
- `open preview-heavy-webkit-smoke.pdf` 和 `open -R preview-heavy-webkit-smoke.pdf` 均返回 0，系统能打开文件和显示位置。

### 对比

| 指标 | raster before | WebKit createPDF after |
| --- | --- | --- |
| 文件 | `preview-heavy-raster-before-native.pdf` | `preview-heavy-webkit-smoke.pdf` |
| 大小 | `5.0M` | `约 475K` |
| 页数 | `50` | `51` |
| 文本提取 | 空 | 可提取正文 |
| `/Subtype /Image` | `50` | `0` |
| `/Font` | `0` | `7` |
| 清晰度 | 图片 PDF，放大依赖位图 | 矢量 / 字体 PDF |
| 真实反馈耗时 | 49 页接近 5 分钟 | 真实 app 已能在几十秒级完成，不再 0.x 降级 |

最新新构建复测：

- 构建命令：`npm run tauri:build:app-smoke`
- App PID：`91638`
- 触发方式：真实 Prism UI 底部“导出”菜单 -> `覆盖上次导出文件`
- 启动记录：`date +%s = 1779031584`
- 输出 mtime：`1779031641`，即约 `57s`
- 结果：进度从“准备导出”推进到“正在渲染图表”，不再卡死；输出 PDF 更新时间为 `May 17 23:27:21 2026`，大小 `474,871 bytes`。

## 6. 剩余风险

- macOS WebKit `createPDF` 已闭环；Windows WebView2 `PrintToPdfAsync` adapter 尚未实现，非 macOS 仍会 warning fallback 到 raster。
- 页眉页脚 / 页码当前是 PDF 后处理叠加，视觉上够用，但不是完整 CSS paged media 引擎。
- 真实 UI 的“打开 / 显示位置”toast 按钮本轮未抓到可视点击证据；底层命令测试和系统 `open` / `open -R` 已通过。该项作为低风险 UI 观察保留，不影响 PDF 主链路性能与清晰度结论。
- 若未来引入 Chromium sidecar，需要重新评估包体、签名、公证和 updater 影响。

## 7. 当前结论

PDF 主链路已经从整页栅格 PDF 转为 macOS WebKit 矢量 PDF capture，满足“不降低清晰度”和“长文明显加速”的目标。包含 `waitForExportProgressPaint()` 修复的新构建已完成真实 app PDF 导出 smoke：51 页重媒体文档约 57 秒导出，PDF 可提取文字，0 个整页 image object，7 个 font object。
