import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { EditorView, ViewUpdate, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine, Decoration, DecorationSet } from '@codemirror/view';
import { Compartment, EditorState, Facet, Prec, StateEffect, StateField } from '@codemirror/state';

// 定义闪烁效果的 Effect
const addLineFlash = StateEffect.define<number>();
const removeLineFlash = StateEffect.define<number>();

// 管理闪烁装饰的 Field
const lineFlashField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(flashes, tr) {
    flashes = flashes.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(addLineFlash)) {
        const deco = Decoration.line({
          attributes: { class: 'cm-line-flash' }
        });
        flashes = flashes.update({
          add: [deco.range(tr.state.doc.lineAt(e.value).from)]
        });
      } else if (e.is(removeLineFlash)) {
        return Decoration.none;
      }
    }
    return flashes;
  },
  provide: f => EditorView.decorations.from(f)
});

const editorSelectionDecoration = Decoration.mark({ class: 'cm-editor-selection-mark' });

function buildEditorSelectionDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const range of view.state.selection.ranges) {
    if (!range.empty) {
      builder.add(range.from, range.to, editorSelectionDecoration);
    }
  }
  return builder.finish();
}

import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { history, historyKeymap, defaultKeymap, indentWithTab, undo, redo } from '@codemirror/commands';
import { indentOnInput, bracketMatching, foldGutter, foldKeymap, syntaxTree } from '@codemirror/language';
import { ViewPlugin } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { SearchQuery, setSearchQuery, findNext, findPrevious, replaceNext, replaceAll, search, selectMatches, openSearchPanel, searchPanelOpen } from '@codemirror/search';
import hljs from 'highlight.js';
import { useSettingsStore } from '../../settings/store';
import type { ContentTheme } from '../../settings/types';
import { useWorkspaceStore } from '../../workspace/store';
import type { SearchAction, SearchParams } from './SearchPanel';
import { ContextMenu, ContextMenuItem } from '../../../components/shell/ContextMenu';
import { markdownToHtml } from '../../../lib/markdownToHtml';

const editorLineNumbersCompartment = new Compartment();
const editorDarkThemeCompartment = new Compartment();
const editorContentThemeCompartment = new Compartment();
const contentThemeFacet = Facet.define<ContentTheme, ContentTheme>({
  combine: (values) => values[values.length - 1] ?? 'miaoyan',
});
const editorDarkThemeExtension = [
  oneDark,
  EditorView.theme(
    {
      '.cm-content': { color: '#E2E8F0' },
      '.cm-gutters': { borderRight: '1px solid var(--stroke-surface)' },
    },
    { dark: true },
  ),
];

const DARK_CONTENT_THEMES = new Set(['nocturne']);
const LIGHT_CONTENT_THEMES = new Set(['miaoyan', 'inkstone', 'slate', 'mono']);
const COMPATIBILITY_CODE_HIGHLIGHT_THEMES = new Set<ContentTheme>([
  'miaoyan',
  'inkstone',
  'slate',
  'mono',
  'nocturne',
]);

function shouldUseDarkEditor(contentTheme: string, theme: string) {
  return DARK_CONTENT_THEMES.has(contentTheme)
    ? true
    : LIGHT_CONTENT_THEMES.has(contentTheme)
      ? false
      : theme === 'dark';
}

function getLineNumberExtensions(showLineNumbers: boolean) {
  return showLineNumbers ? [lineNumbers(), highlightActiveLineGutter()] : [];
}

function getDarkThemeExtensions(isEditorDark: boolean) {
  return isEditorDark ? editorDarkThemeExtension : [];
}

function getContentThemeExtension(contentTheme: ContentTheme) {
  return contentThemeFacet.of(contentTheme);
}

function createHiddenSearchPanel() {
  const dom = document.createElement('div');
  dom.className = 'cm-search cm-compat-hidden-search-panel';
  dom.setAttribute('aria-hidden', 'true');
  return { dom, top: true };
}

function ensureSearchHighlighterEnabled(view: EditorView) {
  if (!searchPanelOpen(view.state)) {
    openSearchPanel(view);
  }
}

export interface EditorPaneHandle {
  focus: () => void;
  jumpToLine: (line: number) => void;
  setScrollRatio: (ratio: number) => void;
  scrollToLine: (line: number) => void;
  execSearch?: (action: SearchAction, params: SearchParams) => void;
  restoreSearch?: (params: SearchParams, currentMatch: number) => void;
  getSelectedText?: () => string;
}

interface EditorPaneProps {
  content: string;
  onChange: (content: string) => void;
  onCursorChange?: (cursor: { line: number; column: number }) => void;
  onScrollRatioChange?: (ratio: number) => void;
  onTopLineChange?: (line: number) => void;
  onScroll?: () => void;
}

type EditorFormat =
  | 'bold'
  | 'italic'
  | 'code'
  | 'link'
  | 'quote'
  | 'underline'
  | 'strikethrough'
  | 'highlight';

type EditorFormatResult = {
  from: number;
  to: number;
  insert: string;
  selectionFrom: number;
  selectionTo: number;
};

// Compatibility themes use semantic Markdown decorations; each theme owns the
// final colors in CSS so the parser layer stays visual-theme agnostic.
const compatibilityDecos = {
  heading: Decoration.mark({ class: 'cm-md-heading' }),
  listMark: Decoration.mark({ class: 'cm-md-list-marker' }),
  quote: Decoration.mark({ class: 'cm-md-quote' }),
  codeInline: Decoration.mark({ class: 'cm-md-code-inline' }),
  fencedCode: Decoration.mark({ class: 'cm-md-fenced-code' }),
  strong: Decoration.mark({ class: 'cm-md-strong' }),
  emphasis: Decoration.mark({ class: 'cm-md-emphasis' }),
  strike: Decoration.mark({ class: 'cm-md-strike' }),
  linkText: Decoration.mark({ class: 'cm-md-link-text' }),
  imageMark: Decoration.mark({ class: 'cm-md-image-mark' }),
};

type HighlightTokenRange = {
  from: number;
  to: number;
  className: string;
};

type MiaoyanCodeHighlightTarget = {
  code: string;
  offset: number;
  language?: string;
};

const MIAOYAN_CODE_BLOCK_HIGHLIGHT_LIMIT = 3000;
const codeHighlightDecorationCache = new Map<string, Decoration>();
const codeHighlightResultCache = new Map<string, HighlightTokenRange[]>();

function getCodeHighlightDecoration(className: string) {
  const cached = codeHighlightDecorationCache.get(className);
  if (cached) return cached;
  const decoration = Decoration.mark({ class: `cm-code-token ${className}` });
  codeHighlightDecorationCache.set(className, decoration);
  return decoration;
}

function getMiaoyanCodeLanguage(code: string) {
  if (!code.startsWith('```')) return undefined;

  const firstLineEnd = code.search(/\r?\n/);
  if (firstLineEnd === -1) return undefined;

  const language = code
    .slice(3, firstLineEnd)
    .trim();

  if (!language || language === 'go' || !hljs.getLanguage(language)) {
    return undefined;
  }

  return language;
}

function collectHighlightTokenRanges(html: string, originalLength: number) {
  const template = document.createElement('template');
  template.innerHTML = html;

  const ranges: HighlightTokenRange[] = [];
  let offset = 0;

  const walk = (node: Node, inheritedClasses: string[]) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      const length = text.length;
      if (length > 0 && inheritedClasses.length > 0) {
        ranges.push({
          from: offset,
          to: offset + length,
          className: inheritedClasses.join(' '),
        });
      }
      offset += length;
      return;
    }

    if (!(node instanceof Element)) {
      node.childNodes.forEach((child) => walk(child, inheritedClasses));
      return;
    }

    const ownClasses = Array.from(node.classList).filter((className) => className.startsWith('hljs-'));
    const nextClasses = ownClasses.length > 0
      ? Array.from(new Set([...inheritedClasses, ...ownClasses]))
      : inheritedClasses;
    node.childNodes.forEach((child) => walk(child, nextClasses));
  };

  template.content.childNodes.forEach((child) => walk(child, []));
  return offset === originalLength ? ranges : [];
}

function getMiaoyanCodeHighlightTarget(code: string): MiaoyanCodeHighlightTarget {
  const language = getMiaoyanCodeLanguage(code);
  if (!code.startsWith('```')) {
    return { code, offset: 0, language };
  }

  const firstLineEnd = code.search(/\r?\n/);
  if (firstLineEnd === -1) {
    return { code, offset: 0, language };
  }

  const firstLineBreak = code.match(/^.*?(\r?\n)/)?.[1] ?? '\n';
  const bodyStart = firstLineEnd + firstLineBreak.length;
  const closingFenceStart = code.lastIndexOf('\n```');
  const bodyEnd = closingFenceStart > bodyStart ? closingFenceStart : code.length;

  return {
    code: code.slice(bodyStart, bodyEnd),
    offset: bodyStart,
    language,
  };
}

function getMiaoyanCodeHighlightRanges(code: string) {
  if (code.length === 0 || code.length > MIAOYAN_CODE_BLOCK_HIGHLIGHT_LIMIT) {
    return [];
  }

  const target = getMiaoyanCodeHighlightTarget(code);
  if (target.code.length === 0) {
    return [];
  }

  const cacheKey = `${target.language ?? 'auto'}:${target.offset}\n${code}`;
  const cached = codeHighlightResultCache.get(cacheKey);
  if (cached) return cached;

  try {
    const highlighted = target.language
      ? hljs.highlight(target.code, { language: target.language, ignoreIllegals: true })
      : hljs.highlightAuto(target.code);
    const ranges = collectHighlightTokenRanges(highlighted.value, target.code.length)
      .map((range) => ({
        ...range,
        from: range.from + target.offset,
        to: range.to + target.offset,
      }));

    codeHighlightResultCache.set(cacheKey, ranges);
    if (codeHighlightResultCache.size > 80) {
      const firstKey = codeHighlightResultCache.keys().next().value;
      if (firstKey !== undefined) {
        codeHighlightResultCache.delete(firstKey);
      }
    }

    return ranges;
  } catch {
    return [];
  }
}

function addMiaoyanCodeHighlightDecorations(
  builder: RangeSetBuilder<Decoration>,
  view: EditorView,
  from: number,
  to: number,
) {
  const code = view.state.doc.sliceString(from, to);
  const tokenRanges = getMiaoyanCodeHighlightRanges(code);
  for (const tokenRange of tokenRanges) {
    if (tokenRange.from === tokenRange.to) continue;
    builder.add(
      from + tokenRange.from,
      from + tokenRange.to,
      getCodeHighlightDecoration(tokenRange.className),
    );
  }
}

function shouldHighlightCompatibilityCode(view: EditorView) {
  return COMPATIBILITY_CODE_HIGHLIGHT_THEMES.has(view.state.facet(contentThemeFacet));
}

function buildCompatibilityDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const enableCodeHighlight = shouldHighlightCompatibilityCode(view);
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        const name = node.name;
        // 整段标题（含 `#` 标记）= 紫
        if (/^ATXHeading[1-6]$/.test(name) || name === 'SetextHeading1' || name === 'SetextHeading2') {
          builder.add(node.from, node.to, compatibilityDecos.heading);
          return false;
        }
        // 列表标记 `-` `*` `1.` = 棕橄榄（不染色列表内容）
        if (name === 'ListMark') {
          builder.add(node.from, node.to, compatibilityDecos.listMark);
          return;
        }
        // 引用整段（含 `>` 标记和内容）= 棕橄榄
        if (name === 'Blockquote') {
          builder.add(node.from, node.to, compatibilityDecos.quote);
          return;
        }
        // 内联代码（含 `` ` ` `` 反引号）= 橙
        if (name === 'InlineCode') {
          builder.add(node.from, node.to, compatibilityDecos.codeInline);
          return false;
        }
        // 围栏代码块（含 ``` 围栏）= Menlo 等宽
        if (name === 'FencedCode' || name === 'CodeBlock') {
          builder.add(node.from, node.to, compatibilityDecos.fencedCode);
          if (enableCodeHighlight) {
            addMiaoyanCodeHighlightDecorations(builder, view, node.from, node.to);
          }
          return false;
        }
        // **加粗** 含标记 = 橙（不加粗）
        if (name === 'StrongEmphasis') {
          builder.add(node.from, node.to, compatibilityDecos.strong);
          return false;
        }
        // *斜体* 含标记 = 紫（不变斜）
        if (name === 'Emphasis') {
          builder.add(node.from, node.to, compatibilityDecos.emphasis);
          return false;
        }
        // ~~删除线~~ 含标记 = 橙（不画删除线）
        if (name === 'Strikethrough') {
          builder.add(node.from, node.to, compatibilityDecos.strike);
          return false;
        }
        // 链接 [text](url)：方括号文本染青绿，括号/URL 保持默认
        if (name === 'Link') {
          const cursor = node.node.cursor();
          let firstMarkEnd = -1;
          let secondMarkStart = -1;
          if (cursor.firstChild()) {
            do {
              if (cursor.name === 'LinkMark') {
                if (firstMarkEnd === -1) firstMarkEnd = cursor.to;
                else if (secondMarkStart === -1) { secondMarkStart = cursor.from; break; }
              }
            } while (cursor.nextSibling());
          }
          if (firstMarkEnd !== -1 && secondMarkStart !== -1 && firstMarkEnd < secondMarkStart) {
            builder.add(firstMarkEnd, secondMarkStart, compatibilityDecos.linkText);
          }
          return false;
        }
        // 图片 ![alt](url)：整体染青绿
        if (name === 'Image') {
          builder.add(node.from, node.to, compatibilityDecos.imageMark);
          return false;
        }
      },
    });
  }
  return builder.finish();
}

const compatibilityMarkdownPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildCompatibilityDecorations(view);
    }
    update(update: ViewUpdate) {
      const contentThemeChanged =
        update.startState.facet(contentThemeFacet) !== update.state.facet(contentThemeFacet);
      if (update.docChanged || update.viewportChanged || update.selectionSet || contentThemeChanged) {
        this.decorations = buildCompatibilityDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

const editorSelectionPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildEditorSelectionDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet) {
        this.decorations = buildEditorSelectionDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

function getCursorPosition(view: EditorView) {
  const pos = view.state.selection.main.head;
  const line = view.state.doc.lineAt(pos);
  return {
    line: line.number,
    column: pos - line.from + 1,
  };
}

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

function getEditorFormatResult(doc: string, from: number, to: number, format: EditorFormat) {
  if (format === 'quote') return getEditorQuoteFormatResult(doc, from, to);
  return getEditorInlineFormatResult(doc, from, to, format);
}

export const __editorPaneTesting = {
  getMiaoyanCodeLanguage,
  getMiaoyanCodeHighlightRanges,
  getEditorFormatResult,
  shouldHighlightCompatibilityCodeTheme: (theme: ContentTheme) => COMPATIBILITY_CODE_HIGHLIGHT_THEMES.has(theme),
  MIAOYAN_CODE_BLOCK_HIGHLIGHT_LIMIT,
};

export const EditorPane = forwardRef<EditorPaneHandle, EditorPaneProps>(
  function EditorPane(
    { content, onChange, onCursorChange, onScrollRatioChange, onTopLineChange, onScroll },
    ref,
  ) {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const onChangeRef = useRef(onChange);
    const onCursorChangeRef = useRef(onCursorChange);
    const onScrollRatioChangeRef = useRef(onScrollRatioChange);
    const onTopLineChangeRef = useRef(onTopLineChange);
    const onScrollRef = useRef(onScroll);
    const contentTheme = useSettingsStore((s) => s.contentTheme);
    const isEditorDark = useSettingsStore((s) => shouldUseDarkEditor(s.contentTheme, s.theme));
    const showLineNumbers = useSettingsStore((s) => s.showLineNumbers);
    const typewriterMode = useWorkspaceStore((s) => s.typewriterMode);
    const typewriterModeRef = useRef(typewriterMode);
    
    // 关键标记：用于拦截因同步内容触发的 onChange
    const isUpdatingFromPropsRef = useRef(false);

    const [editorContextMenu, setEditorContextMenu] = useState<{
      x: number;
      y: number;
      hasSelection: boolean;
    } | null>(null);

    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
      onCursorChangeRef.current = onCursorChange;
    }, [onCursorChange]);

    useEffect(() => {
      onScrollRatioChangeRef.current = onScrollRatioChange;
    }, [onScrollRatioChange]);

    useEffect(() => {
      onTopLineChangeRef.current = onTopLineChange;
    }, [onTopLineChange]);

    useEffect(() => {
      onScrollRef.current = onScroll;
    }, [onScroll]);

    useEffect(() => {
      typewriterModeRef.current = typewriterMode;
    }, [typewriterMode]);

    useImperativeHandle(ref, () => ({
      focus: () => {
        const view = viewRef.current;
        if (!view) return;
        view.requestMeasure();
        view.focus();
      },
      jumpToLine: (lineNumber: number) => {
        const view = viewRef.current;
        if (!view) return;

        const targetLine = Math.max(1, Math.min(lineNumber, view.state.doc.lines));
        const line = view.state.doc.line(targetLine);

        view.dispatch({
          selection: { anchor: line.from },
          effects: [
            EditorView.scrollIntoView(line.from, { y: 'center' }),
            addLineFlash.of(line.from)
          ],
        });

        // 2秒后清除闪烁样式
        setTimeout(() => {
          if (viewRef.current) {
            viewRef.current.dispatch({
              effects: removeLineFlash.of(line.from)
            });
          }
        }, 2000);

        view.focus();
      },
      setScrollRatio: (ratio: number) => {
        const view = viewRef.current;
        if (!view) return;
        const scroller = view.scrollDOM;
        const maxScroll = scroller.scrollHeight - scroller.clientHeight;
        const targetScroll = Math.max(0, ratio) * maxScroll;
        scroller.scrollTop = targetScroll;
      },
      scrollToLine: (lineNumber: number) => {
        const view = viewRef.current;
        if (!view) return;
        const targetLine = Math.max(1, Math.min(lineNumber, view.state.doc.lines));
        const line = view.state.doc.line(targetLine);
        // 使用 CodeMirror 自身的 scrollIntoView，正确处理视口虚拟化
        view.dispatch({
          effects: EditorView.scrollIntoView(line.from, { y: 'start' }),
        });
      },
      execSearch: (action, params) => {
        const view = viewRef.current;
        if (!view) return;

        ensureSearchHighlighterEnabled(view);

        view.dispatch({
          effects: setSearchQuery.of(new SearchQuery({
            search: params.query,
            caseSensitive: params.matchCase,
            regexp: params.regexp,
            wholeWord: params.wholeWord,
            replace: params.replaceWith
          }))
        });

        switch (action) {
          case 'input':
            if (params.query) {
              view.dispatch({ selection: { anchor: 0 } });
              findNext(view);
            }
            break;
          case 'next': findNext(view); break;
          case 'prev': findPrevious(view); break;
          case 'all': selectMatches(view); break;
          case 'replace': {
            const beforeDoc = view.state.doc.toString();
            const handled = replaceNext(view);
            if (handled && params.query && view.state.doc.toString() !== beforeDoc) {
              findNext(view);
            }
            break;
          }
          case 'replaceAll': replaceAll(view); break;
        }
      },
      restoreSearch: (params, currentMatch) => {
        const view = viewRef.current;
        if (!view) return;

        ensureSearchHighlighterEnabled(view);

        view.dispatch({
          selection: { anchor: 0 },
          effects: setSearchQuery.of(new SearchQuery({
            search: params.query,
            caseSensitive: params.matchCase,
            regexp: params.regexp,
            wholeWord: params.wholeWord,
            replace: params.replaceWith
          }))
        });

        if (!params.query || currentMatch <= 0) return;

        for (let index = 0; index < currentMatch; index += 1) {
          findNext(view);
        }
      },
      getSelectedText: () => {
        const view = viewRef.current;
        if (!view) return '';
        const selection = view.state.selection.main;
        if (selection.from === selection.to) return '';
        return view.state.doc.sliceString(selection.from, selection.to);
      },
    }));

    const handleFormat = useCallback(
      (format: EditorFormat) => {
        const view = viewRef.current;
        if (!view) return;

        const selection = view.state.selection.main;
        const result = getEditorFormatResult(
          view.state.doc.toString(),
          selection.from,
          selection.to,
          format,
        );

        view.dispatch({
          changes: {
            from: result.from,
            to: result.to,
            insert: result.insert,
          },
          selection: { anchor: result.selectionFrom, head: result.selectionTo },
        });

        view.focus();
      },
      [],
    );

    const getEditorContextMenuItems = useCallback((hasSelection: boolean): ContextMenuItem[] => [
      { label: '剪切', action: 'cut', shortcut: '⌘X', disabled: !hasSelection },
      { label: '复制', action: 'copy', shortcut: '⌘C', disabled: !hasSelection },
      { label: '粘贴', action: 'paste', shortcut: '⌘V' },
      { label: '粘贴并匹配样式', action: 'pastePlain', shortcut: '⇧⌘V' },
      { type: 'separator' },
      { label: '粗体', action: 'format:bold', shortcut: '⌘B' },
      { label: '斜体', action: 'format:italic', shortcut: '⌘I' },
      { label: '下划线', action: 'format:underline', shortcut: '⌘U' },
      { label: '删除线', action: 'format:strikethrough', shortcut: '⌥⇧5' },
      { type: 'separator' },
      {
        label: '复制为',
        children: [
          { label: '纯文本', action: 'copyPlain', disabled: !hasSelection },
          { label: 'Markdown', action: 'copyMd', disabled: !hasSelection },
          { label: 'HTML', action: 'copyHtml', disabled: !hasSelection },
        ],
      },
    ], []);

    const handleEditorContextMenuAction = useCallback(async (action: string) => {
      const view = viewRef.current;
      if (!view) return;

      if (action.startsWith('format:')) {
        handleFormat(action.slice('format:'.length) as EditorFormat);
        return;
      }

      const selection = view.state.selection.main;
      const selectedText = selection.from === selection.to
        ? ''
        : view.state.doc.sliceString(selection.from, selection.to);

      switch (action) {
        case 'cut':
          if (!selectedText) break;
          await navigator.clipboard.writeText(selectedText);
          view.dispatch({
            changes: { from: selection.from, to: selection.to, insert: '' },
            selection: { anchor: selection.from },
          });
          break;
        case 'copy':
          if (selectedText) await navigator.clipboard.writeText(selectedText);
          break;
        case 'copyPlain':
        case 'copyMd':
          if (selectedText) await navigator.clipboard.writeText(selectedText);
          break;
        case 'copyHtml':
          if (selectedText) await navigator.clipboard.writeText(markdownToHtml(selectedText));
          break;
        case 'paste':
        case 'pastePlain': {
          const text = await navigator.clipboard.readText();
          if (!text) break;
          view.dispatch({
            changes: { from: selection.from, to: selection.to, insert: text },
            selection: { anchor: selection.from + text.length },
          });
          break;
        }
      }

      view.focus();
    }, [handleFormat]);

    // 监听菜单格式化事件
    useEffect(() => {
      const onFormat = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (detail?.format) handleFormat(detail.format);
      };
      const onHeading = (e: Event) => {
        const view = viewRef.current;
        if (!view) return;
        const detail = (e as CustomEvent).detail;
        const level = parseInt(detail.level.replace('h', ''), 10);
        const prefix = '#'.repeat(level) + ' ';
        const cursor = view.state.selection.main.head;
        const line = view.state.doc.lineAt(cursor);
        const lineText = view.state.doc.sliceString(line.from, line.to);
        const stripped = lineText.replace(/^#{1,6}\s*/, '');
        view.dispatch({
          changes: { from: line.from, to: line.to, insert: prefix + stripped },
        });
        view.focus();
      };
      const onBlock = (e: Event) => {
        const view = viewRef.current;
        if (!view) return;
        const detail = (e as CustomEvent).detail;
        const fmt: string = detail.format;
        const cursor = view.state.selection.main.head;
        const line = view.state.doc.lineAt(cursor);
        const lineText = view.state.doc.sliceString(line.from, line.to);

        if (fmt === 'paragraph') {
          const stripped = lineText.replace(/^#{1,6}\s*/, '');
          view.dispatch({ changes: { from: line.from, to: line.to, insert: stripped } });
          view.focus();
          return;
        }

        if (fmt === 'increaseHeading') {
          const match = lineText.match(/^(#{1,6})\s/);
          if (match && match[1].length < 6) {
            view.dispatch({ changes: { from: line.from, to: line.to, insert: '#' + lineText } });
          } else if (!match) {
            view.dispatch({ changes: { from: line.from, insert: '# ' } });
          }
          view.focus();
          return;
        }

        if (fmt === 'decreaseHeading') {
          const match = lineText.match(/^(#{1,6})\s/);
          if (match && match[1].length > 1) {
            view.dispatch({ changes: { from: line.from, to: line.to, insert: lineText.slice(1) } });
          } else if (match && match[1].length === 1) {
            view.dispatch({ changes: { from: line.from, to: line.to, insert: lineText.replace(/^#\s*/, '') } });
          }
          view.focus();
          return;
        }

        if (fmt === 'insertAbove') {
          view.dispatch({ changes: { from: line.from, insert: '\n' } });
          view.dispatch({ selection: { anchor: line.from } });
          view.focus();
          return;
        }
        if (fmt === 'insertBelow') {
          view.dispatch({ changes: { from: line.to, insert: '\n' } });
          view.dispatch({ selection: { anchor: line.to + 1 } });
          view.focus();
          return;
        }

        const prefixMap: Record<string, string> = {
          quote: '> ',
          codeBlock: '```\n',
          orderedList: '1. ',
          unorderedList: '- ',
          taskList: '- [ ] ',
          hr: '\n---\n',
          mathBlock: '$$\n',
          toc: '[TOC]\n',
          yaml: '---\n',
          linkReference: '[text][ref]\n\n[ref]: url',
          footnote: '[^1]\n\n[^1]: ',
          comment: '<!-- ',
        };

        const suffixMap: Record<string, string> = {
          codeBlock: '\n```',
          mathBlock: '\n$$',
          yaml: '\n---',
          comment: ' -->',
        };

        const prefix = prefixMap[fmt] || '';
        const suffix = suffixMap[fmt] || '';
        view.dispatch({
          changes: { from: line.from, insert: prefix },
        });
        if (suffix) {
          const newLine = view.state.doc.lineAt(cursor + prefix.length);
          view.dispatch({
            changes: { from: newLine.to, insert: suffix },
          });
        }
        view.focus();
      };

      const onEditorCommand = (e: Event) => {
        const view = viewRef.current;
        if (!view) return;
        const { command } = (e as CustomEvent).detail;

        switch (command) {
          case 'undo':
            undo(view);
            break;
          case 'redo':
            redo(view);
            break;
          case 'cut':
            document.execCommand('cut');
            break;
          case 'copy':
          case 'copyMd':
          case 'copyPlain': {
            const sel = view.state.selection.main;
            const text = view.state.doc.sliceString(sel.from, sel.to);
            if (text) navigator.clipboard.writeText(text);
            break;
          }
          case 'copyHtml': {
            const sel2 = view.state.selection.main;
            const text2 = view.state.doc.sliceString(sel2.from, sel2.to);
            if (text2) navigator.clipboard.writeText(markdownToHtml(text2));
            break;
          }
          case 'selectAll':
            view.dispatch({ selection: { anchor: 0, head: view.state.doc.length } });
            break;
          case 'paste':
          case 'pastePlain':
            navigator.clipboard.readText().then(text => {
              view.dispatch({
                changes: { from: view.state.selection.main.from, to: view.state.selection.main.to, insert: text },
              });
            });
            break;
          case 'clearFormat': {
            const sel3 = view.state.selection.main;
            const raw = view.state.doc.sliceString(sel3.from, sel3.to);
            const cleaned = raw.replace(/[*_~`<>[\]()#]/g, '');
            view.dispatch({ changes: { from: sel3.from, to: sel3.to, insert: cleaned } });
            break;
          }
          case 'comment': {
            const sel4 = view.state.selection.main;
            const raw2 = view.state.doc.sliceString(sel4.from, sel4.to);
            view.dispatch({ changes: { from: sel4.from, to: sel4.to, insert: `<!-- ${raw2} -->` } });
            break;
          }
        }
      };

      window.addEventListener('prism-format', onFormat);
      window.addEventListener('prism-heading', onHeading);
      window.addEventListener('prism-block-format', onBlock);
      window.addEventListener('prism-editor-command', onEditorCommand);

      return () => {
        window.removeEventListener('prism-format', onFormat);
        window.removeEventListener('prism-heading', onHeading);
        window.removeEventListener('prism-block-format', onBlock);
        window.removeEventListener('prism-editor-command', onEditorCommand);
      };
    }, [handleFormat]);

    // 处理来自 Props 的内容同步（非重挂载情况）
    useEffect(() => {
      const view = viewRef.current;
      if (!view) {
        console.log('[EditorPane] content sync skipped: no view yet, incoming len:', content.length);
        return;
      }

      const currentContent = view.state.doc.toString();
      console.log('[EditorPane] content sync check currentLen:', currentContent.length, 'incomingLen:', content.length, 'same:', currentContent === content);
      if (currentContent !== content) {
        console.log('[EditorPane] dispatching content sync');
        isUpdatingFromPropsRef.current = true;
        view.dispatch({
          changes: { from: 0, to: currentContent.length, insert: content }
        });
        console.log('[EditorPane] after dispatch, editorLen:', view.state.doc.length, 'first200:', view.state.doc.sliceString(0, 200), '|| incomingFirst200:', content.slice(0, 200));
      }
    }, [content]);

    useEffect(() => {
      if (!editorRef.current) return;

      const startState = EditorState.create({
        doc: content,
        extensions: [
          Prec.highest(keymap.of([
            {
              key: 'Mod-f',
              run: () => {
                window.dispatchEvent(new CustomEvent('prism-search', { detail: { action: 'open' } }));
                return true;
              }
            },
            {
              key: 'Mod-h',
              run: () => {
                window.dispatchEvent(new CustomEvent('prism-search', { detail: { action: 'replace' } }));
                return true;
              }
            }
          ])),
          lineFlashField,
          editorLineNumbersCompartment.of(getLineNumberExtensions(showLineNumbers)),
          highlightSpecialChars(),
          history(),
          drawSelection(),
          dropCursor(),
          search({
            createPanel: createHiddenSearchPanel,
            scrollToMatch: (range) => EditorView.scrollIntoView(range, { y: 'center' }),
          }),
          EditorState.allowMultipleSelections.of(true),
          indentOnInput(),
          editorContentThemeCompartment.of(getContentThemeExtension(contentTheme)),
          compatibilityMarkdownPlugin,
          editorSelectionPlugin,
          bracketMatching(),
          closeBrackets(),
          rectangularSelection(),
          crosshairCursor(),
          highlightActiveLine(),
          foldGutter(),
          keymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...historyKeymap,
            ...foldKeymap,
            indentWithTab,
          ]),
          EditorView.lineWrapping,
          markdown(),
          editorDarkThemeCompartment.of(getDarkThemeExtensions(isEditorDark)),
          EditorView.theme({
            '&': { flex: 1, minHeight: 0, fontSize: '16px', fontFamily: 'inherit', backgroundColor: 'transparent' },
            '.cm-scroller': { overflow: 'auto', fontFamily: 'inherit', lineHeight: '1.7' },
            '.cm-content': { padding: '32px 48px', color: 'var(--text-primary)', maxWidth: '860px', margin: '0 auto' },
            '.cm-line-flash': { animation: 'cm-flash 2s cubic-bezier(0.16, 1, 0.3, 1)' },
            '.cm-gutters': { display: 'none' },
            '.cm-activeLineGutter': { backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' },
            '.cm-activeLine': { backgroundColor: 'var(--c-chalk, var(--bg-hover))' },
            '.cm-cursor': { borderLeftColor: 'var(--accent)', borderLeftWidth: '2px' },
            '&.cm-focused': { outline: 'none' },
            '.cm-selectionBackground': {
              backgroundColor: 'var(--editor-selection-bg, var(--accent-tint-strong)) !important',
              boxShadow: '0 0 0 1px var(--editor-selection-ring, transparent)',
              borderRadius: '2px',
            },
            '&.cm-focused .cm-selectionBackground': {
              backgroundColor: 'var(--editor-selection-bg, var(--accent-tint-strong)) !important',
            }
          }),
          EditorState.phrases.of({
            "Find": "查找内容", "Replace": "替换为", "next": "下一个", "previous": "上一个", "all": "全部",
            "match case": "大小写", "regexp": "正则", "by word": "全词", "replace": "替换", "replace all": "全部替换"
          }),
          EditorView.updateListener.of((update: ViewUpdate) => {
            if (update.docChanged) {
              if (isUpdatingFromPropsRef.current) {
                console.log('[EditorPane] updateListener: ignoring prop-driven docChanged');
                isUpdatingFromPropsRef.current = false;
              } else {
                console.log('[EditorPane] updateListener: forwarding onChange, len:', update.state.doc.length);
                onChangeRef.current(update.state.doc.toString());
              }
            }
            if (update.docChanged || update.selectionSet) {
              onCursorChangeRef.current?.(getCursorPosition(update.view));
              if (typewriterModeRef.current && update.selectionSet) {
                update.view.dispatch({ effects: EditorView.scrollIntoView(update.state.selection.main.head, { y: 'center' }) });
              }
            }
          }),
        ],
      });

      const view = new EditorView({
        state: startState,
        parent: editorRef.current,
      });

      viewRef.current = view;

      const handleContextMenu = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
        const selection = view.state.selection.main;
        const rightClickedInsideSelection =
          pos !== null &&
          selection.from !== selection.to &&
          pos >= selection.from &&
          pos <= selection.to;

        if (pos !== null && !rightClickedInsideSelection) {
          view.dispatch({ selection: { anchor: pos } });
        }

        const nextSelection = view.state.selection.main;
        setEditorContextMenu({
          x: event.clientX,
          y: event.clientY,
          hasSelection: nextSelection.from !== nextSelection.to,
        });
      };

      view.dom.addEventListener('contextmenu', handleContextMenu);
      const handleScroll = () => {
        const scroller = view.scrollDOM;
        const maxScroll = scroller.scrollHeight - scroller.clientHeight;
        onScrollRatioChangeRef.current?.(maxScroll > 0 ? scroller.scrollTop / maxScroll : 0);
        onScrollRef.current?.();

        if (onTopLineChangeRef.current) {
          const rect = scroller.getBoundingClientRect();
          const pos = view.posAtCoords({ x: rect.left + 10, y: rect.top + 4 }, false);
          let topLine = 1;
          if (pos !== null) {
            topLine = view.state.doc.lineAt(pos).number;
          } else {
            const block = view.elementAtHeight(scroller.scrollTop + view.documentTop);
            topLine = view.state.doc.lineAt(block.from).number;
          }
          onTopLineChangeRef.current(topLine);
        }
      };
      view.scrollDOM.addEventListener('scroll', handleScroll);

      return () => {
        view.dom.removeEventListener('contextmenu', handleContextMenu);
        view.scrollDOM.removeEventListener('scroll', handleScroll);
        view.destroy();
        viewRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: editorDarkThemeCompartment.reconfigure(getDarkThemeExtensions(isEditorDark)),
      });
    }, [isEditorDark]);

    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: editorContentThemeCompartment.reconfigure(getContentThemeExtension(contentTheme)),
      });
    }, [contentTheme]);

    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: editorLineNumbersCompartment.reconfigure(getLineNumberExtensions(showLineNumbers)),
      });
    }, [showLineNumbers]);

    return (
      <>
        <div
          ref={editorRef}
          style={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        />
        {editorContextMenu && (
          <ContextMenu
            x={editorContextMenu.x}
            y={editorContextMenu.y}
            items={getEditorContextMenuItems(editorContextMenu.hasSelection)}
            onAction={handleEditorContextMenuAction}
            onClose={() => setEditorContextMenu(null)}
          />
        )}
      </>
    );
  },
);
