# Prism Markdown 编辑器设计文档

**日期**: 2026-04-25  
**项目**: Prism  
**目标**: 从 HTML 原型演进为基于 Tauri 的生产级 Windows Markdown 桌面应用

---

## 1. 项目定位

Prism 是一个现代化的 Windows Markdown 桌面编辑器，视觉风格采用 Windows 11 Fluent Design，功能架构参考 Typora，但强调更现代的界面语言和更完整的桌面工作流支持。

第一阶段目标不是 demo，而是一个接近可用产品版的桌面应用。

---

## 2. 已确认约束

- **交付形态**: 桌面应用
- **桌面框架**: Tauri
- **文件系统模式**: 混合模式（支持单文件打开，也支持打开文件夹作为工作区）
- **第一阶段目标**: 接近可用产品版
- **前端技术栈**: React + TypeScript + Vite
- **配置持久化**: 使用操作系统标准配置目录（Windows `%APPDATA%/Prism/`）
- **性能边界**: 轻量级定位（< 10MB Markdown 文件）
- **插件系统**: 第一版不做
- **导出功能**: 原生支持 HTML 和 PDF 导出
- **Markdown 语法范围**: GFM + 数学公式 + Mermaid

---

## 3. 推荐架构

采用**文档中心架构**，将系统按领域拆分，避免原型阶段单文件实现带来的耦合问题。

### 3.1 技术栈

- 前端: React 18 + TypeScript + Vite
- 桌面壳: Tauri 2.x
- 状态管理: Zustand
- Markdown 渲染: unified（remark + rehype）
- 数学公式: KaTeX
- 图表: Mermaid
- 编辑器: CodeMirror 6
- PDF 导出: Tauri shell/打印能力

### 3.2 项目结构

```text
prism/
├── src/
│   ├── domains/
│   │   ├── workspace/
│   │   ├── document/
│   │   ├── editor/
│   │   ├── export/
│   │   └── settings/
│   ├── components/
│   ├── lib/
│   ├── styles/
│   ├── App.tsx
│   └── main.tsx
├── src-tauri/
│   ├── src/
│   │   ├── commands/
│   │   └── main.rs
│   └── tauri.conf.json
└── package.json
```

### 3.3 领域边界

- **Workspace 域**: 工作区、文件树、最近文件、全局搜索
- **Document 域**: 多标签页、内容缓存、脏状态、自动保存
- **Editor 域**: 编辑 / 分栏 / 预览、浮动工具栏、Markdown 渲染
- **Export 域**: HTML/PDF 导出
- **Settings 域**: 主题、字体、配置持久化、窗口状态

每个域维护清晰的 store、hooks、组件和对外接口，避免跨域直接修改状态。

---

## 4. Workspace 域设计

### 4.1 职责

- 管理单文件模式 / 工作区模式
- 递归文件树展示
- 最近打开文件列表
- 工作区全局搜索
- 文件新建、重命名、删除

### 4.2 核心类型

```ts
type WorkspaceMode = 'single' | 'folder';

interface WorkspaceState {
  mode: WorkspaceMode;
  rootPath: string | null;
  fileTree: FileNode[];
  recentFiles: string[];
  searchResults: SearchResult[];
}

interface FileNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}
```

### 4.3 Tauri 命令

- `open_file()`
- `open_folder()`
- `read_directory(path)`
- `search_in_workspace(query)`
- `create_file(path)`
- `rename_file()`
- `delete_file()`

### 4.4 UI 组件

- `WorkspaceSidebar`
- `FileTree`
- `RecentFiles`
- `GlobalSearch`

---

## 5. Document 域设计

### 5.1 职责

- 管理多标签页
- 文档内容缓存
- 跟踪脏状态
- 自动保存
- 最近标签恢复

### 5.2 核心类型

```ts
interface OpenDocument {
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
  lastSavedAt: number;
  viewMode: 'edit' | 'split' | 'preview';
  cursor?: { line: number; column: number };
}

interface DocumentState {
  openTabs: OpenDocument[];
  activeTabPath: string | null;
}
```

### 5.3 关键决策

- 打开的文档内容保留在内存中，不频繁重新读盘
- `viewMode` 为文档级状态，每个标签页记住自己的查看模式
- 自动保存使用 debounce（2 秒）

---

## 6. Editor 域设计

### 6.1 职责

- CodeMirror 6 编辑器实例管理
- 三种视图模式：编辑 / 分栏 / 预览
- 实时 Markdown 渲染
- 选中文本浮动工具栏
- 大纲同步跳转
- Mermaid / KaTeX 渲染

### 6.2 Markdown 渲染管线

```text
Markdown 文本
→ remark 解析
→ GFM / Math / Mermaid 插件处理
→ rehype 渲染为 HTML
```

### 6.3 UI 组件

- `TabBar`
- `EditorPane`
- `PreviewPane`
- `SplitView`
- `FloatingToolbar`
- `OutlinePanel`

### 6.4 关键行为

- 标签页切换时保留编辑器状态
- 浮动工具栏在选区变化时定位显示
- Mermaid / KaTeX 仅在预览区渲染
- 点击大纲项时同步滚动编辑区或预览区

---

## 7. Export 域设计

### 7.1 职责

- 导出 HTML
- 导出 PDF

### 7.2 实现方式

#### HTML 导出

将当前 Markdown 渲染为完整 HTML 文件，并内联 Prism 的导出样式。

#### PDF 导出

优先方案：通过 Tauri 调用系统打印能力，让用户选择打印机或“另存为 PDF”。  
该方案实现简单、行为符合桌面应用预期，也避免额外引入沉重的 PDF 生成依赖。

### 7.3 Tauri 命令

- `export_html(content, outputPath)`
- `export_pdf(content)`

### 7.4 UI 组件

- `ExportDialog`

---

## 8. Settings 域设计

### 8.1 职责

- 主题切换
- 字体大小与编辑器字体
- 自动保存间隔
- 窗口状态恢复
- 配置持久化

### 8.2 核心类型

```ts
interface SettingsState {
  theme: 'light' | 'dark';
  fontSize: number;
  editorFontFamily: string;
  autoSaveInterval: number;
  windowState: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
}
```

### 8.3 存储路径

配置文件保存到标准系统目录：

```text
%APPDATA%/Prism/config.json
```

### 8.4 Tauri 命令

- `load_settings()`
- `save_settings(settings)`

### 8.5 UI 组件

- `SettingsDialog`
- `ThemeToggle`

---

## 9. 主界面布局

```text
┌─────────────────────────────────────────────────┐
│  Titlebar (Prism · 文件名)          ─ □ ×      │
├─────────────────────────────────────────────────┤
│  MenuBar (文件 编辑 段落 格式 视图 主题 帮助)   │
├──────────┬──────────────────────────────────────┤
│          │  TabBar (标签页1 标签页2 +)          │
│ Sidebar  ├──────────────────────────────────────┤
│          │                                       │
│ [文件树] │         Editor / Split / Preview     │
│ [大纲]   │                                       │
│ [搜索]   │                                       │
│          │                                       │
├──────────┴──────────────────────────────────────┤
│  StatusBar (模式切换 字数 行列 主题 专注)       │
└─────────────────────────────────────────────────┘
```

---

## 10. 数据流

### 10.1 启动流程

1. Tauri 启动
2. 调用 `load_settings()`
3. 恢复窗口状态、主题
4. 恢复最近文件 / 工作区（如果存在）
5. 渲染主界面

### 10.2 打开文件流程

1. 用户点击“打开文件”
2. Tauri `open_file()` 返回路径
3. Document store 检查是否已打开
4. 若未打开，读取文件内容并创建新标签页
5. 设为 active document

### 10.3 编辑与保存流程

1. 用户在 CodeMirror 编辑
2. Document store 更新 `content` 和 `isDirty`
3. debounce 2 秒后自动保存
4. 保存成功后更新 `isDirty = false`

### 10.4 全局搜索流程

1. 用户输入搜索词
2. debounce 300ms
3. 调用 `search_in_workspace(query)`
4. 展示结果列表
5. 点击结果时打开对应文件并跳转到目标行

---

## 11. 错误处理

- 文件读写失败 → Toast 提示
- 工作区路径失效 → 回退到单文件模式
- 自动保存失败 → 维持脏状态并提示手动保存
- 导出失败 → 错误对话框

---

## 12. 性能策略

- 面向 < 10MB Markdown 文件，不做超大文件优化
- Markdown 预览渲染使用 300ms debounce
- 文件树按展开节点递归渲染
- 标签页切换时不销毁文档状态
- 大纲直接从解析结果中提取，避免重复解析

---

## 13. 第一阶段功能范围（MVP+）

第一阶段包含：

- Tauri 桌面应用壳
- React + TypeScript + Vite 前端
- 打开文件 / 打开文件夹
- 文件树、最近文件、全局搜索
- 多标签页
- 编辑 / 分栏 / 预览三模式
- 自动保存
- 主题切换
- 大纲同步跳转
- HTML / PDF 导出
- GFM + KaTeX + Mermaid 渲染
- 设置持久化

第一阶段不包含：

- 插件系统
- 云同步
- 协作编辑
- 超大文件优化
- 完整快捷键自定义

---

## 14. 设计结论

Prism 将从现有单文件原型迁移为一个按领域拆分的 Tauri 桌面应用。  
该架构适合继续迭代，并能够支撑接近可用产品版的功能范围，同时避免将原型阶段的结构问题带入正式项目。
