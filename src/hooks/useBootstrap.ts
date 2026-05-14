import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { exists, readTextFile } from '@tauri-apps/plugin-fs';
import { useDocumentStore } from '../domains/document/store';
import { useSettingsStore } from '../domains/settings/store';
import { useWorkspaceStore } from '../domains/workspace/store';
import { loadFolderTree } from '../domains/workspace/lib/loadFolderTree';
import { addRecentFile, basename, dirname } from '../domains/workspace/services';

export function useBootstrap() {
  const currentDocument = useDocumentStore((s) => s.currentDocument);
  const openDocument = useDocumentStore((s) => s.openDocument);
  const setViewMode = useDocumentStore((s) => s.setViewMode);
  const restoreLastSession = useSettingsStore((s) => s.restoreLastSession);
  const lastSession = useSettingsStore((s) => s.lastSession);
  const { setRootPath, setFileTree, setSidebarVisible, setSidebarTab } = useWorkspaceStore();

  useEffect(() => {
    if (currentDocument) return;

    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const filePath = params.get('file');
    const folderPath = params.get('folder');

    const openFile = async (path: string, restoreViewMode?: 'edit' | 'split' | 'preview') => {
      if (!(await exists(path))) return false;
      const content = await readTextFile(path);
      if (cancelled || useDocumentStore.getState().currentDocument) return true;

      openDocument(path, basename(path), content);
      if (restoreViewMode) setViewMode(restoreViewMode);
      addRecentFile(path, basename(path));

      const parentDir = dirname(path);
      setRootPath(parentDir);
      const tree = await loadFolderTree(parentDir);
      if (cancelled) return true;
      setFileTree(tree);
      return true;
    };

    const openFolder = async (path: string) => {
      if (!(await exists(path))) return false;
      setRootPath(path);
      const tree = await loadFolderTree(path);
      if (cancelled) return true;
      setFileTree(tree);
      return true;
    };

    (async () => {
      if (filePath) {
        console.log('[useBootstrap] Loading file:', filePath);
        try {
          await openFile(filePath);
        } catch (err) {
          console.error('[useBootstrap] Failed to load file:', err);
        }
        return;
      } else if (folderPath) {
        console.log('[useBootstrap] Loading folder:', folderPath);
        try {
          await openFolder(folderPath);
        } catch (err) {
          console.error('[useBootstrap] Failed to load folder:', err);
        }
        return;
      }

      try {
        const pendingFiles = await invoke<string[]>('get_pending_files');
        if (cancelled || useDocumentStore.getState().currentDocument) return;
        if (pendingFiles.length > 0 && await openFile(pendingFiles[0])) return;
      } catch {
        // Pending file integration is best effort.
      }

      if (!restoreLastSession || !lastSession) return;

      try {
        if (lastSession.sidebarVisible !== undefined) setSidebarVisible(lastSession.sidebarVisible);
        if (lastSession.sidebarTab) setSidebarTab(lastSession.sidebarTab);
        if (lastSession.filePath && await openFile(lastSession.filePath, lastSession.viewMode)) return;
        if (lastSession.folderPath) await openFolder(lastSession.folderPath);
      } catch (err) {
        console.error('[useBootstrap] Failed to restore last session:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    lastSession,
    openDocument,
    restoreLastSession,
    setFileTree,
    setRootPath,
    setSidebarTab,
    setSidebarVisible,
    setViewMode,
  ]);
}
