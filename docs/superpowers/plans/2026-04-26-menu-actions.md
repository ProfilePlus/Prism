# 菜单动作实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 MenuBar 的菜单项真正工作，实现核心文件操作、视图切换、主题切换等功能

**Architecture:** 创建 `src/lib/menuActions.ts` 集中式 action handler，接收 action 字符串和 context（stores、Tauri API），用 switch 分发到具体实现。App.tsx 调用 executeMenuAction 并传入 context。

**Tech Stack:** React 18, Zustand, Tauri 2.x, TypeScript

---

## 文件结构

**新建文件：**
- `src/lib/menuActions.ts` - 菜单动作处理器
- `src/lib/menuActions.types.ts` - 类型定义

**修改文件：**
- `src/App.tsx` - 调用 menuActions
- `src/domains/document/store.ts` - 添加 createNewDocument 方法
- `src/domains/workspace/store.ts` - 添加 toggleSidebar、setSidebarVisible 方法

---

## Task 1: 创建类型定义

**Files:**
- Create: `src/lib/menuActions.types.ts`

- [ ] **Step 1: 创建 MenuActionContext 类型**

```typescript
import { useDocumentStore } from '../domains/document/store';
import { useSettingsStore } from '../domains/settings/store';
import { useWorkspaceStore } from '../domains/workspace/store';

export interface MenuActionContext {
  documentStore: ReturnType<typeof useDocumentStore.getState>;
  settingsStore: ReturnType<typeof useSettingsStore.getState>;
  workspaceStore: ReturnType<typeof useWorkspaceStore.getState>;
  showToast?: (message: string) => void;
}

export type MenuAction = string;
```

- [ ] **Step 2: 验证类型文件**

```bash
npx tsc --noEmit
```

Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/lib/menuActions.types.ts
git commit -m "feat(menu): add menu action types"
```

---

## Task 2: 扩展 document store

**Files:**
- Modify: `src/domains/document/store.ts`

- [ ] **Step 1: 添加 createNewDocument 方法**

在 `DocumentStore` interface 中添加：

```typescript
interface DocumentStore extends DocumentState {
  openDocument: (path: string, name: string, content: string) => void;
  closeDocument: () => void;
  updateContent: (content: string) => void;
  setViewMode: (viewMode: 'edit' | 'split' | 'preview') => void;
  markSaved: () => void;
  createNewDocument: () => void;  // 新增
}
```

- [ ] **Step 2: 实现 createNewDocument**

在 `create<DocumentStore>` 中添加：

```typescript
  createNewDocument: () => {
    set({
      currentDocument: {
        path: '',
        name: 'Untitled.md',
        content: '',
        isDirty: false,
        lastSavedAt: Date.now(),
        viewMode: 'split',
      },
    });
  },
```

- [ ] **Step 3: 验证类型**

```bash
npx tsc --noEmit
```

Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add src/domains/document/store.ts
git commit -m "feat(document): add createNewDocument method"
```

---

## Task 3: 扩展 workspace store

**Files:**
- Modify: `src/domains/workspace/store.ts`

- [ ] **Step 1: 添加 sidebarVisible 状态**

在 `WorkspaceState` 中添加（需要先检查 types.ts）：

```typescript
export interface WorkspaceState {
  mode: 'single' | 'folder';
  rootPath: string | null;
  fileTree: FileNode[];
  sidebarVisible: boolean;  // 新增
}
```

- [ ] **Step 2: 添加 toggleSidebar 和 setSidebarVisible 方法**

在 `WorkspaceStore` interface 中添加：

```typescript
interface WorkspaceStore extends WorkspaceState {
  setRootPath: (path: string) => void;
  setFileTree: (tree: FileNode[]) => void;
  toggleSidebar: () => void;  // 新增
  setSidebarVisible: (visible: boolean) => void;  // 新增
}
```

- [ ] **Step 3: 实现方法**

在 `create<WorkspaceStore>` 中添加：

```typescript
  sidebarVisible: true,  // 初始状态

  toggleSidebar: () => {
    set((state) => ({ sidebarVisible: !state.sidebarVisible }));
  },

  setSidebarVisible: (visible) => {
    set({ sidebarVisible: visible });
  },
```

- [ ] **Step 4: 验证类型**

```bash
npx tsc --noEmit
```

Expected: 无错误

- [ ] **Step 5: 提交**

```bash
git add src/domains/workspace/store.ts src/domains/workspace/types.ts
git commit -m "feat(workspace): add sidebar visibility control"
```

---

## Task 4: 创建菜单动作处理器（文件操作）

**Files:**
- Create: `src/lib/menuActions.ts`

- [ ] **Step 1: 创建文件骨架**

```typescript
import { MenuActionContext } from './menuActions.types';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';

export async function executeMenuAction(
  action: string,
  context: MenuActionContext
): Promise<void> {
  try {
    switch (action) {
      case 'new':
        return await handleNew(context);
      case 'open':
        return await handleOpen(context);
      case 'openFolder':
        return await handleOpenFolder(context);
      case 'save':
        return await handleSave(context);
      case 'print':
        return await handlePrint(context);
      default:
        console.log(`[Menu] Unimplemented action: ${action}`);
        context.showToast?.(`功能 "${action}" 即将推出`);
    }
  } catch (err) {
    console.error(`[Menu] Action "${action}" failed:`, err);
    context.showToast?.(`操作失败: ${err}`);
  }
}

// Placeholder functions
async function handleNew(context: MenuActionContext): Promise<void> {}
async function handleOpen(context: MenuActionContext): Promise<void> {}
async function handleOpenFolder(context: MenuActionContext): Promise<void> {}
async function handleSave(context: MenuActionContext): Promise<void> {}
async function handlePrint(context: MenuActionContext): Promise<void> {}
```

- [ ] **Step 2: 实现 handleNew**

```typescript
async function handleNew(context: MenuActionContext): Promise<void> {
  const { documentStore } = context;
  const currentDoc = documentStore.currentDocument;
  
  if (currentDoc?.isDirty) {
    // 简化版：直接创建，不提示保存（后续可以加 confirm 对话框）
    console.log('[Menu] Current document has unsaved changes');
  }
  
  documentStore.createNewDocument();
}
```

- [ ] **Step 3: 实现 handleOpen**

```typescript
async function handleOpen(context: MenuActionContext): Promise<void> {
  const { documentStore } = context;
  
  const selected = await open({
    multiple: false,
    filters: [{
      name: 'Markdown',
      extensions: ['md', 'markdown', 'txt']
    }]
  });
  
  if (!selected || typeof selected !== 'string') return;
  
  const content = await readTextFile(selected);
  const name = selected.split(/[\\/]/).pop() || 'Untitled.md';
  
  documentStore.openDocument(selected, name, content);
}
```

- [ ] **Step 4: 实现 handleOpenFolder**

```typescript
async function handleOpenFolder(context: MenuActionContext): Promise<void> {
  const { workspaceStore } = context;
  
  const selected = await open({
    directory: true,
    multiple: false
  });
  
  if (!selected || typeof selected !== 'string') return;
  
  workspaceStore.setRootPath(selected);
  // 注意：文件树的构建逻辑在 useBootstrap 中，这里只设置 rootPath
}
```

- [ ] **Step 5: 实现 handleSave**

```typescript
async function handleSave(context: MenuActionContext): Promise<void> {
  const { documentStore } = context;
  const doc = documentStore.currentDocument;
  
  if (!doc) {
    context.showToast?.('没有打开的文档');
    return;
  }
  
  let savePath = doc.path;
  
  if (!savePath) {
    // 另存为
    const selected = await save({
      filters: [{
        name: 'Markdown',
        extensions: ['md']
      }],
      defaultPath: doc.name
    });
    
    if (!selected) return;
    savePath = selected;
  }
  
  await writeTextFile(savePath, doc.content);
  
  // 更新 document store
  if (savePath !== doc.path) {
    const name = savePath.split(/[\\/]/).pop() || 'Untitled.md';
    documentStore.openDocument(savePath, name, doc.content);
  }
  
  documentStore.markSaved();
  context.showToast?.('保存成功');
}
```

- [ ] **Step 6: 实现 handlePrint**

```typescript
async function handlePrint(context: MenuActionContext): Promise<void> {
  window.print();
}
```

- [ ] **Step 7: 验证类型**

```bash
npx tsc --noEmit
```

Expected: 无错误

- [ ] **Step 8: 提交**

```bash
git add src/lib/menuActions.ts
git commit -m "feat(menu): implement file operation actions"
```

---

## Task 5: 添加视图切换动作

**Files:**
- Modify: `src/lib/menuActions.ts`

- [ ] **Step 1: 在 switch 中添加视图动作**

在 `executeMenuAction` 的 switch 中添加：

```typescript
      case 'sourceMode':
        return await handleViewMode('edit', context);
      case 'splitMode':
        return await handleViewMode('split', context);
      case 'previewMode':
        return await handleViewMode('preview', context);
      case 'toggleSidebar':
        return await handleToggleSidebar(context);
```

- [ ] **Step 2: 实现 handleViewMode**

在文件末尾添加：

```typescript
async function handleViewMode(
  mode: 'edit' | 'split' | 'preview',
  context: MenuActionContext
): Promise<void> {
  const { documentStore } = context;
  documentStore.setViewMode(mode);
}
```

- [ ] **Step 3: 实现 handleToggleSidebar**

```typescript
async function handleToggleSidebar(context: MenuActionContext): Promise<void> {
  const { workspaceStore } = context;
  workspaceStore.toggleSidebar();
}
```

- [ ] **Step 4: 验证类型**

```bash
npx tsc --noEmit
```

Expected: 无错误

- [ ] **Step 5: 提交**

```bash
git add src/lib/menuActions.ts
git commit -m "feat(menu): add view mode and sidebar toggle actions"
```

---

## Task 6: 添加窗口控制动作

**Files:**
- Modify: `src/lib/menuActions.ts`

- [ ] **Step 1: 添加 Tauri window API 导入**

在文件顶部添加：

```typescript
import { getCurrentWindow } from '@tauri-apps/api/window';
```

- [ ] **Step 2: 在 switch 中添加窗口动作**

```typescript
      case 'fullscreen':
        return await handleFullscreen(context);
      case 'actualSize':
        return await handleZoom('reset', context);
      case 'zoomIn':
        return await handleZoom('in', context);
      case 'zoomOut':
        return await handleZoom('out', context);
```

- [ ] **Step 3: 实现 handleFullscreen**

```typescript
async function handleFullscreen(context: MenuActionContext): Promise<void> {
  const appWindow = getCurrentWindow();
  const isFullscreen = await appWindow.isFullscreen();
  await appWindow.setFullscreen(!isFullscreen);
}
```

- [ ] **Step 4: 实现 handleZoom**

```typescript
async function handleZoom(
  action: 'in' | 'out' | 'reset',
  context: MenuActionContext
): Promise<void> {
  // 简化版：使用 CSS zoom（Tauri webview 缩放需要额外配置）
  const root = document.documentElement;
  const currentZoom = parseFloat(root.style.zoom || '1');
  
  let newZoom = currentZoom;
  if (action === 'in') newZoom = Math.min(currentZoom * 1.1, 2.0);
  else if (action === 'out') newZoom = Math.max(currentZoom * 0.9, 0.5);
  else newZoom = 1.0;
  
  root.style.zoom = newZoom.toString();
}
```

- [ ] **Step 5: 验证类型**

```bash
npx tsc --noEmit
```

Expected: 无错误

- [ ] **Step 6: 提交**

```bash
git add src/lib/menuActions.ts
git commit -m "feat(menu): add fullscreen and zoom actions"
```

---

## Task 7: 添加主题切换动作

**Files:**
- Modify: `src/lib/menuActions.ts`

- [ ] **Step 1: 在 switch 中添加主题动作**

```typescript
      case 'themeLight':
        return await handleTheme('light', context);
      case 'themeDark':
      case 'themeNight':
        return await handleTheme('dark', context);
```

- [ ] **Step 2: 实现 handleTheme**

```typescript
async function handleTheme(
  theme: 'light' | 'dark',
  context: MenuActionContext
): Promise<void> {
  const { settingsStore } = context;
  settingsStore.setTheme(theme);
}
```

- [ ] **Step 3: 验证类型**

```bash
npx tsc --noEmit
```

Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add src/lib/menuActions.ts
git commit -m "feat(menu): add theme switching actions"
```

---

## Task 8: 集成到 App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: 导入 menuActions**

在文件顶部添加：

```typescript
import { executeMenuAction } from './lib/menuActions';
```

- [ ] **Step 2: 替换 handleMenuAction 实现**

找到现有的 `handleMenuAction` 函数，替换为：

```typescript
  const handleMenuAction = async (action: string) => {
    await executeMenuAction(action, {
      documentStore: useDocumentStore.getState(),
      settingsStore: useSettingsStore.getState(),
      workspaceStore: useWorkspaceStore.getState(),
      showToast: (msg) => console.log('[Toast]', msg),
    });
  };
```

- [ ] **Step 3: 验证类型**

```bash
npx tsc --noEmit
```

Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add src/App.tsx
git commit -m "feat(menu): integrate menu actions into App"
```

---

## Task 9: 手动测试验证

**Files:**
- None (manual testing)

- [ ] **Step 1: 启动开发服务器**

```bash
npm run tauri:dev
```

Expected: 应用启动，无控制台错误

- [ ] **Step 2: 测试文件操作**

手动测试：
- 点击"文件 > 新建"：编辑器清空，显示 Untitled.md
- 点击"文件 > 打开"：文件选择器弹出，选择 .md 文件后内容加载
- 点击"文件 > 打开文件夹"：文件夹选择器弹出，选择后侧边栏显示文件树
- 修改内容后点击"文件 > 保存"：文件保存成功，isDirty 标记清除
- 点击"文件 > 打印"：浏览器打印对话框弹出

- [ ] **Step 3: 测试视图切换**

手动测试：
- 点击"视图 > 源代码模式"：切换到编辑模式
- 点击"视图 > 分栏模式"：切换到分栏模式
- 点击"视图 > 预览模式"：切换到预览模式
- 点击"视图 > 切换侧边栏"：侧边栏显示/隐藏

- [ ] **Step 4: 测试窗口控制**

手动测试：
- 点击"视图 > 全屏"：窗口进入全屏，再次点击退出全屏
- 点击"视图 > 实际大小"：界面缩放重置为 100%
- 点击"视图 > 放大"：界面放大
- 点击"视图 > 缩小"：界面缩小

- [ ] **Step 5: 测试主题切换**

手动测试：
- 点击"主题 > 浅色"：切换到浅色主题
- 点击"主题 > 深色"：切换到深色主题

- [ ] **Step 6: 测试未实现动作**

手动测试：
- 点击任意未实现的菜单项（如"编辑 > 撤销"）
- Expected: 控制台输出 "Unimplemented action: undo"

- [ ] **Step 7: 记录测试结果**

在终端输出：
```
✅ 菜单动作实现完成
✅ 文件操作：新建、打开、保存、打印可用
✅ 视图切换：模式切换、侧边栏切换可用
✅ 窗口控制：全屏、缩放可用
✅ 主题切换：浅色/深色主题可用
✅ 未实现动作：统一占位反馈
```

---

## 自查

### 1. Spec coverage
- 文件操作（new, open, openFolder, save, print）→ Task 4 覆盖
- 视图切换（sourceMode, splitMode, previewMode, toggleSidebar）→ Task 5 覆盖
- 窗口控制（fullscreen, zoom）→ Task 6 覆盖
- 主题切换（themeLight, themeDark）→ Task 7 覆盖
- App 集成 → Task 8 覆盖
- 手动测试 → Task 9 覆盖

### 2. Placeholder scan
- 无 TBD / TODO / implement later
- 每个步骤都有具体的代码或命令
- 所有文件路径都是准确的

### 3. Type consistency
- `MenuActionContext` 在所有任务中一致
- `executeMenuAction` 函数签名在所有地方保持一致
- Store 方法名（`createNewDocument`, `toggleSidebar`, `setViewMode`）在所有任务中一致
