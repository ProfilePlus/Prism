import type { EditorView, KeyBinding } from '@codemirror/view';

type ListDirection = 'in' | 'out';

interface MarkdownListMarker {
  contentStart: number;
  indent: string;
  nextPrefix: string;
}

interface MarkdownListEnterEdit {
  type: 'continue' | 'exit';
  from: number;
  to: number;
  insert: string;
  selectionOffset: number;
}

interface MarkdownListIndentEdit {
  from: number;
  to: number;
  insert: string;
}

const LIST_MARKER_RE = /^(\s*)((?:[-+*])|(?:(\d+)([.)])))\s+(?:(\[(?: |x|X)\])\s+)?/;

function parseMarkdownListMarker(lineText: string): MarkdownListMarker | null {
  const match = lineText.match(LIST_MARKER_RE);
  if (!match) return null;

  const indent = match[1];
  const marker = match[2];
  const orderedNumber = match[3] ? Number.parseInt(match[3], 10) : null;
  const orderedDelimiter = match[4] ?? '.';
  const taskMarker = match[5] ? '[ ] ' : '';
  const nextMarker = orderedNumber === null
    ? `${marker} `
    : `${orderedNumber + 1}${orderedDelimiter} `;

  return {
    contentStart: match[0].length,
    indent,
    nextPrefix: `${indent}${nextMarker}${taskMarker}`,
  };
}

export function getMarkdownListEnterEdit(lineText: string, cursorColumn: number): MarkdownListEnterEdit | null {
  const marker = parseMarkdownListMarker(lineText);
  if (!marker || cursorColumn < marker.contentStart) return null;

  const itemContent = lineText.slice(marker.contentStart);
  if (itemContent.trim().length === 0) {
    return {
      type: 'exit',
      from: 0,
      to: lineText.length,
      insert: '',
      selectionOffset: 0,
    };
  }

  return {
    type: 'continue',
    from: cursorColumn,
    to: cursorColumn,
    insert: `\n${marker.nextPrefix}`,
    selectionOffset: marker.nextPrefix.length + 1,
  };
}

export function getMarkdownListIndentEdit(lineText: string, direction: ListDirection): MarkdownListIndentEdit | null {
  const marker = parseMarkdownListMarker(lineText);
  if (!marker) return null;

  if (direction === 'in') {
    return { from: 0, to: 0, insert: '  ' };
  }

  if (lineText.startsWith('  ')) {
    return { from: 0, to: 2, insert: '' };
  }
  if (lineText.startsWith('\t')) {
    return { from: 0, to: 1, insert: '' };
  }
  return null;
}

function continueMarkdownList(view: EditorView): boolean {
  const selection = view.state.selection.main;
  if (!selection.empty) return false;

  const line = view.state.doc.lineAt(selection.from);
  const cursorColumn = selection.from - line.from;
  const edit = getMarkdownListEnterEdit(line.text, cursorColumn);
  if (!edit) return false;

  const changeFrom = line.from + edit.from;
  const changeTo = line.from + edit.to;
  view.dispatch({
    changes: { from: changeFrom, to: changeTo, insert: edit.insert },
    selection: { anchor: changeFrom + edit.selectionOffset },
    scrollIntoView: true,
  });
  return true;
}

function adjustMarkdownListIndent(view: EditorView, direction: ListDirection): boolean {
  const changes = [];
  const touchedLines = new Set<number>();

  for (const range of view.state.selection.ranges) {
    const startLine = view.state.doc.lineAt(range.from);
    const endPosition = range.to > range.from && range.to === view.state.doc.lineAt(range.to).from
      ? range.to - 1
      : range.to;
    const endLine = view.state.doc.lineAt(Math.max(range.from, endPosition));

    for (let lineNumber = startLine.number; lineNumber <= endLine.number; lineNumber += 1) {
      if (touchedLines.has(lineNumber)) continue;
      touchedLines.add(lineNumber);

      const line = view.state.doc.line(lineNumber);
      const edit = getMarkdownListIndentEdit(line.text, direction);
      if (!edit) continue;

      changes.push({
        from: line.from + edit.from,
        to: line.from + edit.to,
        insert: edit.insert,
      });
    }
  }

  if (changes.length === 0) return false;
  view.dispatch({ changes });
  return true;
}

export const markdownListKeymap: KeyBinding[] = [
  { key: 'Enter', run: continueMarkdownList },
  { key: 'Tab', run: (view) => adjustMarkdownListIndent(view, 'in') },
  { key: 'Shift-Tab', run: (view) => adjustMarkdownListIndent(view, 'out') },
];
