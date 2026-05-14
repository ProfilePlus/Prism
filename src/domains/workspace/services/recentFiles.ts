import { isSamePath } from './path';

const RECENT_FILES_KEY = 'prism_recent_files';
const MAX_RECENT_FILES = 10;

export interface RecentFile {
  path: string;
  name: string;
  lastOpened: number;
}

export function getRecentFiles(): RecentFile[] {
  try {
    const stored = localStorage.getItem(RECENT_FILES_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as RecentFile[];
  } catch {
    return [];
  }
}

export function addRecentFile(path: string, name: string): void {
  const recent = getRecentFiles();
  const filtered = recent.filter((file) => !isSamePath(file.path, path));

  filtered.unshift({
    path,
    name,
    lastOpened: Date.now(),
  });

  try {
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(filtered.slice(0, MAX_RECENT_FILES)));
  } catch (err) {
    console.error('[RecentFiles] Failed to save:', err);
  }
}

export function clearRecentFiles(): void {
  try {
    localStorage.removeItem(RECENT_FILES_KEY);
  } catch (err) {
    console.error('[RecentFiles] Failed to clear:', err);
  }
}
