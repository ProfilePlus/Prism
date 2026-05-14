import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { EditorPane, EditorPaneHandle } from './EditorPane';
import { PreviewPane } from './PreviewPane';
import { buildSearchPattern, countMatches, SearchAction, SearchMode, SearchPanel, SearchParams } from './SearchPanel';

interface SplitViewProps {
  content: string;
  viewMode: 'edit' | 'split' | 'preview';
  onChange: (content: string) => void;
  onCursorChange?: (cursor: { line: number; column: number }) => void;
}

const DEFAULT_SEARCH_PARAMS: SearchParams = {
  query: '',
  replaceWith: '',
  matchCase: false,
  regexp: false,
  wholeWord: false,
};

function normalizeSelectionSeed(text: string) {
  const seed = text.replace(/\u00a0/g, ' ');
  return seed.trim().length > 0 ? seed : '';
}

// 借鉴 VSCode markdown preview scroll-sync 算法
// 参考：https://github.com/microsoft/vscode/blob/main/extensions/markdown-language-features/preview-src/scroll-sync.ts

interface CodeLineElement {
  element: HTMLElement;
  line: number;
  endLine?: number;
}

function collectCodeLineElements(preview: HTMLElement): CodeLineElement[] {
  const elements: CodeLineElement[] = [];
  const nodes = preview.querySelectorAll<HTMLElement>('[data-line]');
  nodes.forEach((el) => {
    const raw = el.getAttribute('data-line');
    const line = raw ? Number(raw) : NaN;
    if (!Number.isFinite(line)) return;

    // 代码块特殊处理：计算 endLine
    if (el.tagName === 'PRE') {
      const codeEl = el.querySelector('code');
      if (codeEl) {
        const text = codeEl.textContent || '';
        const lineCount = (text.match(/\n/g) || []).length + 1;
        elements.push({ element: el, line, endLine: line + lineCount - 1 });
        return;
      }
    }
    // 列表容器跳过（子元素会被单独处理）
    if (el.tagName === 'UL' || el.tagName === 'OL') return;

    elements.push({ element: el, line });
  });
  elements.sort((a, b) => a.line - b.line);
  return elements;
}

function getElementTop(element: HTMLElement, preview: HTMLElement): number {
  return element.getBoundingClientRect().top - preview.getBoundingClientRect().top + preview.scrollTop;
}

// 源码行号 → 预览 scrollTop
function lineToPreviewScrollTop(line: number, elements: CodeLineElement[], preview: HTMLElement): number | null {
  if (elements.length === 0) return null;
  if (line <= elements[0].line) return 0;

  // 找到包含这一行的元素
  let previous: CodeLineElement | null = null;
  let next: CodeLineElement | null = null;
  for (const entry of elements) {
    if (entry.line === line) {
      previous = entry;
      break;
    } else if (entry.line > line) {
      next = entry;
      break;
    }
    previous = entry;
  }
  if (!previous) return null;

  const previousTop = getElementTop(previous.element, preview);
  const previousHeight = previous.element.offsetHeight;

  // 代码块内部：按行号比例映射
  if (previous.endLine && previous.endLine > previous.line && line < previous.endLine) {
    const progress = (line - previous.line) / (previous.endLine - previous.line);
    return previousTop + previousHeight * progress;
  }

  // 代码块之后但在下一个元素之前
  if (previous.endLine && next && next.line !== previous.line) {
    const progress = (line - previous.endLine) / (next.line - previous.endLine);
    const nextTop = getElementTop(next.element, preview);
    return (previousTop + previousHeight) + progress * (nextTop - (previousTop + previousHeight));
  }

  // 普通：两个元素之间按比例
  if (next && next.line !== previous.line) {
    const progress = (line - previous.line) / (next.line - previous.line);
    const nextTop = getElementTop(next.element, preview);
    return (previousTop + previousHeight) + progress * (nextTop - (previousTop + previousHeight));
  }

  return previousTop;
}

// 预览 scrollTop → 源码行号（二分查找）
function pageOffsetToLine(scrollTop: number, elements: CodeLineElement[], preview: HTMLElement): number | null {
  if (elements.length === 0) return null;

  // 过滤可见元素
  const visible = elements.filter((e) => {
    const style = window.getComputedStyle(e.element);
    return style.display !== 'none' && style.visibility !== 'hidden' && e.element.offsetHeight > 0;
  });
  if (visible.length === 0) return null;

  // 二分查找：scrollTop 落在哪个元素里
  let lo = -1;
  let hi = visible.length - 1;
  while (lo + 1 < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const top = getElementTop(visible[mid].element, preview);
    const height = visible[mid].element.offsetHeight;
    if (top + height >= scrollTop) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  const previous = lo >= 0 ? visible[lo] : visible[0];
  const next = hi < visible.length ? visible[hi] : undefined;

  const previousTop = getElementTop(previous.element, preview);
  const previousHeight = previous.element.offsetHeight;
  const offsetFromPrevious = scrollTop - previousTop;

  // 代码块内部：按高度比例映射回行号
  if (previous.endLine && previous.endLine > previous.line) {
    if (offsetFromPrevious >= 0 && offsetFromPrevious <= previousHeight) {
      const progress = offsetFromPrevious / previousHeight;
      return previous.line + progress * (previous.endLine - previous.line);
    }
  }

  if (next) {
    const nextTop = getElementTop(next.element, preview);
    const progress = offsetFromPrevious / (nextTop - previousTop);
    const startLine = previous.endLine ?? previous.line;
    return startLine + progress * (next.line - startLine);
  }

  return previous.line;
}

function clearPreviewSearchMarks(preview: HTMLElement) {
  const marks = Array.from(preview.querySelectorAll<HTMLElement>('.preview-search-match'));
  for (const mark of marks) {
    const parent = mark.parentNode;
    if (!parent) continue;
    parent.replaceChild(document.createTextNode(mark.textContent ?? ''), mark);
    parent.normalize();
  }
}

function isSearchablePreviewTextNode(node: Node) {
  const parent = node.parentElement;
  if (!parent) return false;
  if (!node.textContent) return false;
  return !parent.closest('.preview-search-match, script, style, noscript, textarea, input, select, button, svg');
}

function applyPreviewSearch(
  preview: HTMLElement | null,
  params: SearchParams,
  currentMatch: number,
) {
  if (!preview) return { count: 0, current: 0 };

  clearPreviewSearchMarks(preview);

  const write = preview.querySelector<HTMLElement>('#write');
  if (!write || !params.query) return { count: 0, current: 0 };

  const pattern = buildSearchPattern(params.query, params.matchCase, params.regexp, params.wholeWord);
  if (!pattern || pattern === 'invalid') return { count: 0, current: 0 };

  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(write, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => (
      isSearchablePreviewTextNode(node)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT
    ),
  });

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }

  const occurrences: Array<{ node: Text; from: number; to: number }> = [];
  for (const node of textNodes) {
    const text = node.data;
    pattern.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      if (match[0].length === 0) {
        pattern.lastIndex += 1;
        continue;
      }

      occurrences.push({
        node,
        from: match.index,
        to: match.index + match[0].length,
      });
    }
  }

  const count = occurrences.length;
  if (count === 0) return { count: 0, current: 0 };

  const normalizedCurrent = Math.min(Math.max(currentMatch || 1, 1), count);
  const occurrencesByNode = new Map<Text, Array<{ from: number; to: number; index: number }>>();

  occurrences.forEach((occurrence, index) => {
    const entries = occurrencesByNode.get(occurrence.node) ?? [];
    entries.push({ ...occurrence, index: index + 1 });
    occurrencesByNode.set(occurrence.node, entries);
  });

  let currentElement: HTMLElement | null = null;
  for (const [node, entries] of occurrencesByNode) {
    const fragment = document.createDocumentFragment();
    let cursor = 0;

    for (const entry of entries) {
      if (entry.from > cursor) {
        fragment.appendChild(document.createTextNode(node.data.slice(cursor, entry.from)));
      }

      const mark = document.createElement('span');
      mark.className = entry.index === normalizedCurrent
        ? 'preview-search-match preview-search-match--current'
        : 'preview-search-match';
      mark.textContent = node.data.slice(entry.from, entry.to);
      fragment.appendChild(mark);

      if (entry.index === normalizedCurrent) {
        currentElement = mark;
      }

      cursor = entry.to;
    }

    if (cursor < node.data.length) {
      fragment.appendChild(document.createTextNode(node.data.slice(cursor)));
    }

    node.replaceWith(fragment);
  }

  currentElement?.scrollIntoView({ block: 'center', inline: 'nearest' });

  return { count, current: normalizedCurrent };
}

export const SplitView = forwardRef<EditorPaneHandle, SplitViewProps>(
  function SplitView({ content, viewMode, onChange, onCursorChange }, ref) {
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<EditorPaneHandle>(null);
    const [searchVisible, setSearchVisible] = useState(false);
    const [searchMode, setSearchMode] = useState<SearchMode>('find');
    const [searchParams, setSearchParams] = useState<SearchParams>(DEFAULT_SEARCH_PARAMS);
    const [searchMatchCount, setSearchMatchCount] = useState(0);
    const [searchCurrentMatch, setSearchCurrentMatch] = useState(0);
    const [searchActivationKey, setSearchActivationKey] = useState(0);
    const searchParamsRef = useRef(searchParams);
    const searchCurrentMatchRef = useRef(searchCurrentMatch);
    const contentRef = useRef(content);
    const viewModeRef = useRef(viewMode);
    // 同步方向锁：防止反馈循环
    const syncingRef = useRef<'editor' | 'preview' | null>(null);
    const syncingTimerRef = useRef<number | null>(null);

    useEffect(() => {
      searchParamsRef.current = searchParams;
    }, [searchParams]);

    useEffect(() => {
      searchCurrentMatchRef.current = searchCurrentMatch;
    }, [searchCurrentMatch]);

    useEffect(() => {
      contentRef.current = content;
    }, [content]);

    useEffect(() => {
      viewModeRef.current = viewMode;
    }, [viewMode]);

    useImperativeHandle(ref, () => ({
      focus: () => editorRef.current?.focus(),
      jumpToLine: (line) => {
        editorRef.current?.jumpToLine(line);
        const preview = previewContainerRef.current;
        if (preview) {
          const target = preview.querySelector(`[data-line="${line}"]`);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.classList.add('preview-line-flash');
            setTimeout(() => {
              target.classList.remove('preview-line-flash');
            }, 2000);
          }
        }
      },
      setScrollRatio: (ratio) => editorRef.current?.setScrollRatio(ratio),
      scrollToLine: (line) => editorRef.current?.scrollToLine(line),
      execSearch: (action, params) => editorRef.current?.execSearch?.(action, params),
      restoreSearch: (params, currentMatch) => editorRef.current?.restoreSearch?.(params, currentMatch),
      getSelectedText: () => editorRef.current?.getSelectedText?.() ?? '',
    }));

    useEffect(() => {
      if (viewMode === 'preview') return;
      const frame = requestAnimationFrame(() => {
        editorRef.current?.focus();
      });
      return () => cancelAnimationFrame(frame);
    }, [viewMode]);

    const getPreviewSelectedText = useCallback(() => {
      const selection = window.getSelection();
      const preview = previewContainerRef.current?.querySelector<HTMLElement>('#write');
      if (!selection || selection.isCollapsed || !preview || !selection.anchorNode) return '';
      if (!preview.contains(selection.anchorNode)) return '';
      return normalizeSelectionSeed(selection.toString());
    }, []);

    const getSearchSeed = useCallback(() => {
      if (viewModeRef.current !== 'preview') {
        const editorSeed = normalizeSelectionSeed(editorRef.current?.getSelectedText?.() ?? '');
        if (editorSeed) return editorSeed;
      }

      return getPreviewSelectedText();
    }, [getPreviewSelectedText]);

    const activateSearch = useCallback((mode: SearchMode) => {
      const seed = getSearchSeed();
      setSearchMode(mode);
      setSearchVisible(true);
      setSearchActivationKey((key) => key + 1);

      if (!seed) return;

      const params = {
        ...searchParamsRef.current,
        query: seed,
      };
      const localMatchState = countMatches(
        contentRef.current,
        params.query,
        params.matchCase,
        params.regexp,
        params.wholeWord,
      );
      const count = localMatchState.invalid ? 0 : localMatchState.count;
      const nextCurrent = count > 0 ? 1 : 0;

      setSearchParams(params);
      setSearchMatchCount(count);
      setSearchCurrentMatch(nextCurrent);
      searchParamsRef.current = params;
      searchCurrentMatchRef.current = nextCurrent;

      if (viewModeRef.current !== 'preview') {
        editorRef.current?.execSearch?.('input', params);
      }

      if (viewModeRef.current !== 'edit') {
        applyPreviewSearch(previewContainerRef.current, params, nextCurrent);
      }
    }, [getSearchSeed]);

    useEffect(() => {
      const handleGlobalKeyDown = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        if ((e.ctrlKey || e.metaKey) && key === 'f') {
          e.preventDefault();
          e.stopPropagation();
          activateSearch('find');
        }
        if ((e.ctrlKey || e.metaKey) && key === 'h') {
          e.preventDefault();
          e.stopPropagation();
          activateSearch('replace');
        }
      };
      const handlePrismSearch = (event: Event) => {
        const detail = (event as CustomEvent<{ action?: string }>).detail;
        activateSearch(detail?.action === 'replace' ? 'replace' : 'find');
      };
      window.addEventListener('keydown', handleGlobalKeyDown, true);
      window.addEventListener('prism-search', handlePrismSearch);
      return () => {
        window.removeEventListener('keydown', handleGlobalKeyDown, true);
        window.removeEventListener('prism-search', handlePrismSearch);
      };
    }, [activateSearch]);

    const handleSearch = (action: SearchAction, params: SearchParams) => {
      const localMatchState = countMatches(content, params.query, params.matchCase, params.regexp, params.wholeWord);
      const count = localMatchState.invalid ? 0 : localMatchState.count;
      const previousCurrent = searchCurrentMatchRef.current;
      let nextCurrent = previousCurrent;

      if (!params.query || count === 0) {
        nextCurrent = 0;
      } else if (action === 'input') {
        nextCurrent = 1;
      } else if (action === 'next') {
        nextCurrent = previousCurrent >= count ? 1 : previousCurrent + 1;
      } else if (action === 'prev') {
        nextCurrent = previousCurrent <= 1 ? count : previousCurrent - 1;
      } else if (action === 'replace') {
        nextCurrent = previousCurrent >= count ? 1 : Math.max(previousCurrent, 1);
      } else if (action === 'replaceAll') {
        nextCurrent = 0;
      } else if (previousCurrent <= 0 || previousCurrent > count) {
        nextCurrent = 1;
      }

      setSearchParams(params);
      setSearchMatchCount(count);
      setSearchCurrentMatch(nextCurrent);
      searchParamsRef.current = params;
      searchCurrentMatchRef.current = nextCurrent;

      if (viewMode !== 'preview') {
        editorRef.current?.execSearch?.(action, params);
      }

      if (viewMode !== 'edit') {
        applyPreviewSearch(previewContainerRef.current, params, nextCurrent);
      }
    };

    useEffect(() => {
      const params = searchParamsRef.current;
      if (!params.query) {
        setSearchMatchCount(0);
        setSearchCurrentMatch(0);
        searchCurrentMatchRef.current = 0;
        return;
      }

      const localMatchState = countMatches(content, params.query, params.matchCase, params.regexp, params.wholeWord);
      const count = localMatchState.invalid ? 0 : localMatchState.count;
      const nextCurrent = count === 0
        ? 0
        : Math.min(Math.max(searchCurrentMatchRef.current || 1, 1), count);

      setSearchMatchCount(count);
      setSearchCurrentMatch(nextCurrent);
      searchCurrentMatchRef.current = nextCurrent;
    }, [content]);

    useEffect(() => {
      if (!searchVisible || !searchParams.query) return;

      const frame = requestAnimationFrame(() => {
        const params = searchParamsRef.current;
        const current = searchCurrentMatchRef.current;

        if (viewMode !== 'preview') {
          editorRef.current?.restoreSearch?.(params, current);
        }

        if (viewMode !== 'edit') {
          applyPreviewSearch(previewContainerRef.current, params, current);
        }
      });

      return () => cancelAnimationFrame(frame);
    }, [viewMode, content, searchVisible, searchParams.query]);

    // 设置同步锁，100ms 后自动释放
    const markSyncing = (direction: 'editor' | 'preview') => {
      syncingRef.current = direction;
      if (syncingTimerRef.current !== null) {
        clearTimeout(syncingTimerRef.current);
      }
      syncingTimerRef.current = window.setTimeout(() => {
        syncingRef.current = null;
        syncingTimerRef.current = null;
      }, 100);
    };

    // 编辑器 → 预览
    const syncPreviewByEditor = (topLine: number) => {
      if (syncingRef.current === 'preview') return; // 预览正在驱动编辑器，忽略
      const preview = previewContainerRef.current;
      if (!preview) return;
      const elements = collectCodeLineElements(preview);
      const targetScroll = lineToPreviewScrollTop(topLine, elements, preview);
      if (targetScroll === null) return;
      if (Math.abs(preview.scrollTop - targetScroll) < 1) return;
      markSyncing('editor');
      preview.scrollTop = Math.max(0, targetScroll);
    };

    // 预览 → 编辑器
    const handlePreviewScroll = () => {
      if (syncingRef.current === 'editor') return; // 编辑器正在驱动预览，忽略
      const preview = previewContainerRef.current;
      if (!preview) return;
      const elements = collectCodeLineElements(preview);
      const line = pageOffsetToLine(preview.scrollTop, elements, preview);
      if (line === null) return;
      markSyncing('preview');
      editorRef.current?.scrollToLine?.(Math.round(line));
    };

    const isPreviewOnly = viewMode === 'preview';
    const showPreview = viewMode !== 'edit';
    const isSplit = viewMode === 'split';

    return (
      <div style={{ display: 'flex', flex: 1, minHeight: 0, minWidth: 0, backgroundColor: 'transparent', position: 'relative' }}>
        <div
          aria-hidden={isPreviewOnly}
          style={{
            flex: isSplit ? 1 : '1 1 auto',
            minWidth: 0,
            display: isPreviewOnly ? 'none' : 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRight: isSplit ? '1px solid var(--border-color)' : '0',
            background: 'var(--bg-editor)',
          }}
        >
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <EditorPane
              ref={editorRef}
              content={content}
              onChange={onChange}
              onCursorChange={onCursorChange}
              onTopLineChange={isSplit ? syncPreviewByEditor : undefined}
            />
          </div>
        </div>

        {showPreview && (
          <div
            ref={previewContainerRef}
            onScroll={handlePreviewScroll}
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'auto',
              background: 'var(--bg-preview)',
            }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <PreviewPane content={content} />
            </div>
          </div>
        )}

        <SearchPanel
          visible={searchVisible}
          viewMode={viewMode}
          content={content}
          mode={searchMode}
          initialQuery={searchParams.query}
          initialReplaceWith={searchParams.replaceWith}
          matchCount={searchMatchCount}
          currentMatch={searchCurrentMatch}
          activationKey={searchActivationKey}
          onClose={() => setSearchVisible(false)}
          onSearch={handleSearch}
          onModeChange={setSearchMode}
        />
      </div>
    );
  },
);
