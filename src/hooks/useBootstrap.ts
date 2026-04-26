import { useEffect } from 'react';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { useDocumentStore } from '../domains/document/store';
import { useWorkspaceStore } from '../domains/workspace/store';
import { loadFolderTree } from '../domains/workspace/lib/loadFolderTree';

function basename(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

function dirname(path: string): string {
  const parts = path.split(/[\\/]/);
  parts.pop();
  return parts.join(path.includes('\\') ? '\\' : '/');
}

export function useBootstrap() {
  const openDocument = useDocumentStore((s) => s.openDocument);
  const { setRootPath, setFileTree } = useWorkspaceStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const filePath = params.get('file');
    const folderPath = params.get('folder');

    (async () => {
      if (filePath) {
        console.log('[useBootstrap] Loading file:', filePath);
        try {
          const content = await readTextFile(filePath);
          openDocument(filePath, basename(filePath), content);

          const parentDir = dirname(filePath);
          console.log('[useBootstrap] Loading parent dir:', parentDir);
          setRootPath(parentDir);
          const tree = await loadFolderTree(parentDir);
          setFileTree(tree);
        } catch (err) {
          console.error('[useBootstrap] Failed to load file:', err);
        }
      } else if (folderPath) {
        console.log('[useBootstrap] Loading folder:', folderPath);
        try {
          setRootPath(folderPath);
          const tree = await loadFolderTree(folderPath);
          setFileTree(tree);
        } catch (err) {
          console.error('[useBootstrap] Failed to load folder:', err);
        }
      }
    })();
  }, [openDocument, setRootPath, setFileTree]);
}
