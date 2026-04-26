import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBar } from './StatusBar';

describe('StatusBar', () => {
  it('renders mode, word count, line and column', () => {
    render(
      <StatusBar
        viewMode="split"
        wordCount={128}
        cursor={{ line: 12, column: 8 }}
        theme="dark"
      />
    );

    expect(screen.getByText('分栏')).toBeInTheDocument();
    expect(screen.getByText('128 字')).toBeInTheDocument();
    expect(screen.getByText('Ln 12, Col 8')).toBeInTheDocument();
    expect(screen.getByText('深色')).toBeInTheDocument();
  });
});
