import { stat, type FileInfo } from '@tauri-apps/plugin-fs';

export interface FileSnapshot {
  mtimeMs: number | null;
  size: number | null;
}

export function snapshotFromFileInfo(info: Pick<FileInfo, 'mtime' | 'size'>): FileSnapshot {
  return {
    mtimeMs: info.mtime ? info.mtime.getTime() : null,
    size: info.size,
  };
}

export async function getFileSnapshot(path: string): Promise<FileSnapshot> {
  return snapshotFromFileInfo(await stat(path));
}

export async function getFileSnapshotOrNull(path: string): Promise<FileSnapshot | null> {
  try {
    return await getFileSnapshot(path);
  } catch {
    return null;
  }
}

export function hasFileSnapshotChanged(known: FileSnapshot, current: FileSnapshot): boolean {
  if (known.size === null || current.size === null) return false;
  if (known.mtimeMs === null || current.mtimeMs === null) {
    return known.size !== current.size;
  }
  return known.mtimeMs !== current.mtimeMs || known.size !== current.size;
}

export function getExternalChangeMessage() {
  return '文件已在磁盘上被外部修改，请先重新加载或另存为。';
}
