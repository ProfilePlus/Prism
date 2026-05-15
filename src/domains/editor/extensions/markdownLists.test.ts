import { describe, expect, it } from 'vitest';
import { getMarkdownListEnterEdit, getMarkdownListIndentEdit } from './markdownLists';

describe('markdown list editing', () => {
  it('continues unordered list items', () => {
    expect(getMarkdownListEnterEdit('- first item', '- first item'.length)).toEqual({
      type: 'continue',
      from: 12,
      to: 12,
      insert: '\n- ',
      selectionOffset: 3,
    });
  });

  it('increments ordered list numbers and preserves the delimiter', () => {
    expect(getMarkdownListEnterEdit('9) ninth', '9) ninth'.length)?.insert).toBe('\n10) ');
  });

  it('continues task lists with an unchecked item', () => {
    expect(getMarkdownListEnterEdit('- [x] done', '- [x] done'.length)?.insert).toBe('\n- [ ] ');
    expect(getMarkdownListEnterEdit('  3. [ ] nested', '  3. [ ] nested'.length)?.insert).toBe('\n  4. [ ] ');
  });

  it('exits an empty list item instead of inserting another marker', () => {
    expect(getMarkdownListEnterEdit('  -   ', '  -   '.length)).toEqual({
      type: 'exit',
      from: 0,
      to: 6,
      insert: '',
      selectionOffset: 0,
    });
  });

  it('does not handle non-list lines or cursors inside the marker', () => {
    expect(getMarkdownListEnterEdit('plain text', 'plain text'.length)).toBeNull();
    expect(getMarkdownListEnterEdit('- item', 1)).toBeNull();
  });

  it('indents and outdents markdown list items by one markdown nesting step', () => {
    expect(getMarkdownListIndentEdit('- item', 'in')).toEqual({ from: 0, to: 0, insert: '  ' });
    expect(getMarkdownListIndentEdit('  - item', 'out')).toEqual({ from: 0, to: 2, insert: '' });
    expect(getMarkdownListIndentEdit('\t- item', 'out')).toEqual({ from: 0, to: 1, insert: '' });
    expect(getMarkdownListIndentEdit('- item', 'out')).toBeNull();
    expect(getMarkdownListIndentEdit('plain text', 'in')).toBeNull();
  });
});
