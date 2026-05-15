import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AboutModal } from './AboutModal';

describe('AboutModal', () => {
  it('does not render when hidden', () => {
    render(
      <AboutModal
        visible={false}
        onClose={vi.fn()}
        version="1.4.0"
      />,
    );

    expect(screen.queryByRole('dialog', { name: '关于 Prism' })).not.toBeInTheDocument();
  });

  it('shows the current app version and update action', () => {
    const onCheckUpdate = vi.fn();

    render(
      <AboutModal
        visible
        onClose={vi.fn()}
        onCheckUpdate={onCheckUpdate}
        version="1.4.0"
      />,
    );

    expect(screen.getByRole('dialog', { name: '关于 Prism' })).toBeInTheDocument();
    expect(screen.getByText('PRISM · VERSION 1.4.0')).toBeInTheDocument();
    expect(screen.getByText('v1.4.0')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '检查更新' }));
    expect(onCheckUpdate).toHaveBeenCalledTimes(1);
  });
});
