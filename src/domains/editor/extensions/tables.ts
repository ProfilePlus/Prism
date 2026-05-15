export type MarkdownTableCommand =
  | 'insert'
  | 'format'
  | 'addRow'
  | 'addColumn'
  | 'deleteRow'
  | 'deleteColumn';

interface SourceLine {
  from: number;
  number: number;
  text: string;
  to: number;
}

interface MarkdownTableBlock {
  alignments: TableAlignment[];
  bodyRows: string[][];
  columnCount: number;
  cursorColumnIndex: number;
  cursorRowIndex: number;
  from: number;
  header: string[];
  to: number;
}

interface MarkdownTableCommandEdit {
  from: number;
  insert: string;
  selectionFrom: number;
  selectionTo: number;
  to: number;
}

type TableAlignment = 'left' | 'center' | 'right';

const INSERT_TABLE = '| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n|  |  |  |';

function getSourceLines(doc: string): SourceLine[] {
  const parts = doc.split('\n');
  let offset = 0;
  return parts.map((text, index) => {
    const from = offset;
    const to = from + text.length;
    offset = to + 1;
    return {
      from,
      number: index,
      text,
      to,
    };
  });
}

function getLineAt(lines: SourceLine[], position: number): SourceLine {
  return lines.find((line) => position >= line.from && position <= line.to) ?? lines[lines.length - 1];
}

function hasTablePipe(line: string): boolean {
  return /(^|[^\\])\|/.test(line);
}

function splitTableCells(line: string): string[] {
  const trimmed = line.trim();
  let content = trimmed.startsWith('|') ? trimmed.slice(1) : trimmed;
  if (content.endsWith('|')) content = content.slice(0, -1);

  const cells: string[] = [];
  let current = '';
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    if (char === '|' && content[index - 1] !== '\\') {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function isSeparatorCell(cell: string): boolean {
  return /^:?-{3,}:?$/.test(cell.trim());
}

function isSeparatorLine(line: string): boolean {
  const cells = splitTableCells(line);
  return cells.length > 0 && cells.every(isSeparatorCell);
}

function parseAlignment(cell: string): TableAlignment {
  const trimmed = cell.trim();
  const left = trimmed.startsWith(':');
  const right = trimmed.endsWith(':');
  if (left && right) return 'center';
  if (right) return 'right';
  return 'left';
}

function getCursorColumnIndex(lineText: string, cursorColumn: number, columnCount: number): number {
  const limitedColumn = Math.max(0, Math.min(cursorColumn, lineText.length));
  const beforeCursor = lineText.slice(0, limitedColumn);
  const pipeCount = [...beforeCursor].filter((char, index) => (
    char === '|' && beforeCursor[index - 1] !== '\\'
  )).length;
  const hasLeadingPipe = lineText.trimStart().startsWith('|') && beforeCursor.includes('|');
  return Math.max(0, Math.min(columnCount - 1, pipeCount - (hasLeadingPipe ? 1 : 0)));
}

function normalizeRow(row: string[], columnCount: number): string[] {
  return Array.from({ length: columnCount }, (_, index) => row[index] ?? '');
}

function findMarkdownTableBlock(doc: string, cursor: number): MarkdownTableBlock | null {
  const lines = getSourceLines(doc);
  const currentLine = getLineAt(lines, cursor);
  if (!hasTablePipe(currentLine.text)) return null;

  let first = currentLine.number;
  let last = currentLine.number;
  while (first > 0 && hasTablePipe(lines[first - 1].text)) first -= 1;
  while (last < lines.length - 1 && hasTablePipe(lines[last + 1].text)) last += 1;

  const tableLines = lines.slice(first, last + 1);
  const separatorIndex = tableLines.findIndex((line) => isSeparatorLine(line.text));
  if (separatorIndex <= 0) return null;

  const headerLine = tableLines[separatorIndex - 1];
  const tableBodyLines = tableLines.slice(separatorIndex + 1);
  const header = splitTableCells(headerLine.text);
  const separatorCells = splitTableCells(tableLines[separatorIndex].text);
  const bodyRows = tableBodyLines.map((line) => splitTableCells(line.text));
  const columnCount = Math.max(
    header.length,
    separatorCells.length,
    ...bodyRows.map((row) => row.length),
  );
  const alignments = Array.from({ length: columnCount }, (_, index) => (
    separatorCells[index] ? parseAlignment(separatorCells[index]) : 'left'
  ));

  return {
    alignments,
    bodyRows: bodyRows.map((row) => normalizeRow(row, columnCount)),
    columnCount,
    cursorColumnIndex: getCursorColumnIndex(currentLine.text, cursor - currentLine.from, columnCount),
    cursorRowIndex: Math.max(-2, currentLine.number - headerLine.number - 2),
    from: headerLine.from,
    header: normalizeRow(header, columnCount),
    to: tableLines[tableLines.length - 1].to,
  };
}

function padCell(value: string, width: number, alignment: TableAlignment): string {
  if (alignment === 'right') return value.padStart(width, ' ');
  if (alignment === 'center') {
    const total = width - value.length;
    const left = Math.floor(total / 2);
    const right = total - left;
    return `${' '.repeat(left)}${value}${' '.repeat(right)}`;
  }
  return value.padEnd(width, ' ');
}

function formatSeparatorCell(width: number, alignment: TableAlignment): string {
  const dashes = '-'.repeat(Math.max(3, width));
  if (alignment === 'center') return `:${dashes.slice(1, -1)}:`;
  if (alignment === 'right') return `${dashes.slice(0, -1)}:`;
  return dashes;
}

function formatMarkdownTable(
  header: string[],
  alignments: TableAlignment[],
  bodyRows: string[][],
): string {
  const columnCount = Math.max(header.length, alignments.length, ...bodyRows.map((row) => row.length));
  const normalizedHeader = normalizeRow(header, columnCount);
  const normalizedAlignments = Array.from({ length: columnCount }, (_, index) => alignments[index] ?? 'left');
  const normalizedRows = bodyRows.map((row) => normalizeRow(row, columnCount));
  const widths = Array.from({ length: columnCount }, (_, column) => Math.max(
    3,
    normalizedHeader[column].length,
    ...normalizedRows.map((row) => row[column].length),
  ));

  const formatRow = (row: string[]) => `| ${row.map((cell, index) => (
    padCell(cell, widths[index], normalizedAlignments[index])
  )).join(' | ')} |`;

  const separator = `| ${widths.map((width, index) => (
    formatSeparatorCell(width, normalizedAlignments[index]).padEnd(width, '-')
  )).join(' | ')} |`;

  return [
    formatRow(normalizedHeader),
    separator,
    ...normalizedRows.map(formatRow),
  ].join('\n');
}

function getInsertTableEdit(doc: string, from: number, to: number): MarkdownTableCommandEdit {
  const leadingNewline = from > 0 && doc[from - 1] !== '\n' ? '\n' : '';
  const trailingNewline = to < doc.length && doc[to] !== '\n' ? '\n' : '';
  const insert = `${leadingNewline}${INSERT_TABLE}${trailingNewline}`;
  const firstBodyCellOffset = insert.indexOf('|  |') + 2;
  const selection = from + Math.max(0, firstBodyCellOffset);

  return {
    from,
    to,
    insert,
    selectionFrom: selection,
    selectionTo: selection,
  };
}

function updateTable(
  block: MarkdownTableBlock,
  updater: (input: MarkdownTableBlock) => Pick<MarkdownTableBlock, 'alignments' | 'bodyRows' | 'header'> | null,
): MarkdownTableCommandEdit | null {
  const next = updater(block);
  if (!next) return null;

  return {
    from: block.from,
    to: block.to,
    insert: formatMarkdownTable(next.header, next.alignments, next.bodyRows),
    selectionFrom: block.from,
    selectionTo: block.from,
  };
}

export function getMarkdownTableCommandEdit(
  doc: string,
  selectionFrom: number,
  selectionTo: number,
  command: MarkdownTableCommand,
): MarkdownTableCommandEdit | null {
  if (command === 'insert') return getInsertTableEdit(doc, selectionFrom, selectionTo);

  const block = findMarkdownTableBlock(doc, selectionFrom);
  if (!block) return null;

  if (command === 'format') {
    return updateTable(block, ({ alignments, bodyRows, header }) => ({ alignments, bodyRows, header }));
  }

  if (command === 'addRow') {
    return updateTable(block, ({ alignments, bodyRows, columnCount, cursorRowIndex, header }) => {
      const nextRows = [...bodyRows];
      const insertAt = cursorRowIndex < 0 ? 0 : Math.min(cursorRowIndex + 1, nextRows.length);
      nextRows.splice(insertAt, 0, Array.from({ length: columnCount }, () => ''));
      return { alignments, bodyRows: nextRows, header };
    });
  }

  if (command === 'deleteRow') {
    return updateTable(block, ({ alignments, bodyRows, cursorRowIndex, header }) => {
      if (cursorRowIndex < 0 || bodyRows.length === 0) return null;
      const nextRows = bodyRows.filter((_, index) => index !== cursorRowIndex);
      return { alignments, bodyRows: nextRows, header };
    });
  }

  if (command === 'addColumn') {
    return updateTable(block, ({ alignments, bodyRows, cursorColumnIndex, header }) => {
      const insertAt = cursorColumnIndex + 1;
      const insertCell = (row: string[]) => {
        const next = [...row];
        next.splice(insertAt, 0, '');
        return next;
      };
      const nextAlignments = [...alignments];
      nextAlignments.splice(insertAt, 0, 'left');
      return {
        alignments: nextAlignments,
        bodyRows: bodyRows.map(insertCell),
        header: insertCell(header),
      };
    });
  }

  return updateTable(block, ({ alignments, bodyRows, columnCount, cursorColumnIndex, header }) => {
    if (columnCount <= 1) return null;
    const deleteAt = cursorColumnIndex;
    const deleteCell = (row: string[]) => row.filter((_, index) => index !== deleteAt);
    return {
      alignments: alignments.filter((_, index) => index !== deleteAt),
      bodyRows: bodyRows.map(deleteCell),
      header: deleteCell(header),
    };
  });
}
