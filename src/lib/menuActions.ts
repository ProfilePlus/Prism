import { MenuActionContext } from './menuActions.types';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile, stat } from '@tauri-apps/plugin-fs';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { invoke } from '@tauri-apps/api/core';
import { loadFolderTree } from '../domains/workspace/lib/loadFolderTree';
import { openUrl } from '@tauri-apps/plugin-opener';
import { openPrismWindow } from './openWindow';
import { ask } from '@tauri-apps/plugin-dialog';
import { addRecentFile } from './recentFiles';

export async function executeMenuAction(
  action: string,
  context: MenuActionContext
): Promise<void> {
  try {
    switch (action) {
      // ═══ 文件操作 ═══
      case 'new':
        return await handleNew(context);
      case 'open':
        return await handleOpen(context);
      case 'openFolder':
        return await handleOpenFolder(context);
      case 'save':
        return await handleSave(context);
      case 'saveAs':
        return await handleSaveAs(context);
      case 'print':
        return await handlePrint();

      // ═══ 视图切换 ═══
      case 'sourceMode':
        return handleViewMode('edit', context);
      case 'splitMode':
        return handleViewMode('split', context);
      case 'previewMode':
        return handleViewMode('preview', context);
      case 'toggleSidebar':
        return handleToggleSidebar(context);
      case 'showOutline':
        return handleShowSidebarTab('outline', context);
      case 'showDocs':
      case 'showFiles':
        return handleShowSidebarTab('files', context);
      case 'showSearch':
        window.dispatchEvent(new CustomEvent('prism-search', { detail: { action: 'open' } }));
        return;
      case 'showReplace':
        window.dispatchEvent(new CustomEvent('prism-search', { detail: { action: 'replace' } }));
        return;
      case 'focusMode':
        return handleFocusMode(context);
      case 'alwaysOnTop':
        return await handleAlwaysOnTop(context);
      case 'typewriterMode':
        return context.workspaceStore.toggleTypewriterMode();
      case 'statusBar':
        return context.workspaceStore.toggleStatusBar();
      case 'devTools':
        return await handleDevTools(context);

      // ═══ 编辑操作 ═══
      case 'undo':
      case 'redo':
      case 'cut':
      case 'copy':
      case 'paste':
      case 'copyMd':
      case 'copyHtml':
      case 'copyPlain':
      case 'pastePlain':
      case 'clearFormat':
      case 'comment':
        return handleEditorCommand(action);

      // ═══ 格式化 ═══
      case 'bold':
      case 'italic':
      case 'underline':
      case 'inlineCode':
      case 'strikethrough':
      case 'link':
        return handleFormat(action as any, context);

      // ═══ 段落 ═══
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        return handleHeading(action as any, context);
      case 'quote':
      case 'codeBlock':
      case 'orderedList':
      case 'unorderedList':
      case 'taskList':
      case 'hr':
      case 'paragraph':
      case 'increaseHeading':
      case 'decreaseHeading':
      case 'mathBlock':
      case 'insertAbove':
      case 'insertBelow':
      case 'linkReference':
      case 'footnote':
      case 'toc':
      case 'yaml':
        return handleBlockFormat(action as any, context);

      // ═══ 窗口控制 ═══
      case 'fullscreen':
        return await handleFullscreen(context);
      case 'actualSize':
        return await handleZoom('reset', context);
      case 'zoomIn':
        return await handleZoom('in', context);
      case 'zoomOut':
        return await handleZoom('out', context);
      case 'themeMiaoyan':
        return context.settingsStore.setContentTheme('miaoyan');
      case 'themeInkstone':
        return context.settingsStore.setContentTheme('inkstone');
      case 'themeSlate':
        return context.settingsStore.setContentTheme('slate');
      case 'themeMono':
        return context.settingsStore.setContentTheme('mono');
      case 'themeNocturne':
        return context.settingsStore.setContentTheme('nocturne');

      // ═══ 帮助菜单 ═══
      case 'whatsNew':
      case 'quickStart':
      case 'mdReference':
      case 'pandoc':
      case 'customThemes':
      case 'useImages':
      case 'dataRecovery':
      case 'moreTopics':
      case 'thanks':
      case 'changelog':
      case 'privacy':
      case 'website':
      case 'feedback':
        return handleHelpLink(action);
      case 'checkUpdate':
        context.showToast?.('当前已是最新版本');
        return;
      case 'myLicense':
        context.showToast?.('Prism 开源版本');
        return;
      case 'about':
        context.showToast?.('Prism v1.0.0 - 现代 Markdown 编辑器');
        return;

      // ═══ 剩余文件菜单 ═══
      case 'newWindow':
        return await openPrismWindow({});
      case 'quickOpen':
        return await handleOpen(context);
      case 'saveAll':
        return await handleSave(context);
      case 'import':
        return await handleOpen(context);
      case 'moveTo':
        return await handleSaveAs(context);
      case 'properties':
        if (context.documentStore.currentDocument) {
          context.showToast?.(`路径: ${context.documentStore.currentDocument.path || '(未保存)'}`);
        } else {
          context.showToast?.('没有打开的文档');
        }
        return;
      case 'preferences':
        context.showToast?.('偏好设置面板即将推出');
        return;

      // ═══ 剩余编辑菜单 ═══
      case 'pasteImage':
        context.showToast?.('请直接将图片粘贴到编辑器');
        return;
      case 'spellCheck':
        context.showToast?.('拼写检查功能即将推出');
        return;
      case 'findBlock':
        context.showToast?.('查找对应模块功能即将推出');
        return;
      case 'emoji':
        context.showToast?.('请使用 Win+. 打开系统表情面板');
        return;

      default:
        console.log(`[Menu] Unimplemented: ${action}`);
        context.showToast?.(`功能 "${action}" 即将推出`);
    }
  } catch (err) {
    console.error(`[Menu] Action "${action}" failed:`, err);
    context.showToast?.(`操作失败: ${err}`);
  }
}

// ══════════════════════════════════════════════════════════
// 文件操作
// ══════════════════════════════════════════════════════════

async function handleNew(context: MenuActionContext): Promise<void> {
  if (!context.documentStore.currentDocument) {
    context.documentStore.createNewDocument();
  } else {
    await openPrismWindow({});
  }
}

function dirname(path: string): string {
  const parts = path.split(/[\\/]/);
  parts.pop();
  return parts.join(path.includes('\\') ? '\\' : '/');
}

async function handleOpen(context: MenuActionContext): Promise<void> {
  const selected = await open({
    multiple: false,
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }],
  });

  if (!selected || Array.isArray(selected)) return;

  // 检查文件大小
  try {
    const fileInfo = await stat(selected);
    const fileSizeMB = fileInfo.size / (1024 * 1024);

    if (fileSizeMB > 10) {
      const shouldContinue = await ask(
        `文件大小为 ${fileSizeMB.toFixed(2)} MB，可能影响性能。是否继续打开？`,
        { title: '大文件警告', kind: 'warning' }
      );
      if (!shouldContinue) return;
    }
  } catch (err) {
    console.error('[Menu] Failed to check file size:', err);
  }

  if (!context.documentStore.currentDocument) {
    try {
      const content = await readTextFile(selected);
      const name = selected.split(/[\\/]/).pop() ?? 'Untitled.md';
      context.documentStore.openDocument(selected, name, content);

      // 添加到最近文件
      addRecentFile(selected, name);

      // 加载父目录的文件树
      try {
        const parentDir = dirname(selected);
        context.workspaceStore.setRootPath(parentDir);
        const tree = await loadFolderTree(parentDir);
        context.workspaceStore.setFileTree(tree);
      } catch (err) {
        console.error('[Menu] Failed to load parent folder tree:', err);
      }
    } catch (err: any) {
      console.error('[Menu] Failed to open file:', err);
      const errorMsg = err.message?.includes('permission')
        ? '无法打开文件：权限不足'
        : err.message?.includes('not found')
        ? '无法打开文件：文件不存在'
        : `无法打开文件：${err.message || '未知错误'}`;
      await ask(errorMsg, { title: '打开文件失败', kind: 'error' });
    }
  } else {
    await openPrismWindow({ filePath: selected });
  }
}

async function handleOpenFolder(context: MenuActionContext): Promise<void> {
  const selected = await open({ directory: true, multiple: false });

  if (!selected || Array.isArray(selected)) return;

  if (!context.documentStore.currentDocument) {
    context.workspaceStore.setRootPath(selected);
    try {
      const tree = await loadFolderTree(selected);
      context.workspaceStore.setFileTree(tree);
    } catch (err) {
      console.error('[Menu] Failed to load folder tree:', err);
    }
  } else {
    await openPrismWindow({ folderPath: selected });
  }
}

async function handleSave(context: MenuActionContext): Promise<void> {
  const doc = context.documentStore.currentDocument;
  if (!doc) return;

  let targetPath = doc.path;

  if (!targetPath) {
    const chosen = await save({
      filters: [{ name: 'Markdown', extensions: ['md'] }],
      defaultPath: doc.name,
    });
    if (!chosen) return;
    targetPath = chosen;
  }

  await writeTextFile(targetPath, doc.content);

  if (!doc.path) {
    const name = targetPath.split(/[\\/]/).pop() ?? 'Untitled.md';
    context.documentStore.openDocument(targetPath, name, doc.content);
  }

  context.documentStore.markSaved();
}

async function handleSaveAs(context: MenuActionContext): Promise<void> {
  const doc = context.documentStore.currentDocument;
  if (!doc) return;

  const chosen = await save({
    filters: [{ name: 'Markdown', extensions: ['md'] }],
    defaultPath: doc.name,
  });
  if (!chosen) return;

  await writeTextFile(chosen, doc.content);
  const name = chosen.split(/[\\/]/).pop() ?? 'Untitled.md';
  context.documentStore.openDocument(chosen, name, doc.content);
  context.documentStore.markSaved();
}

async function handlePrint(): Promise<void> {
  window.print();
}

// ══════════════════════════════════════════════════════════
// 视图
// ══════════════════════════════════════════════════════════

function handleViewMode(
  mode: 'edit' | 'split' | 'preview',
  context: MenuActionContext
): void {
  context.documentStore.setViewMode(mode);
}

function handleToggleSidebar(context: MenuActionContext): void {
  context.workspaceStore.toggleSidebar();
}

function handleShowSidebarTab(
  tab: 'files' | 'outline' | 'search',
  context: MenuActionContext
): void {
  context.workspaceStore.setSidebarTab(tab);
}

function handleFocusMode(context: MenuActionContext): void {
  context.workspaceStore.toggleFocusMode();
}

async function handleDevTools(context: MenuActionContext): Promise<void> {
  try {
    await invoke('plugin:webview|internal_toggle_devtools');
  } catch (error) {
    console.error('[DevTools] toggle failed', error);
    context.showToast?.('开发者工具暂不可用');
  }
}

// ══════════════════════════════════════════════════════════
// 编辑操作
// ══════════════════════════════════════════════════════════

function handleEditorCommand(command: string): void {
  window.dispatchEvent(new CustomEvent('prism-editor-command', { detail: { command } }));
}

// ══════════════════════════════════════════════════════════
// 格式化（行内）
// ══════════════════════════════════════════════════════════

function handleFormat(
  format: 'bold' | 'italic' | 'underline' | 'inlineCode' | 'strikethrough' | 'link',
  _context: MenuActionContext
): void {
  const formatMap: Record<string, string> = {
    bold: 'bold',
    italic: 'italic',
    underline: 'underline',
    inlineCode: 'code',
    strikethrough: 'strikethrough',
    link: 'link',
  };
  const event = new CustomEvent('prism-format', {
    detail: { format: formatMap[format] || format },
  });
  window.dispatchEvent(event);
}

// ══════════════════════════════════════════════════════════
// 段落格式化
// ══════════════════════════════════════════════════════════

function handleHeading(
  level: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
  _context: MenuActionContext
): void {
  const event = new CustomEvent('prism-heading', { detail: { level } });
  window.dispatchEvent(event);
}

function handleBlockFormat(
  format: 'quote' | 'codeBlock' | 'orderedList' | 'unorderedList' | 'taskList' | 'hr'
    | 'paragraph' | 'increaseHeading' | 'decreaseHeading' | 'mathBlock'
    | 'insertAbove' | 'insertBelow' | 'linkReference' | 'footnote' | 'toc' | 'yaml',
  _context: MenuActionContext
): void {
  const event = new CustomEvent('prism-block-format', { detail: { format } });
  window.dispatchEvent(event);
}

// ══════════════════════════════════════════════════════════
// 窗口控制
// ══════════════════════════════════════════════════════════

async function handleFullscreen(context: MenuActionContext): Promise<void> {
  const win = getCurrentWindow();
  const isFull = await win.isFullscreen();
  await win.setFullscreen(!isFull);
  context.workspaceStore.setFullscreen(!isFull);
}

async function handleAlwaysOnTop(context: MenuActionContext): Promise<void> {
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

async function handleZoom(direction: 'in' | 'out' | 'reset', context: MenuActionContext): Promise<void> {
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
    console.warn('[Zoom] webview zoom unavailable, falling back to CSS zoom', error);
  }

  context.showToast?.(`缩放 ${Math.round(currentZoom * 100)}%`);
}

// ══════════════════════════════════════════════════════════
// 帮助链接
// ══════════════════════════════════════════════════════════

async function handleHelpLink(action: string): Promise<void> {
  const urls: Record<string, string> = {
    whatsNew: 'https://github.com/prism-editor/prism/releases',
    quickStart: 'https://github.com/prism-editor/prism/wiki/quick-start',
    mdReference: 'https://www.markdownguide.org/basic-syntax/',
    pandoc: 'https://pandoc.org/installing.html',
    customThemes: 'https://github.com/prism-editor/prism/wiki/themes',
    useImages: 'https://github.com/prism-editor/prism/wiki/images',
    dataRecovery: 'https://github.com/prism-editor/prism/wiki/recovery',
    moreTopics: 'https://github.com/prism-editor/prism/wiki',
    thanks: 'https://github.com/prism-editor/prism/blob/main/THANKS.md',
    changelog: 'https://github.com/prism-editor/prism/blob/main/CHANGELOG.md',
    privacy: 'https://github.com/prism-editor/prism/blob/main/PRIVACY.md',
    website: 'https://github.com/prism-editor/prism',
    feedback: 'https://github.com/prism-editor/prism/issues',
  };
  const url = urls[action];
  if (url) {
    try {
      await openUrl(url);
    } catch (err) {
      console.error('[handleHelpLink] Failed to open URL:', err);
    }
  }
}
