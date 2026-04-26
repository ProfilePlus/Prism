import { useRef, useState, useEffect } from 'react';
import { useDocumentStore } from './domains/document/store';
import { useSettingsStore } from './domains/settings/store';
import { useWorkspaceStore } from './domains/workspace/store';
import { useAutoSave } from './domains/document/hooks/useAutoSave';
import { DocumentView } from './domains/document/components/DocumentView';
import { StatusBar } from './domains/workspace/components/StatusBar';
import { Sidebar } from './domains/workspace/components/Sidebar';
import { useBootstrap } from './hooks/useBootstrap';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { save } from '@tauri-apps/plugin-dialog';
import { EditorPaneHandle } from './domains/editor/components/EditorPane';
import { exportToHtml } from './lib/exportToHtml';
import { WindowShell } from './components/shell/WindowShell';
import { TitleBar } from './components/shell/TitleBar';
import { MenuBar } from './components/shell/MenuBar';
import { executeMenuAction } from './lib/menuActions';

function basename(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

function App() {
  const currentDocument = useDocumentStore((s) => s.currentDocument);
  const openDocument = useDocumentStore((s) => s.openDocument);
  const setViewMode = useDocumentStore((s) => s.setViewMode);
  const markSaved = useDocumentStore((s) => s.markSaved);
  const { theme } = useSettingsStore();
  const { fileTree, sidebarVisible, focusMode } = useWorkspaceStore();

  const editorRef = useRef<EditorPaneHandle>(null);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });

  useBootstrap();
  useAutoSave(2000);

  useEffect(() => {
    useSettingsStore.getState().loadSettings();
  }, []);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
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
            const name = targetPath.split(/[\\/]/).pop() || 'Untitled.md';
            openDocument(targetPath, name, currentDocument.content);
          }

          markSaved();
          console.log('[App] Manual save success:', targetPath);
        } catch (err) {
          console.error('[App] Manual save failed:', err);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentDocument, markSaved, openDocument]);

  const wordCount = currentDocument
    ? currentDocument.content.split(/\s+/).filter(Boolean).length
    : 0;

  const handleViewModeChange = (mode: 'edit' | 'split' | 'preview') => {
    setViewMode(mode);
  };

  const handleOutlineClick = (line: number) => {
    editorRef.current?.jumpToLine(line);
  };

  const handleExportHtml = async () => {
    if (!currentDocument) return;
    try {
      await exportToHtml(currentDocument.content, currentDocument.name);
      console.log('[App] HTML export success');
    } catch (err) {
      console.error('[App] HTML export failed:', err);
    }
  };

  const handleMenuAction = async (action: string) => {
    await executeMenuAction(action, {
      documentStore: useDocumentStore.getState(),
      settingsStore: useSettingsStore.getState(),
      workspaceStore: useWorkspaceStore.getState(),
      showToast: (msg) => console.log('[Toast]', msg),
    });
  };

  const titleText = currentDocument
    ? `Prism · ${currentDocument.name}${currentDocument.isDirty ? ' •' : ''}`
    : 'Prism';

  return (
    <WindowShell>
      {!focusMode && <TitleBar title={titleText} />}
      {!focusMode && <MenuBar onAction={handleMenuAction} />}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, minWidth: 0 }}>
        {sidebarVisible && !focusMode && (
          <Sidebar
            fileTree={fileTree}
            documentContent={currentDocument?.content ?? ''}
            activePath={currentDocument?.path}
            onFileClick={async (path) => {
              try {
                const content = await readTextFile(path);
                openDocument(path, basename(path), content);
              } catch (err) {
                console.error('[App] Failed to switch file:', err);
              }
            }}
            onOutlineClick={handleOutlineClick}
          />
        )}
        <DocumentView ref={editorRef} onCursorChange={setCursor} />
      </div>

      {currentDocument && !focusMode && (
        <StatusBar
          viewMode={currentDocument.viewMode}
          wordCount={wordCount}
          cursor={cursor}
          theme={theme}
          onViewModeChange={handleViewModeChange}
          onExportHtml={handleExportHtml}
          onToggleFocusMode={() => useWorkspaceStore.getState().toggleFocusMode()}
          onToggleTheme={() => {
            const s = useSettingsStore.getState();
            s.setTheme(s.theme === 'light' ? 'dark' : 'light');
          }}
        />
      )}
    </WindowShell>
  );
}

export default App;
