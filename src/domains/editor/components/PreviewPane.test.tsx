import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { markdownToHtml } from '../../../lib/markdownToHtml';
import { PreviewPane } from './PreviewPane';

vi.mock('@tauri-apps/plugin-opener', () => ({
  openUrl: vi.fn(),
}));

vi.mock('../../../lib/markdownToHtml', () => ({
  markdownToHtml: vi.fn(() => '<p>Hello preview</p>'),
}));

describe('PreviewPane theme switching', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('data-content-theme', 'inkstone');
    vi.clearAllMocks();
  });

  it('does not rerun the markdown pipeline when only the content theme changes', async () => {
    render(<PreviewPane content="# Hello" />);

    expect(markdownToHtml).toHaveBeenCalledTimes(1);

    act(() => {
      document.documentElement.setAttribute('data-content-theme', 'slate');
    });

    await waitFor(() => {
      expect(document.querySelector('.preview-compat--slate')).toBeInTheDocument();
    });
    expect(markdownToHtml).toHaveBeenCalledTimes(1);
  });
});
