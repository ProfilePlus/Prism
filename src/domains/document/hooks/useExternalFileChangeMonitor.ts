import { useCallback, useEffect } from 'react';
import {
  getExternalChangeMessage,
  getFileSnapshot,
  hasFileSnapshotChanged,
} from '../fileSnapshot';
import { useDocumentStore } from '../store';

export function useExternalFileChangeMonitor(interval = 15000, enabled = true) {
  const documentPath = useDocumentStore((s) => s.currentDocument?.path ?? '');
  const isDirty = useDocumentStore((s) => s.currentDocument?.isDirty ?? false);
  const saveStatus = useDocumentStore((s) => s.currentDocument?.saveStatus ?? 'saved');
  const lastKnownMtime = useDocumentStore((s) => s.currentDocument?.lastKnownMtime ?? null);
  const lastKnownSize = useDocumentStore((s) => s.currentDocument?.lastKnownSize ?? null);
  const markSaveConflict = useDocumentStore((s) => s.markSaveConflict);

  const checkForExternalChange = useCallback(async () => {
    if (!enabled || !documentPath || !isDirty || saveStatus === 'conflict' || saveStatus === 'saving') {
      return;
    }

    try {
      const diskSnapshot = await getFileSnapshot(documentPath);
      const knownSnapshot = {
        mtimeMs: lastKnownMtime,
        size: lastKnownSize,
      };

      if (hasFileSnapshotChanged(knownSnapshot, diskSnapshot)) {
        markSaveConflict(getExternalChangeMessage(), documentPath);
      }
    } catch {
      markSaveConflict(getExternalChangeMessage(), documentPath);
    }
  }, [
    documentPath,
    enabled,
    isDirty,
    lastKnownMtime,
    lastKnownSize,
    markSaveConflict,
    saveStatus,
  ]);

  useEffect(() => {
    if (!enabled) return undefined;

    const handleFocus = () => {
      void checkForExternalChange();
    };

    window.addEventListener('focus', handleFocus);
    const timer = window.setInterval(handleFocus, interval);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.clearInterval(timer);
    };
  }, [checkForExternalChange, enabled, interval]);
}
