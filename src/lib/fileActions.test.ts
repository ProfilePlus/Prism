import { describe, expect, it, vi } from 'vitest';
import { deletePathWithTrashFallback } from './fileActions';

describe('deletePathWithTrashFallback', () => {
  it('does not delete anything when the initial trash confirmation is cancelled', async () => {
    const confirmDialog = vi.fn().mockResolvedValue(false);
    const moveToTrash = vi.fn();
    const permanentDelete = vi.fn();

    const result = await deletePathWithTrashFallback({
      confirmDialog,
      displayName: 'draft.md',
      isDirectory: false,
      moveToTrash,
      path: '/notes/draft.md',
      permanentDelete,
    });

    expect(result).toEqual({ deleted: false, mode: 'cancelled' });
    expect(confirmDialog).toHaveBeenCalledTimes(1);
    expect(moveToTrash).not.toHaveBeenCalled();
    expect(permanentDelete).not.toHaveBeenCalled();
  });

  it('moves files to system trash before using permanent deletion', async () => {
    const confirmDialog = vi.fn().mockResolvedValue(true);
    const moveToTrash = vi.fn().mockResolvedValue(undefined);
    const permanentDelete = vi.fn();

    const result = await deletePathWithTrashFallback({
      confirmDialog,
      displayName: 'draft.md',
      isDirectory: false,
      moveToTrash,
      path: '/notes/draft.md',
      permanentDelete,
    });

    expect(result).toEqual({ deleted: true, mode: 'trash' });
    expect(confirmDialog).toHaveBeenCalledWith(
      '确定要将“draft.md”移到系统废纸篓吗？',
      expect.objectContaining({ okLabel: '移到废纸篓', title: '移到废纸篓' }),
    );
    expect(moveToTrash).toHaveBeenCalledWith('/notes/draft.md');
    expect(permanentDelete).not.toHaveBeenCalled();
  });

  it('requires a second irreversible confirmation when trash fails', async () => {
    const confirmDialog = vi.fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const moveToTrash = vi.fn().mockRejectedValue(new Error('trash unavailable'));
    const permanentDelete = vi.fn();

    const result = await deletePathWithTrashFallback({
      confirmDialog,
      displayName: 'draft.md',
      isDirectory: false,
      moveToTrash,
      path: '/notes/draft.md',
      permanentDelete,
    });

    expect(result).toEqual({
      deleted: false,
      error: 'trash unavailable',
      mode: 'cancelled',
    });
    expect(confirmDialog).toHaveBeenNthCalledWith(
      2,
      '无法移到系统废纸篓：trash unavailable\n\n是否永久删除“draft.md”？此操作不可撤销。',
      expect.objectContaining({ okLabel: '永久删除', title: '永久删除确认' }),
    );
    expect(permanentDelete).not.toHaveBeenCalled();
  });

  it('keeps permanent deletion behind the fallback confirmation', async () => {
    const confirmDialog = vi.fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    const moveToTrash = vi.fn().mockRejectedValue('not supported');
    const permanentDelete = vi.fn().mockResolvedValue(undefined);

    const result = await deletePathWithTrashFallback({
      confirmDialog,
      displayName: 'Projects',
      isDirectory: true,
      moveToTrash,
      path: '/notes/Projects',
      permanentDelete,
    });

    expect(result).toEqual({
      deleted: true,
      error: 'not supported',
      mode: 'permanent',
    });
    expect(permanentDelete).toHaveBeenCalledWith('/notes/Projects', { recursive: true });
  });
});
