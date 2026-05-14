import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBar } from './StatusBar';

describe('StatusBar', () => {
  it('renders word count, line and column', () => {
    render(
      <StatusBar
        wordCount={128}
        cursor={{ line: 1, column: 1 }}
        sidebarVisible={true}
        isSidebarHovered={false}
      />
    );

    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getByText('词')).toBeInTheDocument();
    expect(screen.getByText('LN')).toBeInTheDocument();
    expect(screen.getByText('COL')).toBeInTheDocument();
    expect(screen.getByTitle('新建文件')).toBeInTheDocument();
    expect(screen.getByTitle('切换到文档列表')).toBeInTheDocument();
  });
});
