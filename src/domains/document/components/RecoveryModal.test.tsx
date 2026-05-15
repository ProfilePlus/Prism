import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RecoveryModal } from './RecoveryModal';
import type { RecoverySnapshot } from '../services/recovery';

const snapshot: RecoverySnapshot = {
  id: 'doc:1000',
  documentId: 'doc',
  documentPath: '/tmp/a.md',
  documentName: 'a.md',
  content: '# Draft',
  createdAt: 1000,
  reason: 'autosave',
  filePath: '/app/recovery/doc/1000.json',
};

describe('RecoveryModal', () => {
  it('does not render without a snapshot', () => {
    render(
      <RecoveryModal
        visible
        snapshot={null}
        busyAction={null}
        onRestore={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(screen.queryByRole('dialog', { name: '恢复文档' })).not.toBeInTheDocument();
  });

  it('offers restore and discard actions', () => {
    const onRestore = vi.fn();
    const onDiscard = vi.fn();

    render(
      <RecoveryModal
        visible
        snapshot={snapshot}
        busyAction={null}
        onRestore={onRestore}
        onDiscard={onDiscard}
      />,
    );

    expect(screen.getByRole('dialog', { name: '恢复文档' })).toBeInTheDocument();
    expect(screen.getByText('a.md')).toBeInTheDocument();
    expect(screen.getByText('/tmp/a.md')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '恢复这个版本' }));
    fireEvent.click(screen.getByRole('button', { name: '丢弃快照' }));

    expect(onRestore).toHaveBeenCalledTimes(1);
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it('locks actions while restoring', () => {
    render(
      <RecoveryModal
        visible
        snapshot={snapshot}
        busyAction="restore"
        onRestore={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '正在恢复...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '丢弃快照' })).toBeDisabled();
  });
});
