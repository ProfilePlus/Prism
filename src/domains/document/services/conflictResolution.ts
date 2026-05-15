import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { basename } from '../../workspace/services/path';
import { addRecentFile } from '../../workspace/services/recentFiles';
import { getFileSnapshotOrNull } from '../fileSnapshot';
import { clearRecoverySnapshotsForDocument } from './recovery';
import { useDocumentStore } from '../store';
import type { OpenDocument } from '../types';

export interface RequestSavePathInput {
  filename: string;
  documentPath?: string;
}

export type RequestSavePath = (input: RequestSavePathInput) => Promise<string | null>;

export interface ConflictResolutionResult {
  resolved: boolean;
  path?: string;
}

function getCurrentConflictDocument(): OpenDocument | null {
  const doc = useDocumentStore.getState().currentDocument;
  if (!doc?.path || doc.saveStatus !== 'conflict') return null;
  return doc;
}

function markConflictFailure(doc: OpenDocument, error: unknown) {
  useDocumentStore.getState().markSaveConflict(error, doc.path);
}

export function getConflictCopyFilename(filename: string): string {
  const trimmed = filename.trim() || 'Untitled.md';
  const match = trimmed.match(/^(.*?)(\.(?:md|markdown))$/i);
  if (!match) return `${trimmed}-local.md`;
  const [, base, extension] = match;
  return `${base || 'Untitled'}-local${extension}`;
}

export async function reloadConflictedDocument(): Promise<ConflictResolutionResult> {
  const doc = getCurrentConflictDocument();
  if (!doc) return { resolved: false };

  try {
    const content = await readTextFile(doc.path);
    const snapshot = await getFileSnapshotOrNull(doc.path);
    useDocumentStore.getState().openDocument(doc.path, basename(doc.path), content, snapshot);
    addRecentFile(doc.path, basename(doc.path));
    await clearRecoverySnapshotsForDocument(doc.path).catch(() => undefined);
    return { resolved: true, path: doc.path };
  } catch (error) {
    markConflictFailure(doc, error);
    throw error;
  }
}

export async function saveConflictedDocumentAs(
  requestSavePath?: RequestSavePath,
): Promise<ConflictResolutionResult> {
  const doc = getCurrentConflictDocument();
  if (!doc) return { resolved: false };
  if (!requestSavePath) {
    const error = new Error('保存面板未就绪');
    markConflictFailure(doc, error);
    throw error;
  }

  const chosen = await requestSavePath({
    filename: getConflictCopyFilename(doc.name),
    documentPath: doc.path,
  });
  if (!chosen) return { resolved: false };

  try {
    useDocumentStore.getState().markSaving(doc.path);
    await writeTextFile(chosen, doc.content);
    const snapshot = await getFileSnapshotOrNull(chosen);
    useDocumentStore.getState().openDocument(chosen, basename(chosen), doc.content, snapshot);
    addRecentFile(chosen, basename(chosen));
    await clearRecoverySnapshotsForDocument(doc.path).catch(() => undefined);
    await clearRecoverySnapshotsForDocument(chosen).catch(() => undefined);
    return { resolved: true, path: chosen };
  } catch (error) {
    markConflictFailure(doc, error);
    throw error;
  }
}

export async function overwriteConflictedDocument(): Promise<ConflictResolutionResult> {
  const doc = getCurrentConflictDocument();
  if (!doc) return { resolved: false };

  try {
    useDocumentStore.getState().markSaving(doc.path);
    await writeTextFile(doc.path, doc.content);
    const snapshot = await getFileSnapshotOrNull(doc.path);
    useDocumentStore.getState().markSaved(doc.path, snapshot);
    addRecentFile(doc.path, basename(doc.path));
    await clearRecoverySnapshotsForDocument(doc.path).catch(() => undefined);
    return { resolved: true, path: doc.path };
  } catch (error) {
    markConflictFailure(doc, error);
    throw error;
  }
}
