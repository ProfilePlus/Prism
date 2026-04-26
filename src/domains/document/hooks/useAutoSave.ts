import { useEffect, useRef } from 'react';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { useDocumentStore } from '../store';

export function useAutoSave(interval = 2000) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentDocument = useDocumentStore((s) => s.currentDocument);
  const markSaved = useDocumentStore((s) => s.markSaved);

  useEffect(() => {
    if (!currentDocument || !currentDocument.isDirty) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    console.log('[useAutoSave] Detected dirty doc:', currentDocument.path);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      console.log('[useAutoSave] Saving:', currentDocument.path);
      try {
        await writeTextFile(currentDocument.path, currentDocument.content);
        console.log('[useAutoSave] Save success:', currentDocument.path);
        markSaved();
      } catch (err) {
        console.error(`[useAutoSave] Save failed:`, err);
      }
      timerRef.current = null;
    }, interval);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentDocument, markSaved, interval]);
}
