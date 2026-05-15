import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FileNode } from '../../domains/workspace/types';
import { CommandPalette } from './CommandPalette';

const files: FileNode[] = [
  {
    path: '/notes/b',
    name: 'b',
    kind: 'directory',
    children: [
      { path: '/notes/b/z.md', name: 'z.md', kind: 'file', modifiedAt: 20, preview: 'Zeta' },
      { path: '/notes/b/a.md', name: 'a.md', kind: 'file', modifiedAt: 40, preview: 'Alpha' },
    ],
  },
  { path: '/notes/root.md', name: 'root.md', kind: 'file', modifiedAt: 30, preview: 'Root file' },
];

describe('CommandPalette', () => {
  it('searches workspace files in quick-open mode and executes the selected file action', () => {
    const onExecute = vi.fn();
    const onClose = vi.fn();

    render(
      <CommandPalette
        visible
        commands={[]}
        files={files}
        workspaceRoot="/notes"
        recentFiles={[{ path: '/notes/root.md', lastOpened: 100 }]}
        mode="files"
        onClose={onClose}
        onExecute={onExecute}
      />,
    );

    expect(screen.getByPlaceholderText('搜索工作区文件…')).toBeInTheDocument();
    expect(screen.getAllByText(/\.md$/).map((node) => node.textContent)).toEqual(['root.md', 'a.md', 'z.md']);
    expect(screen.getByText('a.md')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('搜索工作区文件…'), {
      target: { value: 'zeta' },
    });
    expect(screen.getByText('z.md')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Enter' });

    expect(onExecute).toHaveBeenCalledWith(`openWorkspaceFile:${encodeURIComponent('/notes/b/z.md')}`);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
