import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDocumentStore } from '../domains/document/store';
import { useWorkspaceStore } from '../domains/workspace/store';
import { useSettingsStore } from '../domains/settings/store';

vi.mock('@tauri-apps/plugin-fs', () => ({
  readTextFile: vi.fn(),
  exists: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('../domains/workspace/lib/loadFolderTree', () => ({
  loadFolderTree: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { exists, readTextFile } from '@tauri-apps/plugin-fs';
import { loadFolderTree } from '../domains/workspace/lib/loadFolderTree';
import { useBootstrap } from './useBootstrap';

beforeEach(() => {
  useDocumentStore.setState({ currentDocument: null });
  useWorkspaceStore.setState({ fileTree: [], rootPath: null });
  useSettingsStore.setState({
    restoreLastSession: true,
    lastSession: null,
    recentFiles: [],
    saveSettings: vi.fn(),
  });
  window.history.replaceState({}, '', '?file=C:/docs/bootstrap.md');
  vi.clearAllMocks();
  (exists as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  (invoke as ReturnType<typeof vi.fn>).mockResolvedValue([]);
});

describe('useBootstrap', () => {
  it('does not overwrite a user-selected document when bootstrap finishes late', async () => {
    let resolveRead!: (v: string) => void;
    (readTextFile as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise<string>((res) => { resolveRead = res; })
    );

    renderHook(() => useBootstrap());

    act(() => {
      useDocumentStore.getState().openDocument('C:/docs/user-file.md', 'user-file.md', 'user content');
    });

    await act(async () => {
      resolveRead('bootstrap content');
      await Promise.resolve();
    });

    const doc = useDocumentStore.getState().currentDocument;
    expect(doc?.path).toBe('C:/docs/user-file.md');
    expect(doc?.content).toBe('user content');
  });

  it('loads file tree after opening the bootstrap file', async () => {
    const mockTree = [{ name: 'test.md', path: 'C:/docs/test.md' }];
    let resolveTree!: (value: typeof mockTree) => void;

    (readTextFile as ReturnType<typeof vi.fn>).mockResolvedValue('file content');
    (loadFolderTree as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise<typeof mockTree>((res) => {
        resolveTree = res;
      })
    );

    renderHook(() => useBootstrap());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      resolveTree(mockTree);
      await Promise.resolve();
      await Promise.resolve();
    });

    const ws = useWorkspaceStore.getState();
    expect(ws.rootPath).toBe('C:/docs');
    expect(ws.fileTree).toEqual(mockTree);
  });
});
