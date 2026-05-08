import { useRef, useState, useEffect, useCallback } from 'react';
import { useDocumentStore } from './domains/document/store';
import { useSettingsStore } from './domains/settings/store';
import { useWorkspaceStore } from './domains/workspace/store';
import { useAutoSave } from './domains/document/hooks/useAutoSave';
import { DocumentView } from './domains/document/components/DocumentView';
import { StatusBar } from './domains/workspace/components/StatusBar';
import { Sidebar } from './domains/workspace/components/Sidebar';
import { useBootstrap } from './hooks/useBootstrap';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { save } from '@tauri-apps/plugin-dialog';
import { EditorPaneHandle } from './domains/editor/components/EditorPane';
import { exportToHtml } from './lib/exportToHtml';
import { WindowShell } from './components/shell/WindowShell';
import { TitleBar } from './components/shell/TitleBar';
import { MenuBar } from './components/shell/MenuBar';
import { executeMenuAction } from './lib/menuActions';
import { executeFileAction, FileActionInput } from './lib/fileActions';
import { ContextMenu } from './components/shell/ContextMenu';
import { ShortcutPanel } from './components/shell/ShortcutPanel';

function basename(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

function App() {
  const currentDocument = useDocumentStore((s) => s.currentDocument);
  const openDocument = useDocumentStore((s) => s.openDocument);
  const setViewMode = useDocumentStore((s) => s.setViewMode);
  const markSaved = useDocumentStore((s) => s.markSaved);
  
  const { loadSettings } = useSettingsStore();
  const workspace = useWorkspaceStore();

  const editorRef = useRef<EditorPaneHandle>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [globalContextMenu, setGlobalContextMenu] = useState<{ x: number, y: number, items: any[] } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [shortcutPanelVisible, setShortcutPanelVisible] = useState(false);

  useBootstrap();
  useAutoSave(2000);

  // Ctrl+/ 快捷键面板
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShortcutPanelVisible(true);
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

  const handleFileAction = useCallback(async (input: FileActionInput) => {
    await executeFileAction(input, {
      documentStore: useDocumentStore.getState(),
      workspaceStore: useWorkspaceStore.getState(),
      showToast,
    });
  }, [showToast]);

  const handleFileClick = useCallback(async (path: string) => {
    await handleFileAction({ action: 'openFile', path });
  }, [handleFileAction]);

  const handleMenuAction = useCallback(async (action: string) => {
    await executeMenuAction(action, {
      documentStore: useDocumentStore.getState(),
      settingsStore: useSettingsStore.getState(),
      workspaceStore: useWorkspaceStore.getState(),
      showToast,
    });
  }, [showToast]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<FileActionInput>).detail;
      handleFileAction(detail);
    };
    window.addEventListener('prism-file-action' as any, handler);
    return () => window.removeEventListener('prism-file-action' as any, handler);
  }, [handleFileAction]);

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
      try {
        let targetPath = currentDocument.path;
        if (!targetPath) {
          const chosen = await save({
            filters: [{ name: 'Markdown', extensions: ['md'] }],
            defaultPath: currentDocument.name,
          });
          if (!chosen) return;
          targetPath = chosen;
        }
        await writeTextFile(targetPath, currentDocument.content);
        if (!currentDocument.path) {
          openDocument(targetPath, basename(targetPath), currentDocument.content);
        }
        markSaved();
      } catch (err) {
        console.error('[App] Manual save failed:', err);
        showToast(`保存失败: ${err instanceof Error ? err.message : String(err)}`);
      }
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
    } else if (!ctrl && shift && !alt && code === 'F12') {
      action = 'devTools';
    }
    if (action) {
      e.preventDefault();
      handleMenuAction(action);
    }
  }, [currentDocument, markSaved, openDocument, workspace, handleMenuAction, showToast]);

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

  const titleText = currentDocument
    ? `Prism · ${currentDocument.name}${currentDocument.isDirty ? ' •' : ''}`
    : 'Prism';

  return (
    <WindowShell>
      {!workspace.focusMode && <TitleBar title={titleText} />}
      {!workspace.focusMode && <MenuBar onAction={handleMenuAction} />}
      <div className="app-main" style={{ flex: 1, display: 'flex', minHeight: 0, minWidth: 0 }}>
        {workspace.sidebarVisible && !workspace.focusMode && (
          <div 
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

      {currentDocument && !workspace.focusMode && workspace.statusBarVisible && (
        <StatusBar
          viewMode={currentDocument.viewMode}
          wordCount={currentDocument.content.split(/\s+/).filter(Boolean).length}
          cursor={cursor}
          sidebarVisible={workspace.sidebarVisible}
          isSidebarHovered={isSidebarHovered}
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
          onViewModeChange={setViewMode}
          onExportHtml={() => currentDocument && exportToHtml(currentDocument.content, currentDocument.name)}
          onToggleFocusMode={() => workspace.toggleFocusMode()}
          onToggleSidebar={() => workspace.toggleSidebar()}
          onFolderContextMenu={handleFolderContextMenu}
          onNewFile={() => handleFileAction('newFile')}
          onToggleFileTreeMode={() => handleFileAction(workspace.fileTreeMode === 'tree' ? 'viewList' : 'viewTree')}
        />
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

      {toastMessage && (
        <div
          role="status"
          className="prism-toast"
          style={{
            position: 'fixed',
            left: '50%',
            bottom: workspace.statusBarVisible && !workspace.focusMode ? '44px' : '18px',
            transform: 'translateX(-50%)',
            zIndex: 20000,
            maxWidth: 'min(520px, calc(100vw - 40px))',
            padding: '9px 14px',
            borderRadius: '8px',
            border: '1px solid var(--stroke-surface)',
            background: 'var(--bg-surface-solid)',
            color: 'var(--text-primary)',
            boxShadow: 'var(--elevation-flyout)',
            fontSize: '12px',
            lineHeight: 1.5,
            pointerEvents: 'none',
          }}
        >
          {toastMessage}
        </div>
      )}

      <ShortcutPanel
        visible={shortcutPanelVisible}
        onClose={() => setShortcutPanelVisible(false)}
      />
    </WindowShell>
  );
}

export default App;
