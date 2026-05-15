import { useEffect, useRef } from 'react';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import {
  getExternalChangeMessage,
  getFileSnapshot,
  getFileSnapshotOrNull,
  hasFileSnapshotChanged,
} from '../fileSnapshot';
import {
  clearRecoverySnapshotsForDocument,
  createRecoverySnapshot,
} from '../services/recovery';
import { useDocumentStore } from '../store';

export function useAutoSave(interval = 2000, enabled = true) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const documentPath = useDocumentStore((s) => s.currentDocument?.path ?? '');
  const documentName = useDocumentStore((s) => s.currentDocument?.name ?? '');
  const documentContent = useDocumentStore((s) => s.currentDocument?.content ?? '');
  const isDirty = useDocumentStore((s) => s.currentDocument?.isDirty ?? false);
  const saveStatus = useDocumentStore((s) => s.currentDocument?.saveStatus ?? 'saved');
  const lastKnownMtime = useDocumentStore((s) => s.currentDocument?.lastKnownMtime ?? null);
  const lastKnownSize = useDocumentStore((s) => s.currentDocument?.lastKnownSize ?? null);
  const markSaving = useDocumentStore((s) => s.markSaving);
  const markSaved = useDocumentStore((s) => s.markSaved);
  const markSaveFailed = useDocumentStore((s) => s.markSaveFailed);
  const markSaveConflict = useDocumentStore((s) => s.markSaveConflict);

  useEffect(() => {
    if (!isDirty || !documentPath || saveStatus === 'conflict') {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      try {
        await createRecoverySnapshot({
          documentPath,
          documentName,
          content: documentContent,
          reason: 'autosave',
        }).catch(() => undefined);
        if (enabled) {
          const diskSnapshot = await getFileSnapshot(documentPath);
          if (hasFileSnapshotChanged({ mtimeMs: lastKnownMtime, size: lastKnownSize }, diskSnapshot)) {
            markSaveConflict(getExternalChangeMessage(), documentPath);
            return;
          }
          markSaving(documentPath);
          await writeTextFile(documentPath, documentContent);
          markSaved(documentPath, await getFileSnapshotOrNull(documentPath));
          await clearRecoverySnapshotsForDocument(documentPath).catch(() => undefined);
        }
      } catch (err) {
        markSaveFailed(err, documentPath);
      } finally {
        timerRef.current = null;
      }
    }, interval);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [
    documentContent,
    documentName,
    documentPath,
    enabled,
    interval,
    isDirty,
    lastKnownMtime,
    lastKnownSize,
    markSaveConflict,
    markSaveFailed,
    markSaved,
    markSaving,
    saveStatus,
  ]);
}
