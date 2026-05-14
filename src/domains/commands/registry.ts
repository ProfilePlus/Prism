import { ask, open } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile, stat } from '@tauri-apps/plugin-fs';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { invoke } from '@tauri-apps/api/core';
import { openPath, openUrl, revealItemInDir } from '@tauri-apps/plugin-opener';
import { loadFolderTree } from '../workspace/lib/loadFolderTree';
import { openPrismWindow } from '../../lib/openWindow';
import { MARKDOWN_FILE_FILTERS, addRecentFile, basename, dirname } from '../workspace/services';
import {
  exportDocument,
  getExportFormatLabel,
  resolveExportOptions,
  type ExportFormat,
} from '../export';
import type {
  CommandContext,
  CommandDefinition,
  CommandId,
  CommandPaletteItem,
} from './types';
import {
  getCurrentPlatform,
  getShortcutDisplayPlatform,
  getShortcutLabel,
  shortcutMatchesEvent,
  type ShortcutDisplayStyle,
} from './platform';

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err instanceof Event) return err.type || '未知事件错误';
  return String(err);
}

function hasDocument(context: CommandContext): boolean {
  return Boolean(context.documentStore.currentDocument);
}

function hasSavedDocumentPath(context: CommandContext): boolean {
  return Boolean(context.documentStore.currentDocument?.path);
}

function emitEditorCommand(command: string): void {
  window.dispatchEvent(new CustomEvent('prism-editor-command', { detail: { command } }));
}

function emitInlineFormat(format: string): void {
  window.dispatchEvent(new CustomEvent('prism-format', { detail: { format } }));
}

function emitHeading(level: string): void {
  window.dispatchEvent(new CustomEvent('prism-heading', { detail: { level } }));
}

function emitBlockFormat(format: string): void {
  window.dispatchEvent(new CustomEvent('prism-block-format', { detail: { format } }));
}

async function handleNew(context: CommandContext): Promise<void> {
  if (!context.documentStore.currentDocument) {
    context.documentStore.createNewDocument();
    return;
  }

  await openPrismWindow({});
}

async function handleOpen(context: CommandContext): Promise<void> {
  const selected = await open({
    multiple: false,
    filters: MARKDOWN_FILE_FILTERS,
  });

  if (!selected || Array.isArray(selected)) return;

  try {
    const fileInfo = await stat(selected);
    const fileSizeMB = fileInfo.size / (1024 * 1024);

    if (fileSizeMB > 10) {
      const shouldContinue = await ask(
        `文件大小为 ${fileSizeMB.toFixed(2)} MB，可能影响性能。是否继续打开？`,
        { title: '大文件警告', kind: 'warning' },
      );
      if (!shouldContinue) return;
    }
  } catch (err) {
    console.error('[Command] Failed to check file size:', err);
  }

  if (context.documentStore.currentDocument) {
    await openPrismWindow({ filePath: selected });
    return;
  }

  try {
    const content = await readTextFile(selected);
    const name = basename(selected);
    context.documentStore.openDocument(selected, name, content);
    addRecentFile(selected, name);

    try {
      const parentDir = dirname(selected);
      context.workspaceStore.setRootPath(parentDir);
      const tree = await loadFolderTree(parentDir);
      context.workspaceStore.setFileTree(tree);
    } catch (err) {
      console.error('[Command] Failed to load parent folder tree:', err);
    }
  } catch (err) {
    console.error('[Command] Failed to open file:', err);
    const message = formatError(err);
    await ask(`无法打开文件：${message}`, { title: '打开文件失败', kind: 'error' });
  }
}

async function handleOpenFolder(context: CommandContext): Promise<void> {
  const selected = await open({ directory: true, multiple: false });
  if (!selected || Array.isArray(selected)) return;

  if (context.documentStore.currentDocument) {
    await openPrismWindow({ folderPath: selected });
    return;
  }

  context.workspaceStore.setRootPath(selected);
  try {
    const tree = await loadFolderTree(selected);
    context.workspaceStore.setFileTree(tree);
  } catch (err) {
    console.error('[Command] Failed to load folder tree:', err);
  }
}

async function handleSave(context: CommandContext): Promise<void> {
  const doc = context.documentStore.currentDocument;
  if (!doc) return;

  let targetPath = doc.path;

  if (!targetPath) {
    if (!context.requestSavePath) {
      context.showToast?.('保存面板未就绪');
      return;
    }
    const chosen = await context.requestSavePath({
      filename: doc.name,
      documentPath: doc.path,
    });
    if (!chosen) return;
    targetPath = chosen;
  }

  await writeTextFile(targetPath, doc.content);

  if (!doc.path) {
    context.documentStore.openDocument(targetPath, basename(targetPath), doc.content);
  }
  addRecentFile(targetPath, basename(targetPath));

  context.documentStore.markSaved();
}

async function handleSaveAs(context: CommandContext): Promise<void> {
  const doc = context.documentStore.currentDocument;
  if (!doc) return;

  if (!context.requestSavePath) {
    context.showToast?.('保存面板未就绪');
    return;
  }

  const chosen = await context.requestSavePath({
    filename: doc.name,
    documentPath: doc.path,
  });
  if (!chosen) return;

  await writeTextFile(chosen, doc.content);
  context.documentStore.openDocument(chosen, basename(chosen), doc.content);
  addRecentFile(chosen, basename(chosen));
  context.documentStore.markSaved();
}

async function handleExport(format: ExportFormat, context: CommandContext): Promise<void> {
  const doc = context.documentStore.currentDocument;
  if (!doc) {
    context.showToast?.('没有可导出的文档');
    return;
  }

  const setExportProgress = (message: string | null) => {
    window.dispatchEvent(new CustomEvent('prism-export-progress', {
      detail: message ? { visible: true, message } : { visible: false },
    }));
  };

  try {
    if (!context.requestExportPath) {
      context.showToast?.('导出保存面板未就绪');
      return;
    }

    const outputPath = await context.requestExportPath({
      format,
      filename: doc.name,
      documentPath: doc.path,
    });
    if (!outputPath) return;

    const exported = await exportDocument(resolveExportOptions({
      content: doc.content,
      filename: doc.name,
      settings: context.settingsStore,
      onProgress: (message) => setExportProgress(message),
      onWarning: (message) => context.showToast?.(message),
    }), format, outputPath);

    if (exported) {
      context.showToast?.(`${getExportFormatLabel(format)} 导出完成`);
    }
  } finally {
    setExportProgress(null);
  }
}

async function handleOpenCurrentLocation(context: CommandContext): Promise<void> {
  const docPath = context.documentStore.currentDocument?.path;
  if (docPath) {
    await revealItemInDir(docPath);
    return;
  }

  const rootPath = context.workspaceStore.rootPath;
  if (rootPath) {
    await openPath(rootPath);
    return;
  }

  context.showToast?.('当前没有可显示的位置');
}

async function handleCloseDocument(context: CommandContext): Promise<void> {
  const doc = context.documentStore.currentDocument;
  if (!doc) return;

  if (doc.isDirty) {
    let targetPath = doc.path;
    if (!targetPath) {
      if (!context.requestSavePath) {
        context.showToast?.('保存面板未就绪');
        return;
      }
      const chosen = await context.requestSavePath({
        filename: doc.name,
        documentPath: doc.path,
      });
      if (!chosen) return;
      targetPath = chosen;
    }
    await writeTextFile(targetPath, doc.content);
  }

  context.documentStore.closeDocument();
}

async function handleFullscreen(context: CommandContext): Promise<void> {
  const win = getCurrentWindow();
  const isFull = await win.isFullscreen();
  await win.setFullscreen(!isFull);
  context.workspaceStore.setFullscreen(!isFull);
}

async function handleAlwaysOnTop(context: CommandContext): Promise<void> {
  const win = getCurrentWindow();
  const isOnTop = await win.isAlwaysOnTop?.();
  if (isOnTop !== undefined) {
    await win.setAlwaysOnTop(!isOnTop);
    context.workspaceStore.setAlwaysOnTop(!isOnTop);
  }
}

const ZOOM_STEP = 0.1;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3.0;
let currentZoom = 1;

async function handleZoom(direction: 'in' | 'out' | 'reset', context: CommandContext): Promise<void> {
  const next =
    direction === 'reset'
      ? 1
      : direction === 'in'
        ? Math.min(currentZoom + ZOOM_STEP, ZOOM_MAX)
        : Math.max(currentZoom - ZOOM_STEP, ZOOM_MIN);

  currentZoom = Math.round(next * 100) / 100;

  try {
    await getCurrentWebview().setZoom(currentZoom);
    document.documentElement.style.setProperty('--app-zoom', '1');
  } catch (error) {
    document.documentElement.style.setProperty('--app-zoom', String(currentZoom));
    console.warn('[Command] Webview zoom unavailable, falling back to CSS zoom', error);
  }

  context.showToast?.(`缩放 ${Math.round(currentZoom * 100)}%`);
}

async function handleDevTools(context: CommandContext): Promise<void> {
  try {
    await invoke('plugin:webview|internal_toggle_devtools');
  } catch (error) {
    console.error('[Command] DevTools toggle failed', error);
    context.showToast?.('开发者工具暂不可用');
  }
}

async function handleHelpLink(command: CommandId): Promise<void> {
  const urls: Partial<Record<CommandId, string>> = {
    mdReference: 'https://www.markdownguide.org/basic-syntax/',
    github: 'https://github.com/AlexPlum405/Prism',
    feedback: 'https://github.com/AlexPlum405/Prism/issues',
  };

  const url = urls[command];
  if (url) await openUrl(url);
}

function command(definition: CommandDefinition): CommandDefinition {
  return definition;
}

export const commandRegistry = [
  command({
    id: 'new',
    label: '新建文稿',
    category: '文件',
    keywords: ['create', 'file'],
    shortcuts: [{ code: 'KeyN', mod: true }],
    run: handleNew,
  }),
  command({
    id: 'newWindow',
    label: '新建窗口',
    category: '文件',
    shortcuts: [{ code: 'KeyN', mod: true, shift: true }],
    run: () => openPrismWindow({}),
  }),
  command({
    id: 'open',
    label: '打开文件',
    category: '文件',
    keywords: ['open', 'file'],
    shortcuts: [{ code: 'KeyO', mod: true }],
    run: handleOpen,
  }),
  command({
    id: 'openFolder',
    label: '打开文件夹',
    category: '文件',
    keywords: ['folder'],
    shortcuts: [{ code: 'KeyO', mod: true, shift: true }],
    run: handleOpenFolder,
  }),
  command({
    id: 'save',
    label: '保存',
    category: '文件',
    keywords: ['save'],
    shortcuts: [{ code: 'KeyS', mod: true }],
    enabled: hasDocument,
    run: handleSave,
  }),
  command({
    id: 'saveAs',
    label: '另存为',
    category: '文件',
    keywords: ['save as'],
    shortcuts: [{ code: 'KeyS', mod: true, shift: true }],
    enabled: hasDocument,
    run: handleSaveAs,
  }),
  command({
    id: 'print',
    label: '打印',
    category: '文件',
    keywords: ['print'],
    shortcuts: [{ code: 'KeyP', mod: true }],
    run: () => window.print(),
  }),
  command({
    id: 'openCurrentLocation',
    label: '在文件管理器中显示',
    category: '文件',
    enabled: (context) => hasSavedDocumentPath(context) || Boolean(context.workspaceStore.rootPath),
    run: handleOpenCurrentLocation,
  }),
  command({
    id: 'closeDocument',
    label: '关闭文稿',
    category: '文件',
    shortcuts: [{ code: 'KeyW', mod: true }],
    enabled: hasDocument,
    run: handleCloseDocument,
  }),
  command({
    id: 'exportPdf',
    label: '导出为 PDF',
    category: '文件',
    keywords: ['export', 'pdf'],
    enabled: hasDocument,
    run: (context) => handleExport('pdf', context),
  }),
  command({
    id: 'exportDocx',
    label: '导出为 Word (.docx)',
    category: '文件',
    keywords: ['export', 'word', 'docx'],
    enabled: hasDocument,
    run: (context) => handleExport('docx', context),
  }),
  command({
    id: 'exportHtml',
    label: '导出为 HTML',
    category: '文件',
    keywords: ['export', 'html'],
    enabled: hasDocument,
    run: (context) => handleExport('html', context),
  }),
  command({
    id: 'exportPng',
    label: '导出为 PNG 图像',
    category: '文件',
    keywords: ['export', 'png', 'image'],
    enabled: hasDocument,
    run: (context) => handleExport('png', context),
  }),

  command({
    id: 'undo',
    label: '撤销',
    category: '编辑',
    keywords: ['undo'],
    shortcuts: [{ code: 'KeyZ', mod: true }],
    enabled: hasDocument,
    run: () => emitEditorCommand('undo'),
  }),
  command({
    id: 'redo',
    label: '重做',
    category: '编辑',
    keywords: ['redo'],
    shortcuts: [
      { code: 'KeyZ', mod: true, shift: true },
      { code: 'KeyY', mod: true, platforms: ['windows', 'linux'] },
    ],
    enabled: hasDocument,
    run: () => emitEditorCommand('redo'),
  }),
  command({
    id: 'cut',
    label: '剪切',
    category: '编辑',
    keywords: ['cut'],
    shortcuts: [{ code: 'KeyX', mod: true }],
    enabled: hasDocument,
    run: () => emitEditorCommand('cut'),
  }),
  command({
    id: 'copy',
    label: '复制',
    category: '编辑',
    keywords: ['copy'],
    shortcuts: [{ code: 'KeyC', mod: true }],
    enabled: hasDocument,
    run: () => emitEditorCommand('copy'),
  }),
  command({
    id: 'paste',
    label: '粘贴',
    category: '编辑',
    keywords: ['paste'],
    shortcuts: [{ code: 'KeyV', mod: true }],
    enabled: hasDocument,
    run: () => emitEditorCommand('paste'),
  }),
  command({
    id: 'pastePlain',
    label: '粘贴并匹配样式',
    category: '编辑',
    shortcuts: [{ code: 'KeyV', mod: true, shift: true }],
    enabled: hasDocument,
    run: () => emitEditorCommand('pastePlain'),
  }),
  command({
    id: 'selectAll',
    label: '全选',
    category: '编辑',
    shortcuts: [{ code: 'KeyA', mod: true }],
    enabled: hasDocument,
    run: () => emitEditorCommand('selectAll'),
  }),
  command({
    id: 'showSearch',
    label: '查找',
    category: '编辑',
    keywords: ['find', 'search'],
    shortcuts: [{ code: 'KeyF', mod: true }],
    enabled: hasDocument,
    run: () => {
      window.dispatchEvent(new CustomEvent('prism-search', { detail: { action: 'open' } }));
    },
  }),
  command({
    id: 'showReplace',
    label: '替换',
    category: '编辑',
    keywords: ['replace', 'find'],
    shortcuts: [{ code: 'KeyH', mod: true }],
    enabled: hasDocument,
    run: () => {
      window.dispatchEvent(new CustomEvent('prism-search', { detail: { action: 'replace' } }));
    },
  }),
  command({
    id: 'copyPlain',
    label: '复制为纯文本',
    category: '编辑',
    enabled: hasDocument,
    run: () => emitEditorCommand('copyPlain'),
  }),
  command({
    id: 'copyMd',
    label: '复制为 Markdown',
    category: '编辑',
    shortcuts: [{ code: 'KeyC', mod: true, shift: true }],
    enabled: hasDocument,
    run: () => emitEditorCommand('copyMd'),
  }),
  command({
    id: 'copyHtml',
    label: '复制为 HTML',
    category: '编辑',
    enabled: hasDocument,
    run: () => emitEditorCommand('copyHtml'),
  }),

  command({
    id: 'link',
    label: '链接',
    category: '插入',
    keywords: ['link'],
    shortcuts: [{ code: 'KeyK', mod: true }],
    enabled: hasDocument,
    run: () => emitInlineFormat('link'),
  }),
  command({
    id: 'codeBlock',
    label: '代码块',
    category: '插入',
    keywords: ['code', 'block'],
    shortcuts: [{ code: 'KeyK', mod: true, shift: true }],
    enabled: hasDocument,
    run: () => emitBlockFormat('codeBlock'),
  }),
  command({
    id: 'mathBlock',
    label: '公式块',
    category: '插入',
    shortcuts: [{ code: 'KeyM', mod: true, shift: true }],
    enabled: hasDocument,
    run: () => emitBlockFormat('mathBlock'),
  }),
  command({
    id: 'quote',
    label: '引用',
    category: '插入',
    shortcuts: [{ code: 'KeyQ', mod: true, shift: true }],
    enabled: hasDocument,
    run: () => emitBlockFormat('quote'),
  }),
  command({
    id: 'orderedList',
    label: '有序列表',
    category: '插入',
    shortcuts: [{ code: 'BracketLeft', mod: true, shift: true }],
    enabled: hasDocument,
    run: () => emitBlockFormat('orderedList'),
  }),
  command({
    id: 'unorderedList',
    label: '无序列表',
    category: '插入',
    shortcuts: [{ code: 'BracketRight', mod: true, shift: true }],
    enabled: hasDocument,
    run: () => emitBlockFormat('unorderedList'),
  }),
  command({
    id: 'taskList',
    label: '任务列表',
    category: '插入',
    shortcuts: [{ code: 'KeyX', mod: true, shift: true }],
    enabled: hasDocument,
    run: () => emitBlockFormat('taskList'),
  }),
  command({
    id: 'hr',
    label: '水平分割线',
    category: '插入',
    enabled: hasDocument,
    run: () => emitBlockFormat('hr'),
  }),
  command({
    id: 'footnote',
    label: '脚注',
    category: '插入',
    enabled: hasDocument,
    run: () => emitBlockFormat('footnote'),
  }),
  command({
    id: 'linkReference',
    label: '链接引用',
    category: '插入',
    enabled: hasDocument,
    run: () => emitBlockFormat('linkReference'),
  }),
  command({
    id: 'toc',
    label: '内容目录',
    category: '插入',
    enabled: hasDocument,
    run: () => emitBlockFormat('toc'),
  }),
  command({
    id: 'yaml',
    label: 'YAML Front Matter',
    category: '插入',
    enabled: hasDocument,
    run: () => emitBlockFormat('yaml'),
  }),

  command({
    id: 'bold',
    label: '粗体',
    category: '格式',
    keywords: ['bold'],
    shortcuts: [{ code: 'KeyB', mod: true }],
    enabled: hasDocument,
    run: () => emitInlineFormat('bold'),
  }),
  command({
    id: 'italic',
    label: '斜体',
    category: '格式',
    keywords: ['italic'],
    shortcuts: [{ code: 'KeyI', mod: true }],
    enabled: hasDocument,
    run: () => emitInlineFormat('italic'),
  }),
  command({
    id: 'underline',
    label: '下划线',
    category: '格式',
    keywords: ['underline'],
    shortcuts: [{ code: 'KeyU', mod: true }],
    enabled: hasDocument,
    run: () => emitInlineFormat('underline'),
  }),
  command({
    id: 'strikethrough',
    label: '删除线',
    category: '格式',
    keywords: ['strikethrough'],
    shortcuts: [{ code: 'Digit5', alt: true, shift: true }],
    enabled: hasDocument,
    run: () => emitInlineFormat('strikethrough'),
  }),
  command({
    id: 'inlineCode',
    label: '行内代码',
    category: '格式',
    keywords: ['code'],
    shortcuts: [{ code: 'Backquote', mod: true, shift: true }],
    enabled: hasDocument,
    run: () => emitInlineFormat('code'),
  }),
  command({
    id: 'paragraph',
    label: '正文',
    category: '格式',
    keywords: ['paragraph'],
    shortcuts: [{ code: 'Digit0', mod: true }],
    enabled: hasDocument,
    run: () => emitBlockFormat('paragraph'),
  }),
  ...([1, 2, 3, 4, 5, 6] as const).map((level) => command({
    id: `h${level}` as CommandId,
    label: `${['一', '二', '三', '四', '五', '六'][level - 1]}级标题`,
    category: '格式',
    keywords: [`h${level}`, 'heading'],
    shortcuts: [{ code: `Digit${level}`, mod: true }],
    enabled: hasDocument,
    run: () => emitHeading(`h${level}`),
  })),
  command({
    id: 'increaseHeading',
    label: '提升标题级别',
    category: '格式',
    shortcuts: [{ code: 'Equal', mod: true }],
    enabled: hasDocument,
    run: () => emitBlockFormat('increaseHeading'),
  }),
  command({
    id: 'decreaseHeading',
    label: '降低标题级别',
    category: '格式',
    shortcuts: [{ code: 'Minus', mod: true }],
    enabled: hasDocument,
    run: () => emitBlockFormat('decreaseHeading'),
  }),
  command({
    id: 'clearFormat',
    label: '清除格式',
    category: '格式',
    shortcuts: [{ code: 'Backslash', mod: true }],
    enabled: hasDocument,
    run: () => emitEditorCommand('clearFormat'),
  }),

  command({
    id: 'sourceMode',
    label: '编辑模式',
    category: '视图',
    keywords: ['edit', 'source'],
    shortcuts: [{ code: 'Slash', mod: true }],
    enabled: hasDocument,
    checked: (context) => context.documentStore.currentDocument?.viewMode === 'edit',
    run: (context) => context.documentStore.setViewMode('edit'),
  }),
  command({
    id: 'splitMode',
    label: '分栏模式',
    category: '视图',
    keywords: ['split'],
    enabled: hasDocument,
    checked: (context) => context.documentStore.currentDocument?.viewMode === 'split',
    run: (context) => context.documentStore.setViewMode('split'),
  }),
  command({
    id: 'previewMode',
    label: '预览模式',
    category: '视图',
    keywords: ['preview'],
    enabled: hasDocument,
    checked: (context) => context.documentStore.currentDocument?.viewMode === 'preview',
    run: (context) => context.documentStore.setViewMode('preview'),
  }),
  command({
    id: 'toggleSidebar',
    label: '显示侧边栏',
    category: '视图',
    keywords: ['sidebar'],
    shortcuts: [{ code: 'KeyL', mod: true, shift: true }],
    checked: (context) => context.workspaceStore.sidebarVisible,
    run: (context) => context.workspaceStore.toggleSidebar(),
  }),
  command({
    id: 'showFiles',
    label: '文件',
    category: '视图',
    keywords: ['files'],
    checked: (context) => context.workspaceStore.sidebarVisible && context.workspaceStore.sidebarTab === 'files',
    run: (context) => context.workspaceStore.setSidebarTab('files'),
  }),
  command({
    id: 'showDocs',
    label: '文件',
    category: '视图',
    palette: false,
    checked: (context) => context.workspaceStore.sidebarVisible && context.workspaceStore.sidebarTab === 'files',
    run: (context) => context.workspaceStore.setSidebarTab('files'),
  }),
  command({
    id: 'showOutline',
    label: '大纲',
    category: '视图',
    keywords: ['outline'],
    checked: (context) => context.workspaceStore.sidebarVisible && context.workspaceStore.sidebarTab === 'outline',
    run: (context) => context.workspaceStore.setSidebarTab('outline'),
  }),
  command({
    id: 'focusMode',
    label: '专注模式',
    category: '视图',
    keywords: ['focus'],
    shortcuts: [{ code: 'F8' }],
    checked: (context) => context.workspaceStore.focusMode,
    run: (context) => context.workspaceStore.toggleFocusMode(),
  }),
  command({
    id: 'typewriterMode',
    label: '打字机模式',
    category: '视图',
    keywords: ['typewriter'],
    shortcuts: [{ code: 'F9' }],
    checked: (context) => context.workspaceStore.typewriterMode,
    run: (context) => context.workspaceStore.toggleTypewriterMode(),
  }),
  command({
    id: 'statusBar',
    label: '显示状态栏',
    category: '视图',
    keywords: ['status'],
    checked: (context) => context.workspaceStore.statusBarVisible,
    run: (context) => context.workspaceStore.toggleStatusBar(),
  }),
  command({
    id: 'actualSize',
    label: '实际大小',
    category: '视图',
    keywords: ['zoom', 'reset'],
    shortcuts: [{ code: 'Digit9', mod: true, shift: true }],
    run: (context) => handleZoom('reset', context),
  }),
  command({
    id: 'zoomIn',
    label: '放大',
    category: '视图',
    keywords: ['zoom', 'in'],
    shortcuts: [{ code: 'Equal', mod: true, shift: true }],
    run: (context) => handleZoom('in', context),
  }),
  command({
    id: 'zoomOut',
    label: '缩小',
    category: '视图',
    keywords: ['zoom', 'out'],
    shortcuts: [{ code: 'Minus', mod: true, shift: true }],
    run: (context) => handleZoom('out', context),
  }),
  command({
    id: 'devTools',
    label: '开发者工具',
    category: '视图',
    keywords: ['dev', 'debug'],
    shortcuts: [{ code: 'F12', shift: true }],
    run: handleDevTools,
  }),

  command({
    id: 'themeMiaoyan',
    label: 'MiaoYan（妙言）',
    category: '主题',
    checked: (context) => context.settingsStore.contentTheme === 'miaoyan',
    run: (context) => context.settingsStore.setContentTheme('miaoyan'),
  }),
  command({
    id: 'themeInkstone',
    label: 'Inkstone Light',
    category: '主题',
    checked: (context) => context.settingsStore.contentTheme === 'inkstone',
    run: (context) => context.settingsStore.setContentTheme('inkstone'),
  }),
  command({
    id: 'themeSlate',
    label: 'Slate Manual',
    category: '主题',
    checked: (context) => context.settingsStore.contentTheme === 'slate',
    run: (context) => context.settingsStore.setContentTheme('slate'),
  }),
  command({
    id: 'themeMono',
    label: 'Mono Lab',
    category: '主题',
    checked: (context) => context.settingsStore.contentTheme === 'mono',
    run: (context) => context.settingsStore.setContentTheme('mono'),
  }),
  command({
    id: 'themeNocturne',
    label: 'Nocturne Dark',
    category: '主题',
    checked: (context) => context.settingsStore.contentTheme === 'nocturne',
    run: (context) => context.settingsStore.setContentTheme('nocturne'),
  }),

  command({
    id: 'minimize',
    label: '最小化',
    category: '窗口',
    shortcuts: [{ code: 'KeyM', mod: true }],
    run: () => getCurrentWindow().minimize(),
  }),
  command({
    id: 'fullscreen',
    label: '切换全屏',
    category: '窗口',
    shortcuts: [{ code: 'F11' }],
    checked: (context) => context.workspaceStore.isFullscreen,
    run: handleFullscreen,
  }),
  command({
    id: 'alwaysOnTop',
    label: '保持窗口在最前端',
    category: '窗口',
    keywords: ['top', 'pin'],
    checked: (context) => context.workspaceStore.isAlwaysOnTop,
    run: handleAlwaysOnTop,
  }),

  command({
    id: 'preferences',
    label: '设置中心',
    category: '文件',
    shortcuts: [{ code: 'Comma', mod: true }],
    run: (context) => context.openSettings?.(),
  }),
  command({
    id: 'commandPalette',
    label: '命令面板',
    category: '帮助',
    keywords: ['command', 'palette'],
    shortcuts: [{ code: 'KeyP', mod: true, shift: true }],
    run: (context) => context.openCommandPalette?.(),
  }),
  command({
    id: 'mdReference',
    label: 'Markdown 参考',
    category: '帮助',
    run: () => handleHelpLink('mdReference'),
  }),
  command({
    id: 'showShortcuts',
    label: '键盘快捷键',
    category: '帮助',
    keywords: ['shortcut', 'keyboard'],
    run: (context) => context.openShortcuts?.(),
  }),
  command({
    id: 'github',
    label: 'GitHub 仓库',
    category: '帮助',
    keywords: ['github'],
    run: () => handleHelpLink('github'),
  }),
  command({
    id: 'feedback',
    label: '反馈问题',
    category: '帮助',
    keywords: ['feedback', 'issue'],
    run: () => handleHelpLink('feedback'),
  }),
  command({
    id: 'about',
    label: '关于 Prism',
    category: '帮助',
    keywords: ['about', 'info'],
    run: (context) => context.openAbout?.(),
  }),
] satisfies CommandDefinition[];

export const commandRegistryById = new Map<CommandId, CommandDefinition>(
  commandRegistry.map((definition) => [definition.id, definition]),
);

export function getCommandDefinition(id: CommandId): CommandDefinition {
  const definition = commandRegistryById.get(id);
  if (!definition) throw new Error(`未知命令: ${id}`);
  return definition;
}

export function isCommandId(value: string): value is CommandId {
  return commandRegistryById.has(value as CommandId);
}

export function isCommandEnabled(id: CommandId, context: CommandContext): boolean {
  const definition = getCommandDefinition(id);
  return definition.enabled ? definition.enabled(context) : true;
}

export async function runCommand(id: CommandId, context: CommandContext): Promise<void> {
  const definition = getCommandDefinition(id);
  if (!isCommandEnabled(id, context)) return;

  try {
    await definition.run(context);
  } catch (err) {
    console.error(`[Command] ${id} failed:`, err);
    context.showToast?.(`操作失败: ${formatError(err)}`);
  }
}

export function findCommandByKeyboardEvent(event: KeyboardEvent): CommandDefinition | null {
  const platform = getCurrentPlatform();

  for (const definition of commandRegistry) {
    if (!definition.shortcuts?.length) continue;
    if (definition.shortcuts.some((shortcut) => shortcutMatchesEvent(shortcut, event, platform))) {
      return definition;
    }
  }

  return null;
}

export function getPrimaryShortcutLabel(
  id: CommandId,
  displayStyle: ShortcutDisplayStyle = 'auto',
): string | undefined {
  const shortcut = getCommandDefinition(id).shortcuts?.[0];
  return getShortcutLabel(shortcut, getShortcutDisplayPlatform(displayStyle));
}

export function getCommandPaletteItems(context: CommandContext): CommandPaletteItem[] {
  const displayPlatform = getShortcutDisplayPlatform(context.settingsStore.shortcutStyle);

  return commandRegistry
    .filter((definition) => definition.palette !== false)
    .filter((definition) => isCommandEnabled(definition.id, context))
    .map((definition) => ({
      id: definition.id,
      label: definition.label,
      category: definition.category,
      shortcut: getShortcutLabel(definition.shortcuts?.[0], displayPlatform),
      keywords: definition.keywords,
    }));
}
