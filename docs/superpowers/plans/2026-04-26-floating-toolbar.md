# 选中文本浮动工具栏实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 CodeMirror 编辑器中实现选中文本时弹出的浮动格式化工具栏

**Architecture:** 在 EditorPane 中监听 selection 变化，计算选区位置，渲染浮动工具栏。工具栏包含常用 Markdown 格式化按钮（加粗、斜体、代码、链接等）。

**Tech Stack:** React 18, CodeMirror 6, TypeScript

---

## 文件结构

**新建文件：**
- `src/domains/editor/components/FloatingToolbar.tsx` - 浮动工具栏组件
- `src/domains/editor/components/FloatingToolbar.module.css` - 工具栏样式

**修改文件：**
- `src/domains/editor/components/EditorPane.tsx` - 集成浮动工具栏

---

## Task 1: 创建浮动工具栏组件

**Files:**
- Create: `src/domains/editor/components/FloatingToolbar.tsx`
- Create: `src/domains/editor/components/FloatingToolbar.module.css`

- [ ] **Step 1: 创建 FloatingToolbar.tsx**

```typescript
import { FC } from 'react';
import styles from './FloatingToolbar.module.css';

export interface FloatingToolbarProps {
  visible: boolean;
  x: number;
  y: number;
  onFormat: (format: string) => void;
}

export const FloatingToolbar: FC<FloatingToolbarProps> = ({
  visible,
  x,
  y,
  onFormat,
}) => {
  if (!visible) return null;

  const buttons = [
    { icon: 'B', format: 'bold', title: '加粗' },
    { icon: 'I', format: 'italic', title: '斜体' },
    { icon: '<>', format: 'code', title: '行内代码' },
    { icon: '🔗', format: 'link', title: '链接' },
  ];

  return (
    <div
      className={styles.toolbar}
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      {buttons.map((btn) => (
        <button
          key={btn.format}
          className={styles.btn}
          onClick={() => onFormat(btn.format)}
          title={btn.title}
        >
          {btn.icon}
        </button>
      ))}
    </div>
  );
};
```

- [ ] **Step 2: 创建 FloatingToolbar.module.css**

```css
.toolbar {
  position: fixed;
  z-index: 1000;
  display: flex;
  gap: 2px;
  padding: 4px;
  background: var(--layer-2);
  border: 1px solid var(--stroke-control);
  border-radius: var(--radius-md);
  box-shadow: var(--elevation-flyout);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
}

.btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s ease;
}

.btn:hover {
  background: var(--accent-tint);
}

.btn:active {
  background: var(--accent-tint-strong);
}
```

- [ ] **Step 3: 验证类型**

```bash
npx tsc --noEmit
```

Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add src/domains/editor/components/FloatingToolbar.tsx src/domains/editor/components/FloatingToolbar.module.css
git commit -m "feat(editor): add floating toolbar component"
```

---

## Task 2: 集成到 EditorPane

**Files:**
- Modify: `src/domains/editor/components/EditorPane.tsx`

- [ ] **Step 1: 导入 FloatingToolbar**

在文件顶部添加：

```typescript
import { useState, useCallback } from 'react';
import { FloatingToolbar } from './FloatingToolbar';
```

- [ ] **Step 2: 添加工具栏状态**

在 EditorPane 函数内添加：

```typescript
  const [toolbarState, setToolbarState] = useState({
    visible: false,
    x: 0,
    y: 0,
  });
```

- [ ] **Step 3: 添加 selection 监听**

在 EditorView.updateListener 中添加选区变化检测：

```typescript
EditorView.updateListener.of((update: ViewUpdate) => {
  if (update.docChanged) {
    onChangeRef.current(update.state.doc.toString());
  }

  if (update.docChanged || update.selectionSet) {
    onCursorChangeRef.current?.(getCursorPosition(update.view));
    
    // 检测选区
    const selection = update.state.selection.main;
    if (selection.from !== selection.to) {
      // 有选中文本，显示工具栏
      const coords = update.view.coordsAtPos(selection.from);
      if (coords) {
        setToolbarState({
          visible: true,
          x: coords.left,
          y: coords.top - 40, // 工具栏显示在选区上方
        });
      }
    } else {
      // 无选中文本，隐藏工具栏
      setToolbarState({ visible: false, x: 0, y: 0 });
    }
  }
}),
```

- [ ] **Step 4: 实现格式化处理函数**

在 EditorPane 函数内添加：

```typescript
  const handleFormat = useCallback((format: string) => {
    const view = viewRef.current;
    if (!view) return;

    const selection = view.state.selection.main;
    const selectedText = view.state.doc.sliceString(selection.from, selection.to);

    let replacement = '';
    switch (format) {
      case 'bold':
        replacement = `**${selectedText}**`;
        break;
      case 'italic':
        replacement = `*${selectedText}*`;
        break;
      case 'code':
        replacement = `\`${selectedText}\``;
        break;
      case 'link':
        replacement = `[${selectedText}](url)`;
        break;
      default:
        return;
    }

    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: replacement,
      },
      selection: {
        anchor: selection.from + replacement.length,
      },
    });

    view.focus();
    setToolbarState({ visible: false, x: 0, y: 0 });
  }, []);
```

- [ ] **Step 5: 渲染 FloatingToolbar**

在 return 语句中添加：

```typescript
  return (
    <>
      <div
        ref={editorRef}
        style={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          overflow: 'hidden',
        }}
      />
      <FloatingToolbar
        visible={toolbarState.visible}
        x={toolbarState.x}
        y={toolbarState.y}
        onFormat={handleFormat}
      />
    </>
  );
```

- [ ] **Step 6: 验证类型**

```bash
npx tsc --noEmit
```

Expected: 无错误

- [ ] **Step 7: 提交**

```bash
git add src/domains/editor/components/EditorPane.tsx
git commit -m "feat(editor): integrate floating toolbar with selection"
```

---

## Task 3: 手动测试验证

**Files:**
- None (manual testing)

- [ ] **Step 1: 启动开发服务器**

```bash
npm run tauri:dev
```

Expected: 应用启动，无控制台错误

- [ ] **Step 2: 测试浮动工具栏**

手动测试：
- 打开一个 Markdown 文件
- 选中一段文本
- Expected: 浮动工具栏出现在选区上方
- 点击"B"按钮
- Expected: 选中文本被 `**` 包裹，工具栏消失
- 再次选中文本，点击"I"按钮
- Expected: 选中文本被 `*` 包裹
- 测试"<>"（代码）和"🔗"（链接）按钮

- [ ] **Step 3: 测试边界情况**

- 选中文本后点击编辑器其他位置
- Expected: 工具栏消失
- 在没有选中文本时
- Expected: 工具栏不显示

- [ ] **Step 4: 记录测试结果**

在终端输出：
```
✅ 浮动工具栏实现完成
✅ 选中文本时工具栏正确显示
✅ 格式化按钮功能正常
✅ 边界情况处理正确
```

---

## 自查

### 1. Spec coverage
- 浮动工具栏组件 → Task 1 覆盖
- EditorPane 集成 → Task 2 覆盖
- 手动测试 → Task 3 覆盖

### 2. Placeholder scan
- 无 TBD / TODO / implement later
- 每个步骤都有具体的代码或命令
- 所有文件路径都是准确的

### 3. Type consistency
- FloatingToolbarProps 在所有地方一致
- handleFormat 函数签名一致
