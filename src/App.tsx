import { useRef, useState, useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useDocumentStore } from './domains/document/store';
import { useSettingsStore } from './domains/settings/store';
import { useWorkspaceStore } from './domains/workspace/store';
import { useAutoSave } from './domains/document/hooks/useAutoSave';
import { DocumentView } from './domains/document/components/DocumentView';
import { StatusBar } from './domains/workspace/components/StatusBar';
import { Sidebar } from './domains/workspace/components/Sidebar';
import { useBootstrap } from './hooks/useBootstrap';
import { exists as fsExists } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-dialog';
import { homeDir } from '@tauri-apps/api/path';
import { EditorPaneHandle } from './domains/editor/components/EditorPane';
import type { ExportFormat } from './lib/exportDocument';
import { getExportFormatLabel } from './lib/exportDocument';
import { WindowShell } from './components/shell/WindowShell';
import { TitleBar } from './components/shell/TitleBar';
import { MenuBar } from './components/shell/MenuBar';
import { executeMenuAction } from './lib/menuActions';
import { executeFileAction, FileActionInput } from './lib/fileActions';
import { ContextMenu } from './components/shell/ContextMenu';
import { ShortcutPanel } from './components/shell/ShortcutPanel';
import { CommandPalette } from './components/shell/CommandPalette';
import { AboutModal } from './components/shell/AboutModal';
import { SettingsModal } from './components/shell/SettingsModal';
import { ALL_COMMANDS } from './lib/commands';

function basename(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

function dirname(path: string): string {
  const parts = path.split(/[\\/]/);
  parts.pop();
  return parts.join(path.includes('\\') ? '\\' : '/');
}

function joinPath(dir: string, name: string): string {
  const separator = dir.includes('\\') ? '\\' : '/';
  return `${dir.replace(/[\\/]$/, '')}${separator}${name}`;
}

const exportExtensionByFormat: Record<ExportFormat, string> = {
  html: 'html',
  pdf: 'pdf',
  docx: 'docx',
  png: 'png',
};

function stripMarkdownExtension(filename: string) {
  return filename.replace(/\.(md|markdown|txt)$/i, '') || 'Untitled';
}

function ensureExportExtension(filename: string, format: ExportFormat) {
  const extension = exportExtensionByFormat[format];
  const trimmed = filename.trim();
  if (!trimmed) return `Untitled.${extension}`;
  return trimmed.toLowerCase().endsWith(`.${extension}`) ? trimmed : `${trimmed}.${extension}`;
}

function ensureMarkdownExtension(filename: string) {
  const trimmed = filename.trim();
  if (!trimmed) return 'Untitled.md';
  return /\.(md|markdown)$/i.test(trimmed) ? trimmed : `${trimmed}.md`;
}

function defaultExportFilename(filename: string, format: ExportFormat) {
  return ensureExportExtension(stripMarkdownExtension(filename), format);
}

type SaveDialogKind = 'export' | 'markdown';

interface SaveDialogState {
  kind: SaveDialogKind;
  format?: ExportFormat;
  directory: string;
  filename: string;
  error: string | null;
  pendingOverwritePath: string | null;
  resolve: (path: string | null) => void;
}

function getSaveDialogTitle(dialog: SaveDialogState) {
  if (dialog.kind === 'export' && dialog.format) {
    return `导出 ${getExportFormatLabel(dialog.format)}`;
  }
  return '保存 Markdown';
}

function getSaveDialogPrimaryLabel(dialog: SaveDialogState) {
  return dialog.kind === 'export' ? '导出' : '保存';
}

function getSaveDialogOverwriteText(dialog: SaveDialogState) {
  return dialog.kind === 'export'
    ? '继续导出会覆盖当前位置的同名文件。'
    : '继续保存会覆盖当前位置的同名文件。';
}

function App() {
  const currentDocument = useDocumentStore((s) => s.currentDocument);

  const { loadSettings } = useSettingsStore();
  const workspace = useWorkspaceStore();

  const editorRef = useRef<EditorPaneHandle>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [globalContextMenu, setGlobalContextMenu] = useState<{ x: number, y: number, items: any[] } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const [saveDialog, setSaveDialog] = useState<SaveDialogState | null>(null);
  const [shortcutPanelVisible, setShortcutPanelVisible] = useState(false);
  const [commandPaletteVisible, setCommandPaletteVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  useBootstrap();
  useAutoSave(2000);

  // Ctrl+/ 快捷键面板
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShortcutPanelVisible(true);
      }
      // Ctrl+Shift+P 命令面板
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setCommandPaletteVisible(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let changed = false;
    if (currentDocument?.path) {
      if (params.get('file') !== currentDocument.path) {
        params.set('file', currentDocument.path);
        changed = true;
      }
    }
    if (workspace.rootPath) {
      if (params.get('folder') !== workspace.rootPath) {
        params.set('folder', workspace.rootPath);
        changed = true;
      }
    }
    if (changed) {
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({ path: newUrl }, '', newUrl);
    }
  }, [currentDocument?.path, workspace.rootPath]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    document.body.classList.toggle('focus-mode', workspace.focusMode);
  }, [workspace.focusMode]);

  useEffect(() => {
    document.body.classList.toggle('typewriter-mode', workspace.typewriterMode);
  }, [workspace.typewriterMode]);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 2800);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
  }, []);

  useEffect(() => {
    const handleExportProgress = (event: Event) => {
      const detail = (event as CustomEvent<{ visible?: boolean; message?: string }>).detail;
      setExportProgress(detail?.visible ? detail.message ?? '正在导出' : null);
    };
    window.addEventListener('prism-export-progress', handleExportProgress);
    return () => window.removeEventListener('prism-export-progress', handleExportProgress);
  }, []);

  const handleFileAction = useCallback(async (input: FileActionInput) => {
    await executeFileAction(input, {
      documentStore: useDocumentStore.getState(),
      workspaceStore: useWorkspaceStore.getState(),
      showToast,
    });
  }, [showToast]);

  useEffect(() => {
    let mounted = true;
    const unlisten = listen<string[]>('file-opened', (event) => {
      const paths = event.payload;
      if (paths.length > 0 && mounted) {
        handleFileAction({ action: 'openFile', path: paths[0] });
      }
    });

    invoke<string[]>('get_pending_files').then((paths) => {
      if (paths.length > 0 && mounted) {
        handleFileAction({ action: 'openFile', path: paths[0] });
      }
    }).catch(() => {});

    return () => {
      mounted = false;
      unlisten.then(fn => fn());
    };
  }, [handleFileAction]);

  const handleFileClick = useCallback(async (path: string) => {
    await handleFileAction({ action: 'openFile', path });
  }, [handleFileAction]);

  const requestExportPath = useCallback(async (input: {
    format: ExportFormat;
    filename: string;
    documentPath?: string;
  }) => {
    const initialDirectory = input.documentPath
      ? dirname(input.documentPath)
      : workspace.rootPath || await homeDir();

    return new Promise<string | null>((resolve) => {
      setSaveDialog({
        kind: 'export',
        format: input.format,
        directory: initialDirectory,
        filename: defaultExportFilename(input.filename, input.format),
        error: null,
        pendingOverwritePath: null,
        resolve,
      });
    });
  }, [workspace.rootPath]);

  const requestMarkdownSavePath = useCallback(async (input: {
    filename: string;
    documentPath?: string;
  }) => {
    const initialDirectory = input.documentPath
      ? dirname(input.documentPath)
      : workspace.rootPath || await homeDir();

    return new Promise<string | null>((resolve) => {
      setSaveDialog({
        kind: 'markdown',
        directory: initialDirectory,
        filename: ensureMarkdownExtension(input.filename),
        error: null,
        pendingOverwritePath: null,
        resolve,
      });
    });
  }, [workspace.rootPath]);

  const closeSaveDialog = useCallback((path: string | null = null) => {
    setSaveDialog((dialog) => {
      dialog?.resolve(path);
      return null;
    });
  }, []);

  const chooseSaveDirectory = useCallback(async () => {
    if (!saveDialog) return;
    const selected = await open({
      directory: true,
      multiple: false,
      defaultPath: saveDialog.directory,
    });
    if (!selected || Array.isArray(selected)) return;
    setSaveDialog((dialog) => dialog ? {
      ...dialog,
      directory: selected,
      error: null,
      pendingOverwritePath: null,
    } : null);
  }, [saveDialog]);

  const confirmSaveDialog = useCallback(async (allowOverwrite = false) => {
    if (!saveDialog) return;
    let filename: string;
    if (saveDialog.kind === 'export') {
      const format = saveDialog.format;
      if (!format) {
        setSaveDialog((dialog) => dialog ? {
          ...dialog,
          error: '导出格式缺失',
          pendingOverwritePath: null,
        } : null);
        return;
      }
      filename = ensureExportExtension(saveDialog.filename, format);
    } else {
      filename = ensureMarkdownExtension(saveDialog.filename);
    }
    if (/[\\/]/.test(filename)) {
      setSaveDialog((dialog) => dialog ? {
        ...dialog,
        error: '文件名不能包含路径分隔符',
        pendingOverwritePath: null,
      } : null);
      return;
    }

    const targetPath = joinPath(saveDialog.directory, filename);
    if (!allowOverwrite) {
      try {
        if (await fsExists(targetPath)) {
          setSaveDialog((dialog) => dialog ? {
            ...dialog,
            filename,
            error: null,
            pendingOverwritePath: targetPath,
          } : null);
          return;
        }
      } catch {
        // If existence check fails, let the actual write surface the error.
      }
    }

    closeSaveDialog(targetPath);
  }, [closeSaveDialog, saveDialog]);

  const handleMenuAction = useCallback(async (action: string) => {
    if (action === 'about') { setAboutVisible(true); return; }
    if (action === 'preferences') { setSettingsVisible(true); return; }
    if (action === 'showShortcuts') { setShortcutPanelVisible(true); return; }
    if (action === 'showCmd' || action === 'commandPalette') { setCommandPaletteVisible(true); return; }
    await executeMenuAction(action, {
      documentStore: useDocumentStore.getState(),
      settingsStore: useSettingsStore.getState(),
      workspaceStore: useWorkspaceStore.getState(),
      showToast,
      requestExportPath,
      requestSavePath: requestMarkdownSavePath,
    });
  }, [requestExportPath, requestMarkdownSavePath, showToast]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<FileActionInput>).detail;
      handleFileAction(detail);
    };
    window.addEventListener('prism-file-action' as any, handler);
    return () => window.removeEventListener('prism-file-action' as any, handler);
  }, [handleFileAction]);

  useEffect(() => {
    const handler = () => setSettingsVisible(true);
    window.addEventListener('prism-open-settings', handler);
    return () => window.removeEventListener('prism-open-settings', handler);
  }, []);

  const handleKeyDown = useCallback(async (e: KeyboardEvent) => {
    if (e.key === 'Escape' && workspace.focusMode) {
      workspace.toggleFocusMode();
      return;
    }
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const alt = e.altKey;
    const code = e.code;

    if (ctrl && !shift && !alt && code === 'KeyS') {
      e.preventDefault();
      if (!currentDocument || !currentDocument.isDirty) return;
      await handleMenuAction('save');
      return;
    }

    let action: string | null = null;
    if (ctrl && !shift && !alt) {
      action = ({
        KeyN: 'new', KeyO: 'open', KeyP: 'quickOpen', Comma: 'preferences',
        Digit1: 'h1', Digit2: 'h2', Digit3: 'h3', Digit4: 'h4', Digit5: 'h5', Digit6: 'h6', Digit0: 'paragraph',
        Equal: 'increaseHeading', Minus: 'decreaseHeading', Slash: 'sourceMode',
        KeyB: 'bold', KeyI: 'italic', KeyU: 'underline', KeyK: 'link', Backslash: 'clearFormat',
      } as Record<string, string>)[code] ?? null;
    } else if (ctrl && shift && !alt) {
      action = ({
        KeyN: 'newWindow', KeyS: 'saveAs', KeyC: 'copyMd', KeyV: 'pastePlain', KeyL: 'toggleSidebar',
        Digit1: 'showOutline', Digit2: 'showDocs', Digit3: 'showFiles', Digit9: 'actualSize',
        KeyF: 'showSearch', KeyM: 'mathBlock', KeyK: 'codeBlock', KeyQ: 'quote',
        BracketLeft: 'orderedList', BracketRight: 'unorderedList', KeyX: 'taskList', Backquote: 'inlineCode',
        Equal: 'zoomIn', Minus: 'zoomOut',
      } as Record<string, string>)[code] ?? null;
    } else if (!ctrl && !shift && !alt) {
      action = ({ F8: 'focusMode', F9: 'typewriterMode', F11: 'fullscreen' } as Record<string, string>)[code] ?? null;
    } else if (!ctrl && shift && alt && code === 'Digit5') {
      action = 'strikethrough';
    } else if (!ctrl && shift && !alt && code === 'F12') {
      action = 'devTools';
    }
    if (action) {
      e.preventDefault();
      handleMenuAction(action);
    }
  }, [currentDocument, workspace, handleMenuAction]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleFolderContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const items = [
      { label: '在新窗口中打开', action: 'openNewWindow' },
      { type: 'separator' },
      { label: '新建文件', action: 'newFile' },
      { label: '新建文件夹', action: 'newFolder' },
      { type: 'separator' },
      { label: '搜索', action: 'searchInFolder' },
      { type: 'separator' },
      { label: '文档列表', action: 'viewList', checked: workspace.fileTreeMode === 'list' },
      { label: '文档树', action: 'viewTree', checked: workspace.fileTreeMode === 'tree' },
      { type: 'separator' },
      { label: '刷新', action: 'refreshFolder' },
      { type: 'separator' },
      { label: '复制文件路径', action: 'copyRootPath' },
      { label: '打开文件位置', action: 'openRootLocation' },
    ];
    setGlobalContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  const titleDocName = currentDocument?.name ?? '未命名';
  const titleDirty = currentDocument?.isDirty ?? false;

  return (
    <WindowShell>
      <TitleBar docName={titleDocName} isDirty={titleDirty} />
      <MenuBar onAction={handleMenuAction} />
      <div className="app-main" style={{ flex: 1, display: 'flex', minHeight: 0, minWidth: 0 }}>
        {workspace.sidebarVisible && (
          <div
            className="app-sidebar"
            onMouseEnter={() => setIsSidebarHovered(true)}
            onMouseLeave={() => setIsSidebarHovered(false)}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            <Sidebar
              fileTree={workspace.fileTree}
              sidebarTab={workspace.sidebarTab}
              setSidebarTab={workspace.setSidebarTab}
              documentContent={currentDocument?.content ?? ''}
              activePath={currentDocument?.path}
              onFileClick={handleFileClick}
              onOutlineClick={(line) => editorRef.current?.jumpToLine(line)}
            />
          </div>
        )}
        <DocumentView
          key={currentDocument?.path || 'new-doc'}
          ref={editorRef}
          onCursorChange={setCursor}
        />
      </div>

      {currentDocument && workspace.statusBarVisible && (
        <div className="app-statusbar">
          <StatusBar
            wordCount={currentDocument.content.split(/\s+/).filter(Boolean).length}
            cursor={cursor}
            sidebarVisible={workspace.sidebarVisible}
            isSidebarHovered={isSidebarHovered}
            onMouseEnter={() => setIsSidebarHovered(true)}
            onMouseLeave={() => setIsSidebarHovered(false)}
            onExportHtml={() => handleMenuAction('exportHtml')}
            onToggleFocusMode={() => workspace.toggleFocusMode()}
            onToggleSidebar={() => workspace.toggleSidebar()}
            onFolderContextMenu={handleFolderContextMenu}
            onNewFile={() => handleFileAction('newFile')}
            onToggleFileTreeMode={() => handleFileAction(workspace.fileTreeMode === 'tree' ? 'viewList' : 'viewTree')}
          />
        </div>
      )}

      {globalContextMenu && (
        <ContextMenu
          x={globalContextMenu.x}
          y={globalContextMenu.y}
          items={globalContextMenu.items}
          onAction={handleFileAction}
          onClose={() => setGlobalContextMenu(null)}
        />
      )}

      {saveDialog && (
        <>
          <div className="modal-overlay" onClick={() => closeSaveDialog(null)} />
          <div className="modal prism-export-save-modal" role="dialog" aria-label={getSaveDialogTitle(saveDialog)}>
            <div className="modal-header">
              <div className="modal-title">{getSaveDialogTitle(saveDialog)}</div>
              <button className="modal-close" onClick={() => closeSaveDialog(null)} aria-label="关闭">×</button>
            </div>
            <div className="modal-body prism-export-save-body">
              <label className="prism-export-save-field">
                <span>文件名</span>
                <input
                  autoFocus
                  value={saveDialog.filename}
                  onChange={(event) => setSaveDialog((dialog) => dialog ? {
                    ...dialog,
                    filename: event.target.value,
                    error: null,
                    pendingOverwritePath: null,
                  } : null)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      confirmSaveDialog(false);
                    }
                  }}
                />
              </label>

              <div className="prism-export-save-field">
                <span>位置</span>
                <div className="prism-export-save-location">
                  <div title={saveDialog.directory}>{saveDialog.directory}</div>
                  <button type="button" onClick={chooseSaveDirectory}>更改</button>
                </div>
              </div>

              {saveDialog.error && (
                <div className="prism-export-save-error">{saveDialog.error}</div>
              )}

              {saveDialog.pendingOverwritePath && (
                <div className="prism-export-overwrite">
                  <div className="prism-export-overwrite-title">
                    “{basename(saveDialog.pendingOverwritePath)}” 已存在
                  </div>
                  <div className="prism-export-overwrite-text">
                    {getSaveDialogOverwriteText(saveDialog)}
                  </div>
                </div>
              )}
            </div>
            <div className="prism-export-save-footer">
              <button type="button" onClick={() => closeSaveDialog(null)}>取消</button>
              {saveDialog.pendingOverwritePath ? (
                <button type="button" className="danger" onClick={() => confirmSaveDialog(true)}>
                  替换并{getSaveDialogPrimaryLabel(saveDialog)}
                </button>
              ) : (
                <button type="button" className="primary" onClick={() => confirmSaveDialog(false)}>
                  {getSaveDialogPrimaryLabel(saveDialog)}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {toastMessage && (
        <div role="status" className="prism-toast">
          {toastMessage}
        </div>
      )}

      {exportProgress && (
        <div role="status" className="prism-export-progress">
          <span className="prism-export-spinner" aria-hidden="true" />
          <span>{exportProgress}</span>
        </div>
      )}

      <ShortcutPanel
        visible={shortcutPanelVisible}
        onClose={() => setShortcutPanelVisible(false)}
      />

      <CommandPalette
        visible={commandPaletteVisible}
        commands={ALL_COMMANDS}
        onClose={() => setCommandPaletteVisible(false)}
        onExecute={(commandId) => handleMenuAction(commandId)}
      />

      <AboutModal visible={aboutVisible} onClose={() => setAboutVisible(false)} />
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </WindowShell>
  );
}

export default App;
