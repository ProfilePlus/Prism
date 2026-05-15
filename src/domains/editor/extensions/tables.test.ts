import { describe, expect, it } from 'vitest';
import { getMarkdownTableCommandEdit } from './tables';

function applyTableCommand(
  doc: string,
  command: Parameters<typeof getMarkdownTableCommandEdit>[3],
  marker = '<cursor>',
) {
  const cursor = doc.indexOf(marker);
  const source = cursor >= 0 ? doc.replace(marker, '') : doc;
  const position = cursor >= 0 ? cursor : source.length;
  const edit = getMarkdownTableCommandEdit(source, position, position, command);
  if (!edit) return null;
  return `${source.slice(0, edit.from)}${edit.insert}${source.slice(edit.to)}`;
}

describe('markdown table editing', () => {
  it('inserts a three-column source markdown table', () => {
    expect(applyTableCommand('Intro\n<cursor>Outro', 'insert')).toBe(
      'Intro\n| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n|  |  |  |\nOutro',
    );
  });

  it('formats the current table without changing surrounding text', () => {
    expect(applyTableCommand([
      'Before',
      '| Name|Score |',
      '|---|---:|',
      '| Prism<cursor>|10|',
      '| Longer name | 8 |',
      'After',
    ].join('\n'), 'format')).toBe([
      'Before',
      '| Name        | Score |',
      '| ----------- | ----: |',
      '| Prism       |    10 |',
      '| Longer name |     8 |',
      'After',
    ].join('\n'));
  });

  it('adds and deletes rows around the active body row', () => {
    const table = [
      '| A | B |',
      '| --- | --- |',
      '| 1<cursor> | 2 |',
    ].join('\n');

    expect(applyTableCommand(table, 'addRow')).toBe([
      '| A   | B   |',
      '| --- | --- |',
      '| 1   | 2   |',
      '|     |     |',
    ].join('\n'));
    expect(applyTableCommand(table, 'deleteRow')).toBe([
      '| A   | B   |',
      '| --- | --- |',
    ].join('\n'));
  });

  it('adds and deletes columns next to the active cell', () => {
    const table = [
      '| A | B<cursor> |',
      '| --- | --- |',
      '| 1 | 2 |',
    ].join('\n');

    expect(applyTableCommand(table, 'addColumn')).toBe([
      '| A   | B   |     |',
      '| --- | --- | --- |',
      '| 1   | 2   |     |',
    ].join('\n'));
    expect(applyTableCommand(table, 'deleteColumn')).toBe([
      '| A   |',
      '| --- |',
      '| 1   |',
    ].join('\n'));
  });

  it('does not treat prose with pipes as a markdown table', () => {
    expect(applyTableCommand('A | B<cursor>', 'format')).toBeNull();
  });
});
