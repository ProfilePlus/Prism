import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchPanel } from './SearchPanel';

describe('SearchPanel', () => {
  it('counts matches from the active document content', () => {
    render(
      <SearchPanel
        visible={true}
        viewMode="edit"
        content="评测任务\n评测维度\n普通文本"
        onClose={vi.fn()}
        onSearch={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('查找'), { target: { value: '评测' } });

    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('dispatches live input search like the MiaoYan find bar', () => {
    const onSearch = vi.fn();

    render(
      <SearchPanel
        visible={true}
        viewMode="edit"
        content="评测任务\n评测维度"
        onClose={vi.fn()}
        onSearch={onSearch}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('查找'), { target: { value: '评测' } });

    expect(onSearch).toHaveBeenCalledWith('input', {
      query: '评测',
      replaceWith: '',
      matchCase: false,
      regexp: false,
      wholeWord: false,
    });
  });

  it('uses the shared MiaoYan-style panel structure for replace mode', () => {
    const { container } = render(
      <SearchPanel
        visible={true}
        viewMode="edit"
        mode="replace"
        content="评测任务"
        onClose={vi.fn()}
        onSearch={vi.fn()}
      />,
    );

    expect(container.querySelector('.compat-search-panel')).toHaveClass('is-replace');
    expect(screen.getAllByLabelText('替换')[0]).toBeInTheDocument();
    expect(container.querySelector('.notepad-search-panel')).not.toBeInTheDocument();
  });

  it('dispatches replace and replace-all with the latest replacement text', () => {
    const onSearch = vi.fn();

    render(
      <SearchPanel
        visible={true}
        viewMode="edit"
        mode="replace"
        content="评测任务\n评测维度"
        initialQuery="评测"
        onClose={vi.fn()}
        onSearch={onSearch}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('替换'), { target: { value: '测试' } });
    fireEvent.click(screen.getByTitle('替换'));
    fireEvent.click(screen.getByTitle('全部替换'));

    expect(onSearch).toHaveBeenCalledWith('replace', {
      query: '评测',
      replaceWith: '测试',
      matchCase: false,
      regexp: false,
      wholeWord: false,
    });
    expect(onSearch).toHaveBeenCalledWith('replaceAll', {
      query: '评测',
      replaceWith: '测试',
      matchCase: false,
      regexp: false,
      wholeWord: false,
    });
  });

  it('syncs an externally seeded search query when the panel is already open', () => {
    const { rerender } = render(
      <SearchPanel
        visible={true}
        viewMode="edit"
        content="评测任务\n妙言设计"
        initialQuery="评测"
        onClose={vi.fn()}
        onSearch={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText('查找')).toHaveValue('评测');

    rerender(
      <SearchPanel
        visible={true}
        viewMode="edit"
        content="评测任务\n妙言设计"
        initialQuery="妙言"
        onClose={vi.fn()}
        onSearch={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText('查找')).toHaveValue('妙言');
  });
});
