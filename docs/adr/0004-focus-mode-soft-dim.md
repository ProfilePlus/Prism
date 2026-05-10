# 专注模式用半透明软退让而非完全隐藏

2026-05-10：F8 专注模式下，侧栏 / 菜单栏 / 标题栏保留渲染但 `opacity: 0.25`，鼠标 hover 某一区域时该区域恢复 `opacity: 1`。放弃原实现的"完全隐藏 + Escape 退出"。

## Considered Options
- **完全隐藏**（旧实现）：最大化编辑区；但用户操作菜单时必须先按 Esc 退出专注，打断心流。
- **半透明 + hover 恢复**（原型做法）：视觉上仍能专注于正文，菜单和工具栏随时可见即可用，不需要显式退出。

## Consequences
- `App.tsx` 中 `focusMode` 的条件渲染 `{!workspace.focusMode && <TitleBar />}` 需要改为始终渲染 + `className` 驱动透明度。
- 组件尺寸不变，避免专注模式切换时的布局抖动。
