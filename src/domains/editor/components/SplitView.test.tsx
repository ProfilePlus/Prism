/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SplitView } from './SplitView';

const mockState = vi.hoisted(() => ({
  mounts: 0,
  unmounts: 0,
}));

vi.mock('./EditorPane', async () => {
  const React = await import('react');

  return {
    EditorPane: React.forwardRef((props: { content: string }, ref) => {
      React.useEffect(() => {
        mockState.mounts += 1;
        return () => {
          mockState.unmounts += 1;
        };
      }, []);

      React.useImperativeHandle(ref, () => ({
        focus: vi.fn(),
        jumpToLine: vi.fn(),
        setScrollRatio: vi.fn(),
        scrollToLine: vi.fn(),
        execSearch: vi.fn(),
        restoreSearch: vi.fn(),
        getSelectedText: vi.fn(() => ''),
      }));

      return React.createElement('div', { 'data-testid': 'editor-pane' }, props.content);
    }),
  };
});

vi.mock('./PreviewPane', () => ({
  PreviewPane: ({ content }: { content: string }) => (
    <div data-testid="preview-pane">{content}</div>
  ),
}));

describe('SplitView editor lifecycle', () => {
  beforeEach(() => {
    mockState.mounts = 0;
    mockState.unmounts = 0;
  });

  it('keeps the editor mounted when switching through preview mode so undo history survives', () => {
    const props = {
      content: 'hello Prism',
      onChange: vi.fn(),
      onCursorChange: vi.fn(),
    };
    const { rerender } = render(<SplitView {...props} viewMode="edit" />);

    expect(screen.getByTestId('editor-pane')).toBeTruthy();
    expect(mockState.mounts).toBe(1);
    expect(mockState.unmounts).toBe(0);

    rerender(<SplitView {...props} viewMode="preview" />);

    expect(screen.getByTestId('editor-pane')).toBeTruthy();
    expect(screen.getByTestId('preview-pane')).toBeTruthy();
    expect(mockState.mounts).toBe(1);
    expect(mockState.unmounts).toBe(0);

    rerender(<SplitView {...props} viewMode="edit" />);

    expect(screen.getByTestId('editor-pane')).toBeTruthy();
    expect(mockState.mounts).toBe(1);
    expect(mockState.unmounts).toBe(0);
  });
});
