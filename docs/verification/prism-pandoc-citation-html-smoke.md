# Prism Pandoc HTML 引用导出 Smoke 验证

> 日期：2026-05-15  
> 目标：验证 HTML 导出在 Pandoc 可用、参考文献文件已配置、正文包含 Pandoc citekey 时，会使用 Pandoc citeproc 生成引用 HTML；当 Pandoc 或路径失败时，Prism 会回退内置导出并给出可复制诊断。

## 1. 验证范围

本 smoke 只覆盖 HTML 导出：

- 覆盖：`[@doe2024]`、`[-@doe2024]` citekey、BibTeX bibliography、可选 CSL 样式、HTML 导出、失败 warning / 诊断。
- 覆盖：citekey 误报防护，普通邮箱 `jane@example.com` 和 `mailto:` 链接里的 `@` 不应触发引用占位或 Pandoc 引用导出。
- 不覆盖：PDF / PNG / DOCX 的完整参考文献生成。
- 不覆盖：文件选择器授权、Zotero 数据库、在线 CSL 下载。

## 2. 前置条件

- Prism 版本：`1.4.0`
- 本机安装 Pandoc，并能通过命令行运行：

```bash
pandoc --version
```

- Prism 设置中心中已配置：
  - `Pandoc 路径`：留空使用系统 `pandoc`，或填写完整路径，例如 `/opt/homebrew/bin/pandoc`
  - `参考文献文件`：指向 `.bib` / `.bibtex` / `.json`
  - `CSL 样式文件`：可留空，或指向 `.csl`

## 3. 样例文件

建议在仓库内临时创建：

```text
.codex-smoke/pandoc-citation/
```

### 3.1 `citation-demo.md`

```markdown
---
title: Prism 引用导出 Smoke
author: Prism QA
---

# Prism 引用导出 Smoke

中文正文引用一本书 [@doe2024]，并引用另一篇文章 [@smith2023, p. 12]。

## 普通 Markdown 保真

- 列表项
- **粗体** 与 `inline code`

| 项目 | 结果 |
| --- | --- |
| citeproc | 期望生成引用 HTML |
```

### 3.2 `library.bib`

```bibtex
@book{doe2024,
  title = {Local First Markdown Writing},
  author = {Doe, Jane},
  year = {2024},
  publisher = {Prism Press}
}

@article{smith2023,
  title = {Reliable Export Pipelines},
  author = {Smith, John},
  journal = {Desktop Writing Review},
  year = {2023},
  volume = {7},
  number = {2},
  pages = {10-20}
}
```

## 4. 成功路径

1. 启动 Prism，打开 `citation-demo.md`。
2. 打开设置中心，确认：
   - `Pandoc 路径` 检测成功，状态显示 Pandoc 版本。
   - `参考文献文件` 为 `library.bib` 的绝对路径。
   - `CSL 样式文件` 可留空。
3. 执行 `导出 -> HTML`，选择输出路径 `citation-demo.html`。
4. 打开导出的 HTML，检查：
   - 正文不再出现原始 `[@doe2024]` / `[@smith2023, p. 12]`。
   - 页面中出现 `Doe`、`Smith`、`Local First Markdown Writing`、`Reliable Export Pipelines` 等参考文献信息。
   - 标题、列表、表格仍带 Prism 导出主题样式。
   - 未出现“Pandoc 引用暂未启用；citekey 会以占位形式保留”的 warning。

## 5. 回退路径

### 5.1 Pandoc 不可用

1. 在设置中心把 `Pandoc 路径` 改成不存在的可执行文件路径。
2. 再次导出 HTML。
3. 期望结果：
   - HTML 仍能生成。
   - 导出内容保留 citekey 占位。
   - UI 出现 warning，说明 Pandoc 引用导出失败并已回退内置导出。
   - 若打开导出失败诊断，诊断文本包含 Pandoc 路径、参考文献文件、CSL 样式文件和错误信息。

### 5.2 参考文献路径无效

1. 将 `参考文献文件` 改成不存在的 `.bib` 路径，或改成 `.txt` 文件。
2. 再次导出 HTML。
3. 期望结果：
   - HTML 仍能生成。
   - 导出内容保留 citekey 占位。
   - warning 或诊断能说明路径不可访问或文件类型不支持。

## 6. 自动验证命令

本功能相关自动验证：

```bash
npm test -- --run src/domains/export/exportPipeline.test.ts src/domains/export/templates.test.ts src/domains/settings/citationSettings.test.ts src/lib/markdownToHtml.test.ts src/domains/editor/extensions/citations.test.ts
npm test -- --run
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
git diff --check
```

涉及 release 打包时补跑：

```bash
npm run tauri:build
```

当前本机若未设置 `TAURI_SIGNING_PRIVATE_KEY`，`npm run tauri:build` 会在 updater 签名阶段失败；只要前端 build、Rust release compile、`.app` / `.dmg` / `.app.tar.gz` bundle 已完成，可记录为签名环境阻塞。

## 7. 当前本机 smoke 状态

本机当前无法完成真实 Pandoc citeproc smoke：

```bash
$ pandoc --version
zsh:1: command not found: pandoc
```

因此本轮没有生成真实 `citation-demo.html` 输出，也没有验证 citeproc 生成的最终参考文献 HTML。当前可确认的范围是：自动测试覆盖导出分支和回退行为，Rust command 单测覆盖 Pandoc 命令参数与路径校验，citation parser 自动测试覆盖 `[see @doe2024]`、`[-@doe/2024]` 和 `@team+paper_2026` 可识别，方括号内 `jane@example.com`、`jane-doe@example.com` 和 `[mail](mailto:jane@example.com)` 不误识别，`npm run tauri:build` 曾验证到前端 build、Rust release compile、`.app` / `.dmg` / `.app.tar.gz` bundle 完成；最后因缺少 `TAURI_SIGNING_PRIVATE_KEY` 在 updater 签名阶段阻塞。

要完成真实 smoke，需要先安装 Pandoc，并确保 Prism 设置中心的 `Pandoc 路径` 检测成功，再按第 3-5 节重跑手动验证。

## 8. 通过标准

- Pandoc 可用时，HTML 导出能生成 citeproc 处理后的引用和参考文献。
- Pandoc 不可用或引用路径错误时，HTML 导出不崩溃，并回退到内置导出。
- 回退时 warning / 诊断文本能解释失败原因。
- PDF / PNG / DOCX 不生成完整参考文献时，仍提示 citekey 会作为占位保留。
