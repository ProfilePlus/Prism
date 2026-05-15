import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  exists,
  mkdir,
  readDir,
  readTextFile,
  remove,
  stat,
  writeTextFile,
} from '@tauri-apps/plugin-fs';
import { appDataDir } from '@tauri-apps/api/path';
import { useDocumentStore } from '../store';
import {
  clearRecoverySnapshotsForDocument,
  createRecoverySnapshot,
  deleteRecoverySnapshot,
  getRecoveryDocumentId,
  listRecoverySnapshots,
  restoreRecoverySnapshot,
} from './recovery';
import { addRecentFile } from '../../workspace/services/recentFiles';

vi.mock('@tauri-apps/api/path', () => ({
  appDataDir: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  exists: vi.fn(),
  mkdir: vi.fn(),
  readDir: vi.fn(),
  readTextFile: vi.fn(),
  remove: vi.fn(),
  stat: vi.fn(),
  writeTextFile: vi.fn(),
}));

vi.mock('../../workspace/services/recentFiles', () => ({
  addRecentFile: vi.fn(),
}));

vi.mock('../../../lib/fileSystemScope', () => ({
  grantMarkdownFileScope: vi.fn().mockResolvedValue(undefined),
}));

const files = new Map<string, string>();
const dirs = new Set<string>();

function normalizePath(path: string) {
  return path.replace(/\/+$/, '');
}

function seedDir(path: string) {
  dirs.add(normalizePath(path));
}

function listEntries(path: string) {
  const normalized = normalizePath(path);
  const prefix = `${normalized}/`;
  const names = new Set<string>();

  for (const dir of dirs) {
    if (!dir.startsWith(prefix)) continue;
    const rest = dir.slice(prefix.length);
    if (rest && !rest.includes('/')) names.add(rest);
  }

  for (const file of files.keys()) {
    if (!file.startsWith(prefix)) continue;
    const rest = file.slice(prefix.length);
    if (rest && !rest.includes('/')) names.add(rest);
  }

  return Array.from(names).map((name) => {
    const childPath = `${normalized}/${name}`;
    return {
      name,
      isDirectory: dirs.has(childPath),
      isFile: files.has(childPath),
      isSymlink: false,
    };
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(1000));
  vi.clearAllMocks();
  files.clear();
  dirs.clear();
  useDocumentStore.setState({ currentDocument: null });

  (appDataDir as ReturnType<typeof vi.fn>).mockResolvedValue('/app/Prism/');
  (exists as ReturnType<typeof vi.fn>).mockImplementation(async (path: string) => (
    dirs.has(normalizePath(path)) || files.has(normalizePath(path))
  ));
  (mkdir as ReturnType<typeof vi.fn>).mockImplementation(async (path: string) => {
    seedDir(path);
  });
  (writeTextFile as ReturnType<typeof vi.fn>).mockImplementation(async (path: string, content: string) => {
    files.set(normalizePath(path), content);
  });
  (readTextFile as ReturnType<typeof vi.fn>).mockImplementation(async (path: string) => {
    const content = files.get(normalizePath(path));
    if (content === undefined) throw new Error('missing file');
    return content;
  });
  (readDir as ReturnType<typeof vi.fn>).mockImplementation(async (path: string) => listEntries(path));
  (remove as ReturnType<typeof vi.fn>).mockImplementation(async (path: string, options?: { recursive?: boolean }) => {
    const normalized = normalizePath(path);
    if (options?.recursive) {
      for (const file of Array.from(files.keys())) {
        if (file === normalized || file.startsWith(`${normalized}/`)) files.delete(file);
      }
      for (const dir of Array.from(dirs)) {
        if (dir === normalized || dir.startsWith(`${normalized}/`)) dirs.delete(dir);
      }
      return;
    }
    files.delete(normalized);
    dirs.delete(normalized);
  });
  (stat as ReturnType<typeof vi.fn>).mockResolvedValue({ size: 10, mtime: new Date(2000) });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('recovery service', () => {
  it('creates and lists recovery snapshots under appData/recovery', async () => {
    const snapshot = await createRecoverySnapshot({
      documentPath: '/tmp/a.md',
      documentName: 'a.md',
      content: '# Draft',
      reason: 'autosave',
    });

    const documentId = getRecoveryDocumentId('/tmp/a.md');
    expect(snapshot).toMatchObject({
      id: `${documentId}:1000`,
      documentId,
      documentPath: '/tmp/a.md',
      documentName: 'a.md',
      content: '# Draft',
      createdAt: 1000,
      reason: 'autosave',
      filePath: `/app/Prism/recovery/${documentId}/1000.json`,
    });
    expect(mkdir).toHaveBeenCalledWith('/app/Prism/recovery', { recursive: true });
    expect(writeTextFile).toHaveBeenCalledWith(
      `/app/Prism/recovery/${documentId}/1000.json`,
      expect.stringContaining('"content":"# Draft"'),
    );

    expect(await listRecoverySnapshots()).toEqual([snapshot]);
  });

  it('keeps only the latest ten snapshots per document', async () => {
    for (let i = 0; i < 12; i += 1) {
      vi.setSystemTime(new Date(1000 + i));
      await createRecoverySnapshot({
        documentPath: '/tmp/a.md',
        documentName: 'a.md',
        content: `# Draft ${i}`,
        reason: 'autosave',
      });
    }

    const snapshots = await listRecoverySnapshots();

    expect(snapshots).toHaveLength(10);
    expect(snapshots[0].createdAt).toBe(1011);
    expect(snapshots[9].createdAt).toBe(1002);
    expect(files.has(`/app/Prism/recovery/${getRecoveryDocumentId('/tmp/a.md')}/1000.json`)).toBe(false);
    expect(files.has(`/app/Prism/recovery/${getRecoveryDocumentId('/tmp/a.md')}/1001.json`)).toBe(false);
  });

  it('does not overwrite snapshots created in the same millisecond', async () => {
    const first = await createRecoverySnapshot({
      documentPath: '/tmp/a.md',
      documentName: 'a.md',
      content: '# Draft 1',
      reason: 'autosave',
    });
    const second = await createRecoverySnapshot({
      documentPath: '/tmp/a.md',
      documentName: 'a.md',
      content: '# Draft 2',
      reason: 'manual-save',
    });

    expect(first?.createdAt).toBe(1000);
    expect(second?.createdAt).toBe(1001);
    expect(first?.filePath).toContain('/1000.json');
    expect(second?.filePath).toContain('/1001.json');
    expect(await listRecoverySnapshots()).toEqual([second, first]);
  });

  it('clears all recovery snapshots for a document', async () => {
    await createRecoverySnapshot({
      documentPath: '/tmp/a.md',
      documentName: 'a.md',
      content: '# Draft',
      reason: 'manual-save',
    });

    await clearRecoverySnapshotsForDocument('/tmp/a.md');

    expect(await listRecoverySnapshots()).toEqual([]);
    expect(remove).toHaveBeenCalledWith(
      `/app/Prism/recovery/${getRecoveryDocumentId('/tmp/a.md')}`,
      { recursive: true },
    );
  });

  it('deletes a discarded snapshot without deleting newer snapshots for the same document', async () => {
    const first = await createRecoverySnapshot({
      documentPath: '/tmp/a.md',
      documentName: 'a.md',
      content: '# Draft 1',
      reason: 'autosave',
    });
    vi.setSystemTime(new Date(1001));
    const second = await createRecoverySnapshot({
      documentPath: '/tmp/a.md',
      documentName: 'a.md',
      content: '# Draft 2',
      reason: 'autosave',
    });

    await deleteRecoverySnapshot(first!);

    expect(await listRecoverySnapshots()).toEqual([second]);
    expect(remove).toHaveBeenCalledWith(first!.filePath);
  });

  it('surfaces explicit discard failures so the recovery prompt can stay visible', async () => {
    const snapshot = await createRecoverySnapshot({
      documentPath: '/tmp/a.md',
      documentName: 'a.md',
      content: '# Draft',
      reason: 'autosave',
    });
    (remove as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('disk denied'));

    await expect(deleteRecoverySnapshot(snapshot!)).rejects.toThrow('disk denied');
    expect(await listRecoverySnapshots()).toEqual([snapshot]);
  });

  it('ignores corrupt and misplaced snapshot files during startup scan', async () => {
    const valid = await createRecoverySnapshot({
      documentPath: '/tmp/a.md',
      documentName: 'a.md',
      content: '# Valid',
      reason: 'autosave',
    });
    const misplacedDir = '/app/Prism/recovery/ffffffff';
    seedDir(misplacedDir);
    files.set(`${misplacedDir}/1002.json`, JSON.stringify({
      version: 1,
      documentPath: '/tmp/a.md',
      documentName: 'a.md',
      content: '# Wrong directory',
      createdAt: 1002,
      reason: 'autosave',
    }));
    files.set(`${misplacedDir}/broken.json`, '{');

    expect(await listRecoverySnapshots()).toEqual([valid]);
  });

  it('ignores parseable snapshots with malformed metadata during startup scan', async () => {
    const valid = await createRecoverySnapshot({
      documentPath: '/tmp/a.md',
      documentName: 'a.md',
      content: '# Valid',
      reason: 'autosave',
    });
    const documentDir = `/app/Prism/recovery/${getRecoveryDocumentId('/tmp/a.md')}`;
    files.set(`${documentDir}/bad-created-at.json`, JSON.stringify({
      version: 1,
      documentPath: '/tmp/a.md',
      documentName: 'a.md',
      content: '# Bad timestamp',
      createdAt: '1002',
      reason: 'autosave',
    }));
    files.set(`${documentDir}/bad-reason.json`, JSON.stringify({
      version: 1,
      documentPath: '/tmp/a.md',
      documentName: 'a.md',
      content: '# Bad reason',
      createdAt: 1003,
      reason: 'manual',
    }));
    files.set(`${documentDir}/bad-content.json`, JSON.stringify({
      version: 1,
      documentPath: '/tmp/a.md',
      documentName: 'a.md',
      content: null,
      createdAt: 1004,
      reason: 'autosave',
    }));

    expect(await listRecoverySnapshots()).toEqual([valid]);
  });

  it('falls back to the document basename for legacy snapshots without a stored name', async () => {
    const documentId = getRecoveryDocumentId('/tmp/legacy.md');
    const documentDir = `/app/Prism/recovery/${documentId}`;
    seedDir('/app/Prism/recovery');
    seedDir(documentDir);
    files.set(`${documentDir}/1000.json`, JSON.stringify({
      version: 1,
      documentPath: '/tmp/legacy.md',
      content: '# Legacy',
      createdAt: 1000,
      reason: 'autosave',
    }));

    expect(await listRecoverySnapshots()).toEqual([
      expect.objectContaining({
        documentName: 'legacy.md',
        documentPath: '/tmp/legacy.md',
      }),
    ]);
  });

  it('restores a snapshot as a dirty document', async () => {
    const snapshot = await createRecoverySnapshot({
      documentPath: '/tmp/a.md',
      documentName: 'a.md',
      content: '# Recovered',
      reason: 'autosave',
    });

    await restoreRecoverySnapshot(snapshot!);

    expect(useDocumentStore.getState().currentDocument).toMatchObject({
      path: '/tmp/a.md',
      name: 'a.md',
      content: '# Recovered',
      isDirty: true,
      saveStatus: 'dirty',
      lastKnownMtime: 2000,
      lastKnownSize: 10,
    });
    expect(addRecentFile).toHaveBeenCalledWith('/tmp/a.md', 'a.md');
  });
});
