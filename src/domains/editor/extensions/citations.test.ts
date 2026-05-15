import { describe, expect, it } from 'vitest';
import { findPandocCitations } from './citations';

describe('findPandocCitations', () => {
  it('finds single and grouped Pandoc citekeys', () => {
    expect(findPandocCitations('参考 [@doe2024; @smith-2023, p. 12] 继续')).toEqual([
      {
        index: 3,
        keys: ['doe2024', 'smith-2023'],
        raw: '[@doe2024; @smith-2023, p. 12]',
      },
    ]);
  });

  it('ignores bracketed text without citekeys', () => {
    expect(findPandocCitations('[普通文本](docs/a.md)')).toEqual([]);
  });

  it('finds citekeys preceded by citation prose', () => {
    expect(findPandocCitations('更多讨论见 [see @doe2024]。')).toEqual([
      {
        index: 6,
        keys: ['doe2024'],
        raw: '[see @doe2024]',
      },
    ]);
  });

  it('finds suppress-author citations and richer Pandoc citekey characters', () => {
    expect(findPandocCitations('引用 [-@doe/2024; see -@team+paper_2026]。')).toEqual([
      {
        index: 3,
        keys: ['doe/2024', 'team+paper_2026'],
        raw: '[-@doe/2024; see -@team+paper_2026]',
      },
    ]);
  });

  it('does not treat bracketed email addresses as citekeys', () => {
    expect(findPandocCitations('[联系 jane@example.com 获取反馈]')).toEqual([]);
    expect(findPandocCitations('[联系 jane-doe@example.com 获取反馈]')).toEqual([]);
  });

  it('does not treat mailto links as citekeys', () => {
    expect(findPandocCitations('[mail](mailto:jane@example.com)')).toEqual([]);
  });
});
