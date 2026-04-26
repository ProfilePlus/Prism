# 菜单动作实现设计文档

**日期：** 2026-04-26  
**目标：** 让 MenuBar 的菜单项真正工作，实现核心文件操作、视图切换、主题切换等功能

---

## 背景

当前 Prism 已有完整的菜单 UI（MenuBar、MenuDropdown），但所有菜单项点击后只是 console.log，没有真实功能。本次实现让核心菜单动作真正可用，把应用从"UI 原型"变成"可用产品"。

**当前状态：**
- `App.tsx` 中有 `handleMenuAction(action: string)` 占位函数
- `menuData.ts` 定义了大量 action 名称
- 所有 Tauri API 和 store 已就绪

**目标：**
实现第一批核心动作，让用户能通过菜单完成基本工作流。

---

## 实现范围（核心可用版）

### 第一批真实可用动作

**文件菜单：**
- `new`：新建空白文档
- `open`：打开文件（Tauri 文件选择器）
- `openFolder`：打开文件夹（Tauri 文件夹选择器）
- `save`：保存当前文档
- `print`：打印当前内容（浏览器打印或占位提示）

**视图菜单：**
- `sourceMode`：切换到编辑模式
- `splitMode`：切换到分栏模式
- `previewMode`：切换到预览模式
- `toggleSidebar`：显示/隐藏侧边栏
- `fullscreen`：切换全屏（Tauri API）
- `devTools`：打开开发者工具（Tauri API）
- `actualSize` / `zoomIn` / `zoomOut`：缩放（Tauri Webview 缩放）

**主题切换：**
- `themeLight`：切换到浅色主题
- `themeDark`：切换到深色主题

### 暂不实现的动作

这些先统一给出占位反馈（toast 或 console）：
- 撤销/重做（需要编辑器历史栈）
- 剪切/复制/粘贴（浏览器原生已支持）
- Markdown 结构化编辑（标题、列表、表格等）
- 偏好设置完整面板
- 多窗口管理
- 高级导出链路

---

## 架构设计

### 方案：集中式 action handler

创建 `src/lib/menuActions.ts`，导出一个 `executeMenuAction` 函数：

```typescript
export async function executeMenuAction(
  action: string,
  context: MenuActionContext
): Promise<void>
```

**MenuActionContext 包含：**
- Zustand stores（document、settings、workspace）
- Tauri API 引用
- 当前文档状态
- 回调函数（如 toast 提示）

**实现结构：**
```typescript
export async function executeMenuAction(action, context) {
  switch (action) {
    case 'new': return handleNew(context);
    case 'open': return handleOpen(context);
    case 'save': return handleSave(context);
    // ...
    default: 
      console.log(`[Menu] Unimplemented action: ${action}`);
      context.showToast?.(`功能 "${action}" 即将推出`);
  }
}
```

**App.tsx 调用：**
```typescript
const handleMenuAction = async (action: string) => {
  await executeMenuAction(action, {
    documentStore: useDocumentStore.getState(),
    settingsStore: useSettingsStore.getState(),
    workspaceStore: useWorkspaceStore.getState(),
    showToast: (msg) => console.log(msg), // 或真实 toast
  });
};
```

---

## 核心动作实现细节

### 文件操作

#### new - 新建文档
```typescript
async function handleNew(context) {
  const { documentStore } = context;
  if (documentStore.currentDocument?.isDirty) {
    // 提示保存
    const confirmed = await confirm('当前文档未保存，是否继续？');
    if (!confirmed) return;
  }
  documentStore.createNewDocument();
}
```

#### open - 打开文件
```typescript
async function handleOpen(context) {
  const { documentStore } = context;
  const selected = await open({
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
  });
  if (!selected) return;
  
  const content = await readTextFile(selected);
  documentStore.openDocument(selected, content);
}
```

#### openFolder - 打开文件夹
```typescript
async function handleOpenFolder(context) {
  const { workspaceStore } = context;
  const selected = await open({ directory: true });
  if (!selected) return;
  
  workspaceStore.openFolder(selected);
}
```

#### save - 保存文档
```typescript
async function handleSave(context) {
  const { documentStore } = context;
  const doc = documentStore.currentDocument;
  if (!doc) return;
  
  if (!doc.path) {
    // 另存为
    const savePath = await save({
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    });
    if (!savePath) return;
    await writeTextFile(savePath, doc.content);
    documentStore.updateDocumentPath(savePath);
  } else {
    await writeTextFile(doc.path, doc.content);
  }
  documentStore.markSaved();
}
```

#### print - 打印
```typescript
async function handlePrint(context) {
  // 方案 1：浏览器打印
  window.print();
  
  // 方案 2：占位提示
  // context.showToast?.('打印功能即将推出');
}
```

### 视图切换

#### sourceMode / splitMode / previewMode
```typescript
async function handleViewMode(mode: 'edit' | 'split' | 'preview', context) {
  const { documentStore } = context;
  documentStore.setViewMode(mode);
}
```

#### toggleSidebar
```typescript
async function handleToggleSidebar(context) {
  const { workspaceStore } = context;
  workspaceStore.toggleSidebar();
}
```

#### fullscreen
```typescript
async function handleFullscreen(context) {
  const { appWindow } = await import('@tauri-apps/api/window');
  const isFullscreen = await appWindow.isFullscreen();
  await appWindow.setFullscreen(!isFullscreen);
}
```

#### devTools
```typescript
async function handleDevTools(context) {
  const { invoke } = await import('@tauri-apps/api/tauri');
  await invoke('toggle_devtools');
}
```

#### zoom
```typescript
async function handleZoom(action: 'in' | 'out' | 'reset', context) {
  const { appWindow } = await import('@tauri-apps/api/window');
  const currentZoom = await appWindow.scaleFactor();
  
  let newZoom = currentZoom;
  if (action === 'in') newZoom = currentZoom * 1.1;
  else if (action === 'out') newZoom = currentZoom * 0.9;
  else newZoom = 1.0;
  
  await appWindow.setScaleFactor(newZoom);
}
```

### 主题切换

```typescript
async function handleTheme(theme: 'light' | 'dark', context) {
  const { settingsStore } = context;
  settingsStore.setTheme(theme);
}
```

---

## 数据流

```
用户点击菜单项
  ↓
MenuDropdown 触发 onAction(action)
  ↓
MenuBar 传递给 App.tsx 的 handleMenuAction
  ↓
executeMenuAction(action, context)
  ↓
根据 action 分发到具体 handler
  ↓
handler 调用 Tauri API / 更新 store
  ↓
UI 自动响应 store 变化
```

---

## 错误处理

所有 Tauri API 调用都包裹在 try-catch 中：

```typescript
async function handleOpen(context) {
  try {
    const selected = await open({ ... });
    // ...
  } catch (err) {
    console.error('[Menu] Open file failed:', err);
    context.showToast?.('打开文件失败');
  }
}
```

---

## 测试策略

### 手动测试清单
- [ ] 新建文档：清空编辑器
- [ ] 打开文件：选择 .md 文件，内容正确加载
- [ ] 打开文件夹：侧边栏显示文件树
- [ ] 保存文档：修改后保存，isDirty 标记清除
- [ ] 打印：浏览器打印对话框弹出
- [ ] 视图切换：编辑/分栏/预览模式正确切换
- [ ] 侧边栏切换：显示/隐藏正常
- [ ] 全屏：窗口全屏/退出全屏
- [ ] 开发者工具：DevTools 打开
- [ ] 缩放：界面放大/缩小/重置
- [ ] 主题切换：浅色/深色主题正确应用

### 单元测试（可选）
- 测试 `executeMenuAction` 的分发逻辑
- Mock Tauri API，验证调用参数

---

## 风险与应对

### 风险 1：Tauri API 权限
**问题：** 某些 Tauri API 可能需要在 `tauri.conf.json` 中配置权限  
**应对：** 实现时检查权限配置，必要时更新配置文件

### 风险 2：未保存提示
**问题：** 新建/打开文件时，如果当前文档未保存，需要提示用户  
**应对：** 在 `handleNew` 和 `handleOpen` 中检查 `isDirty`，使用 Tauri 的 `confirm` 对话框

### 风险 3：占位动作反馈不一致
**问题：** 未实现的动作可能给出不同的反馈（console / toast / 无反应）  
**应对：** 统一在 default case 中给出一致的占位反馈

---

## 成功标准

- ✅ 文件菜单：新建、打开、保存、打印可用
- ✅ 视图菜单：模式切换、侧边栏、全屏、缩放可用
- ✅ 主题切换：浅色/深色主题可用
- ✅ 未实现动作：统一占位反馈
- ✅ 错误处理：所有 Tauri API 调用有 try-catch
- ✅ 手动测试：所有核心动作验证通过

---

## 后续工作

本次实现完成后，菜单系统已可用。后续可以逐步添加：
1. 撤销/重做（需要编辑器历史栈）
2. Markdown 结构化编辑动作
3. 偏好设置完整面板
4. 多窗口管理
5. 高级导出链路
