export type EditorFormat =
  | 'bold'
  | 'italic'
  | 'code'
  | 'link'
  | 'quote'
  | 'underline'
  | 'strikethrough'
  | 'highlight';

export type EditorFormatResult = {
  from: number;
  to: number;
  insert: string;
  selectionFrom: number;
  selectionTo: number;
};

type InlineFormatWrapper = {
  prefix: string;
  suffix: string;
  markerChar?: '*' | '~';
  markerLength?: number;
};

const INLINE_FORMAT_WRAPPERS: Partial<Record<EditorFormat, InlineFormatWrapper>> = {
  bold: { prefix: '**', suffix: '**' },
  italic: { prefix: '*', suffix: '*' },
  code: { prefix: '`', suffix: '`' },
  underline: { prefix: '<u>', suffix: '</u>' },
  strikethrough: { prefix: '~~', suffix: '~~' },
  highlight: { prefix: '==', suffix: '==' },
};

const PRECISION_INLINE_FORMAT_WRAPPERS: Partial<Record<EditorFormat, InlineFormatWrapper>> = {
  bold: { prefix: '**', suffix: '**', markerChar: '*', markerLength: 2 },
  italic: { prefix: '*', suffix: '*', markerChar: '*', markerLength: 1 },
  underline: { prefix: '<u>', suffix: '</u>' },
  strikethrough: { prefix: '~~', suffix: '~~', markerChar: '~', markerLength: 2 },
};

function countRunBackward(text: string, pos: number, char: string) {
  let count = 0;
  for (let index = pos - 1; index >= 0 && text[index] === char; index -= 1) {
    count += 1;
  }
  return count;
}

function countRunForward(text: string, pos: number, char: string) {
  let count = 0;
  for (let index = pos; index < text.length && text[index] === char; index += 1) {
    count += 1;
  }
  return count;
}

function getSelectionCore(doc: string, from: number, to: number) {
  let coreFrom = from;
  let coreTo = to;

  while (coreFrom < coreTo && /\s/.test(doc[coreFrom])) coreFrom += 1;
  while (coreTo > coreFrom && /\s/.test(doc[coreTo - 1])) coreTo -= 1;

  return {
    coreFrom,
    coreTo,
    core: doc.slice(coreFrom, coreTo),
  };
}

function hasSelectedWrapper(core: string, wrapper: InlineFormatWrapper) {
  if (
    !core.startsWith(wrapper.prefix) ||
    !core.endsWith(wrapper.suffix) ||
    core.length < wrapper.prefix.length + wrapper.suffix.length
  ) {
    return false;
  }

  if (wrapper.markerChar && wrapper.markerLength) {
    const startRun = countRunForward(core, 0, wrapper.markerChar);
    const endRun = countRunBackward(core, core.length, wrapper.markerChar);
    if (wrapper.markerChar === '*' && wrapper.markerLength === 1) {
      return (startRun === 1 && endRun === 1) || (startRun >= 3 && endRun >= 3);
    }
    return startRun >= wrapper.markerLength && endRun >= wrapper.markerLength;
  }

  return true;
}

function hasSurroundingWrapper(doc: string, coreFrom: number, coreTo: number, wrapper: InlineFormatWrapper) {
  if (
    coreFrom < wrapper.prefix.length ||
    doc.slice(coreFrom - wrapper.prefix.length, coreFrom) !== wrapper.prefix ||
    doc.slice(coreTo, coreTo + wrapper.suffix.length) !== wrapper.suffix
  ) {
    return false;
  }

  if (wrapper.markerChar && wrapper.markerLength) {
    const beforeRun = countRunBackward(doc, coreFrom, wrapper.markerChar);
    const afterRun = countRunForward(doc, coreTo, wrapper.markerChar);
    if (wrapper.markerChar === '*' && wrapper.markerLength === 1) {
      return (beforeRun === 1 && afterRun === 1) || (beforeRun >= 3 && afterRun >= 3);
    }
    return beforeRun >= wrapper.markerLength && afterRun >= wrapper.markerLength;
  }

  return true;
}

function getPrecisionInlineFormatResult(
  doc: string,
  from: number,
  to: number,
  wrapper: InlineFormatWrapper,
): EditorFormatResult {
  if (from === to) {
    const insert = `${wrapper.prefix}${wrapper.suffix}`;
    const selection = from + wrapper.prefix.length;
    return { from, to, insert, selectionFrom: selection, selectionTo: selection };
  }

  const { coreFrom, coreTo, core } = getSelectionCore(doc, from, to);

  if (coreFrom === coreTo) {
    const insert = `${wrapper.prefix}${wrapper.suffix}`;
    const selection = coreFrom + wrapper.prefix.length;
    return { from: coreFrom, to: coreTo, insert, selectionFrom: selection, selectionTo: selection };
  }

  if (hasSelectedWrapper(core, wrapper)) {
    const insert = core.slice(wrapper.prefix.length, core.length - wrapper.suffix.length);
    return {
      from: coreFrom,
      to: coreTo,
      insert,
      selectionFrom: coreFrom,
      selectionTo: coreFrom + insert.length,
    };
  }

  if (hasSurroundingWrapper(doc, coreFrom, coreTo, wrapper)) {
    const unwrapFrom = coreFrom - wrapper.prefix.length;
    const unwrapTo = coreTo + wrapper.suffix.length;
    return {
      from: unwrapFrom,
      to: unwrapTo,
      insert: core,
      selectionFrom: unwrapFrom,
      selectionTo: unwrapFrom + core.length,
    };
  }

  const insert = `${wrapper.prefix}${core}${wrapper.suffix}`;
  const selectionFrom = coreFrom + wrapper.prefix.length;
  return {
    from: coreFrom,
    to: coreTo,
    insert,
    selectionFrom,
    selectionTo: selectionFrom + core.length,
  };
}

function getEditorInlineFormatResult(
  doc: string,
  from: number,
  to: number,
  format: Exclude<EditorFormat, 'quote'>,
): EditorFormatResult {
  const selectedText = doc.slice(from, to);

  if (format === 'link') {
    const fullLink = selectedText.match(/^\[([^\]]+)\]\(([^)]*)\)$/);
    if (fullLink) {
      const insert = fullLink[1];
      return { from, to, insert, selectionFrom: from, selectionTo: from + insert.length };
    }

    const insert = `[${selectedText}](url)`;
    const urlStart = from + selectedText.length + 3;
    return { from, to, insert, selectionFrom: urlStart, selectionTo: urlStart + 3 };
  }

  const precisionWrapper = PRECISION_INLINE_FORMAT_WRAPPERS[format];
  if (precisionWrapper) {
    return getPrecisionInlineFormatResult(doc, from, to, precisionWrapper);
  }

  const wrapper = INLINE_FORMAT_WRAPPERS[format];
  if (!wrapper) {
    return { from, to, insert: selectedText, selectionFrom: from, selectionTo: to };
  }

  if (
    selectedText.startsWith(wrapper.prefix) &&
    selectedText.endsWith(wrapper.suffix) &&
    selectedText.length >= wrapper.prefix.length + wrapper.suffix.length
  ) {
    const insert = selectedText.slice(wrapper.prefix.length, selectedText.length - wrapper.suffix.length);
    return { from, to, insert, selectionFrom: from, selectionTo: from + insert.length };
  }

  const surroundingPrefix = doc.slice(Math.max(0, from - wrapper.prefix.length), from);
  const surroundingSuffix = doc.slice(to, to + wrapper.suffix.length);
  if (surroundingPrefix === wrapper.prefix && surroundingSuffix === wrapper.suffix) {
    const unwrapFrom = from - wrapper.prefix.length;
    const unwrapTo = to + wrapper.suffix.length;
    return {
      from: unwrapFrom,
      to: unwrapTo,
      insert: selectedText,
      selectionFrom: unwrapFrom,
      selectionTo: unwrapFrom + selectedText.length,
    };
  }

  const insert = `${wrapper.prefix}${selectedText}${wrapper.suffix}`;
  const selectionFrom = from + wrapper.prefix.length;
  return {
    from,
    to,
    insert,
    selectionFrom,
    selectionTo: selectionFrom + selectedText.length,
  };
}

function getLineRangeForSelection(doc: string, from: number, to: number) {
  const lineStart = doc.lastIndexOf('\n', Math.max(0, from - 1)) + 1;
  const endProbe = to > from && doc[to - 1] === '\n' ? to - 1 : to;
  const nextBreak = doc.indexOf('\n', endProbe);
  const lineEnd = nextBreak === -1 ? doc.length : nextBreak;
  return { lineStart, lineEnd };
}

function getEditorQuoteFormatResult(doc: string, from: number, to: number): EditorFormatResult {
  const { lineStart, lineEnd } = getLineRangeForSelection(doc, from, to);
  const selectedLines = doc.slice(lineStart, lineEnd);
  const lines = selectedLines.split('\n');
  const shouldUnquote = lines.every((line) => line.length === 0 || /^>\s?/.test(line));
  const insert = lines
    .map((line) => (shouldUnquote ? line.replace(/^>\s?/, '') : `> ${line}`))
    .join('\n');

  return {
    from: lineStart,
    to: lineEnd,
    insert,
    selectionFrom: lineStart,
    selectionTo: lineStart + insert.length,
  };
}

export function getEditorFormatResult(doc: string, from: number, to: number, format: EditorFormat) {
  if (format === 'quote') return getEditorQuoteFormatResult(doc, from, to);
  return getEditorInlineFormatResult(doc, from, to, format);
}
