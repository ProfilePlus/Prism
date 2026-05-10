# Prism 字体资源

本目录存放 Prism 界面使用的自托管字体文件（ADR-0003 决定本地打包）。

## 需要下载的文件

**Inter（界面 + 预览正文）** — Variable 字体，覆盖 400-700 字重

- `Inter-Variable.woff2`
- 下载：https://github.com/rsms/inter/releases/latest（解压后取 `Inter-Variable.woff2`，或 `web/` 下的 `InterVariable.woff2`，统一重命名为 `Inter-Variable.woff2`）

**JetBrains Mono（编辑器 + 代码块）** — Regular + Medium 两档字重

- `JetBrainsMono-Regular.woff2`
- `JetBrainsMono-Medium.woff2`
- 下载：https://github.com/JetBrains/JetBrainsMono/releases/latest（解压后取 `fonts/webfonts/` 下对应文件）

## 文件就位后

`src/styles/global.css` 的 `@font-face` 会通过 Vite 资源处理自动打包到产物。开发时 `pnpm tauri dev` 可直接预览。

## 许可证

两套字体均为 **SIL Open Font License 1.1**，允许随应用分发。合并到 `NOTICE` 或"关于 Prism"页面即可。
