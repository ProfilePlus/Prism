import { useEffect } from 'react';
import { loadFolderTree } from '../lib/loadFolderTree';
import { useWorkspaceStore } from '../store';

export function useWorkspaceFocusRefresh(enabled = true) {
  const rootPath = useWorkspaceStore((state) => state.rootPath);
  const setFileTree = useWorkspaceStore((state) => state.setFileTree);

  useEffect(() => {
    if (!enabled || !rootPath) return undefined;

    let disposed = false;
    let inFlight = false;

    const refresh = async () => {
      if (inFlight || document.visibilityState === 'hidden') return;
      inFlight = true;
      try {
        const tree = await loadFolderTree(rootPath);
        if (!disposed && useWorkspaceStore.getState().rootPath === rootPath) {
          setFileTree(tree);
        }
      } catch {
        // Focus refresh is best effort; explicit user actions still surface errors.
      } finally {
        inFlight = false;
      }
    };

    const handleFocus = () => {
      void refresh();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refresh();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      disposed = true;
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, rootPath, setFileTree]);
}
