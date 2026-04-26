import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TabBar } from './TabBar';

describe('TabBar', () => {
  it('renders open tabs', () => {
    const tabs = [
      { path: '/test/a.md', name: 'a.md', isDirty: false },
      { path: '/test/b.md', name: 'b.md', isDirty: true },
    ];

    render(
      <TabBar
        tabs={tabs}
        activeTabPath="/test/a.md"
        onTabClick={vi.fn()}
        onTabClose={vi.fn()}
      />
    );

    expect(screen.getByText('a.md')).toBeInTheDocument();
    expect(screen.getByText('b.md')).toBeInTheDocument();
  });

  it('shows dirty indicator for unsaved tabs', () => {
    const tabs = [{ path: '/test/dirty.md', name: 'dirty.md', isDirty: true }];

    render(
      <TabBar
        tabs={tabs}
        activeTabPath="/test/dirty.md"
        onTabClick={vi.fn()}
        onTabClose={vi.fn()}
      />
    );

    expect(screen.getByText(/dirty\.md/)).toBeInTheDocument();
    expect(screen.getByText('•')).toBeInTheDocument();
  });
});
