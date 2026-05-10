# Prism 字体资源

本目录存放 Prism 界面使用的自托管字体文件（ADR-0003：本地打包）。

## 已有文件

- `Inter-Variable.woff2`（352KB）— 界面 + 预览正文，Variable 字体覆盖 100-900 字重
  - 来源：https://github.com/rsms/inter/raw/master/docs/font-files/InterVariable.woff2
- `JetBrainsMono-Regular.woff2`（92KB）— 编辑器 + 代码块，Regular 400
- `JetBrainsMono-Medium.woff2`（94KB）— 编辑器 + 代码块，Medium 500
  - 来源：https://github.com/JetBrains/JetBrainsMono/raw/master/fonts/webfonts/

## 挂载方式

`src/styles/global.css` 里 `@font-face` 以相对路径引用 `../assets/fonts/*.woff2`，Vite 构建时会自动把它们作为静态资源处理（带 hash 指纹输出到 `dist/assets/`）。

## 许可证

两套字体均为 **SIL Open Font License 1.1**，允许随应用分发。"关于 Prism" 页面已致谢。
