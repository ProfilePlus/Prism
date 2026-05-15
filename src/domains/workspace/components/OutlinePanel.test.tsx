import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OutlinePanel } from './OutlinePanel';

const outlineMarkdown = [
  '# Prism 产品方向',
  '',
  '正文',
  '## 导出工作台',
  '### PDF 导出',
  '## 预览同步',
  '### Mermaid 渲染',
].join('\n');

describe('OutlinePanel', () => {
  it('renders headings and jumps to the selected source line', () => {
    const onHeadingClick = vi.fn();
    render(<OutlinePanel content={outlineMarkdown} onHeadingClick={onHeadingClick} />);

    fireEvent.click(screen.getByRole('button', { name: 'PDF 导出' }));

    expect(onHeadingClick).toHaveBeenCalledWith(5);
  });

  it('filters headings by search query without changing click line numbers', () => {
    const onHeadingClick = vi.fn();
    render(<OutlinePanel content={outlineMarkdown} onHeadingClick={onHeadingClick} />);

    fireEvent.change(screen.getByRole('searchbox', { name: '搜索大纲标题' }), {
      target: { value: '导出' },
    });

    expect(screen.queryByRole('button', { name: 'Prism 产品方向' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '导出工作台' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PDF 导出' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '导出工作台' }));
    expect(onHeadingClick).toHaveBeenCalledWith(4);
  });

  it('shows an explicit empty state when search has no matches', () => {
    render(<OutlinePanel content={outlineMarkdown} />);

    fireEvent.change(screen.getByRole('searchbox', { name: '搜索大纲标题' }), {
      target: { value: '不存在' },
    });

    expect(screen.getByText('没有匹配标题')).toBeInTheDocument();
  });

  it('keeps the no-heading state compact', () => {
    render(<OutlinePanel content="正文没有标题" />);

    expect(screen.getByText('暂无标题')).toBeInTheDocument();
    expect(screen.queryByRole('searchbox', { name: '搜索大纲标题' })).not.toBeInTheDocument();
  });
});
