import { useEffect } from 'react';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { useDocumentStore } from '../domains/document/store';
import { useWorkspaceStore } from '../domains/workspace/store';
import { loadFolderTree } from '../domains/workspace/lib/loadFolderTree';
import { basename, dirname } from '../domains/workspace/services';

export function useBootstrap() {
  const currentDocument = useDocumentStore((s) => s.currentDocument);
  const openDocument = useDocumentStore((s) => s.openDocument);
  const { setRootPath, setFileTree } = useWorkspaceStore();

  useEffect(() => {
    if (currentDocument) return;

    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const filePath = params.get('file');
    const folderPath = params.get('folder');

    (async () => {
      if (filePath) {
        console.log('[useBootstrap] Loading file:', filePath);
        try {
          const content = await readTextFile(filePath);
          if (cancelled || useDocumentStore.getState().currentDocument) return;

          openDocument(filePath, basename(filePath), content);

          const parentDir = dirname(filePath);
          console.log('[useBootstrap] Loading parent dir:', parentDir);
          setRootPath(parentDir);
          const tree = await loadFolderTree(parentDir);
          if (cancelled) return;
          setFileTree(tree);
        } catch (err) {
          console.error('[useBootstrap] Failed to load file:', err);
        }
      } else if (folderPath) {
        console.log('[useBootstrap] Loading folder:', folderPath);
        try {
          setRootPath(folderPath);
          const tree = await loadFolderTree(folderPath);
          if (cancelled) return;
          setFileTree(tree);
        } catch (err) {
          console.error('[useBootstrap] Failed to load folder:', err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [openDocument, setRootPath, setFileTree]);
}
