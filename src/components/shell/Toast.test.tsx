import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createToastState } from '../../lib/toast';
import { Toast } from './Toast';

describe('Toast', () => {
  it('renders structured copy and runs actions', () => {
    const onDismiss = vi.fn();
    const onOpen = vi.fn();

    render(
      <Toast
        toast={createToastState({
          tone: 'success',
          title: 'PDF 导出完成',
          message: 'report.pdf',
          actions: [{ label: '打开', onClick: onOpen }],
        })}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('PDF 导出完成');
    expect(screen.getByRole('status')).toHaveTextContent('report.pdf');

    fireEvent.click(screen.getByRole('button', { name: '打开' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('keeps the toast visible when an action opts out of dismissal', () => {
    const onDismiss = vi.fn();
    const onInspect = vi.fn();

    render(
      <Toast
        toast={createToastState({
          tone: 'error',
          title: '导出失败',
          actions: [{ label: '查看诊断', onClick: onInspect, dismissOnClick: false }],
        })}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '查看诊断' }));

    expect(onDismiss).not.toHaveBeenCalled();
    expect(onInspect).toHaveBeenCalledTimes(1);
  });
});
