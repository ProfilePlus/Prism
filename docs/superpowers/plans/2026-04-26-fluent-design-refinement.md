# Fluent Design 视觉精修实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立完整的设计 token 体系，统一全局视觉细节，让所有组件使用一致的视觉语言

**Architecture:** 在 global.css 中添加完整的设计 token（圆角、强调色），然后按优先级迁移组件：先 shell 组件（WindowShell、TitleBar、MenuBar、MenuDropdown），再业务组件。每个组件迁移后立即验证浅色/深色模式。

**Tech Stack:** CSS Variables, CSS Modules, React 18

---

## 文件结构

**修改文件：**
- `src/styles/global.css` - 添加设计 token
- `src/components/shell/WindowShell.module.css` - 迁移到 token
- `src/components/shell/TitleBar.module.css` - 迁移到 token
- `src/components/shell/MenuBar.module.css` - 迁移到 token
- `src/components/shell/MenuDropdown.module.css` - 迁移到 token

---

## Task 1: 扩展 global.css 设计 token

**Files:**
- Modify: `src/styles/global.css`

- [ ] **Step 1: 在 :root 中添加圆角 token**

在 `:root` 的 Fluent Design tokens 部分后添加：

```css
  /* 圆角 */
  --radius-sm: 4px;
  --radius-md: 7px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-window: 14px;
```

- [ ] **Step 2: 在 :root 中添加强调色 token**

在圆角 token 后添加：

```css
  /* 强调色 */
  --accent: #0067C0;
  --accent-hover: #0078D4;
  --accent-tint: rgba(0, 103, 192, 0.08);
  --accent-tint-strong: rgba(0, 103, 192, 0.16);
```

- [ ] **Step 3: 在 body.dark 中添加深色模式的强调色 token**

在 `body.dark` 的 Fluent Design tokens 部分后添加：

```css
  /* 强调色 - dark */
  --accent: #60CDFF;
  --accent-hover: #99EBFF;
  --accent-tint: rgba(96, 205, 255, 0.10);
  --accent-tint-strong: rgba(96, 205, 255, 0.20);
```

注意：圆角 token 在深色模式下保持不变，不需要重复定义。

- [ ] **Step 4: 验证 CSS 语法**

```bash
npx tsc --noEmit
```

Expected: 无错误

- [ ] **Step 5: 提交**

```bash
git add src/styles/global.css
git commit -m "feat(design): add design tokens for radius and accent colors"
```

---

## Task 2: 迁移 WindowShell 组件

**Files:**
- Modify: `src/components/shell/WindowShell.module.css`

- [ ] **Step 1: 替换 border-radius**

```css
/* 修改前 */
.windowShell {
  border-radius: 14px;
}

/* 修改后 */
.windowShell {
  border-radius: var(--radius-window);
}
```

- [ ] **Step 2: 替换 border 颜色**

```css
/* 修改前 */
border: 1px solid rgba(0, 0, 0, 0.0578);

/* 修改后 */
border: 1px solid var(--stroke-surface);
```

- [ ] **Step 3: 替换 background**

```css
/* 修改前 */
background: rgba(255, 255, 255, 0.72);

/* 修改后 */
background: var(--layer-1);
```

- [ ] **Step 4: 验证深色模式的 border**

确保 `body.dark .windowShell` 的 border-color 也使用 token：

```css
body.dark .windowShell {
  border-color: var(--stroke-surface);
  background: var(--layer-1);
}
```

- [ ] **Step 5: 启动开发服务器验证**

```bash
npm run tauri dev
```

Expected: WindowShell 在浅色/深色模式下视觉正常

- [ ] **Step 6: 提交**

```bash
git add src/components/shell/WindowShell.module.css
git commit -m "refactor(shell): migrate WindowShell to design tokens"
```

---

## Task 3: 迁移 TitleBar 组件

**Files:**
- Modify: `src/components/shell/TitleBar.module.css`

- [ ] **Step 1: 替换 border-bottom 颜色**

```css
/* 修改前 */
.titlebar {
  border-bottom: 1px solid rgba(0, 0, 0, 0.0578);
}

/* 修改后 */
.titlebar {
  border-bottom: 1px solid var(--stroke-surface);
}
```

- [ ] **Step 2: 替换按钮 hover 背景**

```css
/* 修改前 */
.btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

/* 修改后 */
.btn:hover {
  background: var(--accent-tint);
}
```

- [ ] **Step 3: 验证深色模式**

确保 `body.dark` 的样式也使用 token：

```css
body.dark .titlebar {
  border-bottom-color: var(--stroke-surface);
}

body.dark .btn:hover {
  background: var(--accent-tint);
}
```

- [ ] **Step 4: 验证视觉效果**

```bash
npm run tauri dev
```

Expected: TitleBar 按钮 hover 时显示蓝色淡背景，深色模式下显示青色淡背景

- [ ] **Step 5: 提交**

```bash
git add src/components/shell/TitleBar.module.css
git commit -m "refactor(shell): migrate TitleBar to design tokens"
```

---

## Task 4: 迁移 MenuBar 组件

**Files:**
- Modify: `src/components/shell/MenuBar.module.css`

- [ ] **Step 1: 替换 menubar border-bottom**

```css
/* 修改前 */
.menubar {
  border-bottom: 1px solid rgba(0, 0, 0, 0.0578);
}

/* 修改后 */
.menubar {
  border-bottom: 1px solid var(--stroke-surface);
}
```

- [ ] **Step 2: 替换 menuItem border-radius**

```css
/* 修改前 */
.menuItem {
  border-radius: 4px;
}

/* 修改后 */
.menuItem {
  border-radius: var(--radius-sm);
}
```

- [ ] **Step 3: 替换 menuItem hover 背景**

```css
/* 修改前 */
.menuItem:hover {
  background: rgba(0, 103, 192, 0.08);
}

/* 修改后 */
.menuItem:hover {
  background: var(--accent-tint);
}
```

- [ ] **Step 4: 替换 menuItem active 样式**

```css
/* 修改前 */
.menuItem.active {
  background: rgba(0, 103, 192, 0.16);
  color: #0067C0;
}

/* 修改后 */
.menuItem.active {
  background: var(--accent-tint-strong);
  color: var(--accent);
}
```

- [ ] **Step 5: 验证深色模式**

确保 `body.dark` 的样式使用 token：

```css
body.dark .menubar {
  border-bottom-color: var(--stroke-surface);
}

body.dark .menuItem:hover {
  background: var(--accent-tint);
}

body.dark .menuItem.active {
  background: var(--accent-tint-strong);
  color: var(--accent);
}
```

- [ ] **Step 6: 验证交互效果**

```bash
npm run tauri dev
```

Expected: 
- 菜单项 hover 时显示淡蓝色背景
- 菜单项 active 时显示深蓝色背景和蓝色文字
- 深色模式下显示青色系

- [ ] **Step 7: 提交**

```bash
git add src/components/shell/MenuBar.module.css
git commit -m "refactor(shell): migrate MenuBar to design tokens"
```

---

## Task 5: 迁移 MenuDropdown 组件

**Files:**
- Modify: `src/components/shell/MenuDropdown.module.css`

- [ ] **Step 1: 替换 dropdown border-radius**

```css
/* 修改前 */
.dropdown {
  border-radius: 8px;
}

/* 修改后 */
.dropdown {
  border-radius: var(--radius-lg);
}
```

- [ ] **Step 2: 替换 dropdown border 和 background**

```css
/* 修改前 */
border: 1px solid rgba(0, 0, 0, 0.14);
background: rgba(255, 255, 255, 0.88);

/* 修改后 */
border: 1px solid var(--stroke-control);
background: var(--layer-2);
```

- [ ] **Step 3: 替换 dropdown box-shadow**

```css
/* 修改前 */
box-shadow: 0 8px 16px rgba(0, 0, 0, 0.14), 0 0 1px rgba(0, 0, 0, 0.06);

/* 修改后 */
box-shadow: var(--elevation-flyout);
```

- [ ] **Step 4: 替换 item border-radius**

```css
/* 修改前 */
.item {
  border-radius: 4px;
}

/* 修改后 */
.item {
  border-radius: var(--radius-sm);
}
```

- [ ] **Step 5: 替换 item hover 背景**

```css
/* 修改前 */
.item:hover {
  background: rgba(0, 103, 192, 0.08);
}

/* 修改后 */
.item:hover {
  background: var(--accent-tint);
}
```

- [ ] **Step 6: 替换 separator 背景**

```css
/* 修改前 */
.separator {
  background: rgba(0, 0, 0, 0.0803);
}

/* 修改后 */
.separator {
  background: var(--stroke-divider);
}
```

- [ ] **Step 7: 验证深色模式**

确保 `body.dark` 的样式使用 token：

```css
body.dark .dropdown {
  background: var(--layer-2);
  border-color: var(--stroke-control);
  box-shadow: var(--elevation-flyout);
}

body.dark .item:hover {
  background: var(--accent-tint);
}

body.dark .separator {
  background: var(--stroke-divider);
}
```

- [ ] **Step 8: 验证下拉菜单效果**

```bash
npm run tauri dev
```

Expected:
- 点击菜单项，下拉菜单正常显示
- 菜单项 hover 时显示淡蓝色背景
- 分隔线清晰可见
- 深色模式下视觉正常

- [ ] **Step 9: 提交**

```bash
git add src/components/shell/MenuDropdown.module.css
git commit -m "refactor(shell): migrate MenuDropdown to design tokens"
```

---

## Task 6: 扫描并迁移业务组件

**Files:**
- Potentially modify: CSS files in `src/domains/`

- [ ] **Step 1: 查找硬编码的圆角值**

```bash
grep -r "border-radius: [0-9]" src/domains --include="*.css"
```

Expected: 列出所有硬编码圆角的位置

- [ ] **Step 2: 查找硬编码的 rgba 值**

```bash
grep -r "rgba(" src/domains --include="*.css" | grep -v "var(--"
```

Expected: 列出所有硬编码 rgba 的位置（排除已使用变量的）

- [ ] **Step 3: 逐个替换硬编码值**

根据 Step 1 和 Step 2 的结果，按以下规则替换：

- `border-radius: 4px` → `var(--radius-sm)`
- `border-radius: 6px` → `var(--radius-md)`
- `border-radius: 8px` → `var(--radius-lg)`
- `rgba(0, 0, 0, 0.08)` → `var(--stroke-surface)` 或保持 `var(--border-color)`
- hover 背景色 → `var(--accent-tint)` 或保持 `var(--bg-hover)`

如果某个文件没有使用 CSS Modules，保持现状。

- [ ] **Step 4: 验证所有修改**

```bash
npm run tauri dev
```

Expected: 所有组件视觉正常，无明显变化

- [ ] **Step 5: 运行类型检查**

```bash
npx tsc --noEmit
```

Expected: 无错误

- [ ] **Step 6: 提交**

```bash
git add src/domains
git commit -m "refactor(domains): migrate business components to design tokens"
```

---

## Task 7: 最终验证

**Files:**
- None (verification only)

- [ ] **Step 1: 启动开发服务器**

```bash
npm run tauri dev
```

- [ ] **Step 2: 验证浅色模式**

检查项：
- WindowShell 圆角和边框正常
- TitleBar 按钮 hover 显示淡蓝色
- MenuBar 菜单项 hover/active 显示蓝色系
- MenuDropdown 下拉菜单显示正常，菜单项 hover 显示淡蓝色

- [ ] **Step 3: 切换到深色模式**

在应用中切换到深色模式（如果有主题切换功能）

- [ ] **Step 4: 验证深色模式**

检查项：
- WindowShell 边框和背景正常
- TitleBar 按钮 hover 显示淡青色
- MenuBar 菜单项 hover/active 显示青色系
- MenuDropdown 下拉菜单显示正常，菜单项 hover 显示淡青色

- [ ] **Step 5: 检查是否有遗漏的硬编码**

```bash
grep -r "rgba(" src/components/shell --include="*.css" | grep -v "var(--"
```

Expected: 无输出（所有 rgba 都已使用变量）

- [ ] **Step 6: 运行类型检查**

```bash
npx tsc --noEmit
```

Expected: 无错误

- [ ] **Step 7: 记录完成**

在终端输出：
```
✅ Fluent Design 视觉精修完成
✅ 设计 token 体系已建立
✅ Shell 组件已完全迁移
✅ 浅色/深色模式验证通过
```

---

## 自查

### 1. Spec coverage
- 设计 token 体系（圆角、强调色、表面、阴影）→ Task 1 覆盖
- Shell 组件迁移（WindowShell、TitleBar、MenuBar、MenuDropdown）→ Task 2-5 覆盖
- 业务组件迁移 → Task 6 覆盖
- 验证 → Task 7 覆盖

### 2. Placeholder scan
- 无 TBD / TODO / implement later
- 每个步骤都有具体的代码或命令
- 所有文件路径都是准确的

### 3. Type consistency
- CSS 变量名在所有任务中一致
- `--radius-sm`, `--accent-tint` 等名称在所有地方保持一致
