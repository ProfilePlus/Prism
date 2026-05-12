import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { EditorPane, EditorPaneHandle } from './EditorPane';
import { PreviewPane } from './PreviewPane';
import { SearchPanel, SearchParams } from './SearchPanel';

interface SplitViewProps {
  content: string;
  viewMode: 'edit' | 'split' | 'preview';
  onChange: (content: string) => void;
  onCursorChange?: (cursor: { line: number; column: number }) => void;
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

export const SplitView = forwardRef<EditorPaneHandle, SplitViewProps>(
  function SplitView({ content, viewMode, onChange, onCursorChange }, ref) {
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<EditorPaneHandle>(null);
    const [searchVisible, setSearchVisible] = useState(false);
    // 同步方向锁：防止反馈循环
    const syncingRef = useRef<'editor' | 'preview' | null>(null);
    const syncingTimerRef = useRef<number | null>(null);

    useImperativeHandle(ref, () => ({
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
    }));

    useEffect(() => {
      const handleGlobalKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
          e.preventDefault();
          e.stopPropagation();
          setSearchVisible(true);
        }
      };
      const handlePrismSearch = () => setSearchVisible(true);
      window.addEventListener('keydown', handleGlobalKeyDown, true);
      window.addEventListener('prism-search', handlePrismSearch);
      return () => {
        window.removeEventListener('keydown', handleGlobalKeyDown, true);
        window.removeEventListener('prism-search', handlePrismSearch);
      };
    }, []);

    const handleSearch = (action: 'next' | 'prev' | 'all' | 'replace' | 'replaceAll', params: SearchParams) => {
      if (viewMode === 'preview') {
        if (action === 'next' || action === 'prev') {
          const backwards = action === 'prev';
          (window as any).find(params.query, params.matchCase, backwards, true, params.wholeWord, false, false);
        }
      } else {
        editorRef.current?.execSearch?.(action, params);
      }
    };

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

    return (
      <div style={{ display: 'flex', flex: 1, minHeight: 0, minWidth: 0, backgroundColor: 'transparent', position: 'relative' }}>
        {viewMode === 'edit' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--bg-editor)' }}>
            <EditorPane
              ref={editorRef}
              content={content}
              onChange={onChange}
              onCursorChange={onCursorChange}
            />
          </div>
        )}

        {viewMode === 'preview' && (
          <div
            ref={previewContainerRef}
            onScroll={handlePreviewScroll}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', background: 'var(--bg-preview)' }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <PreviewPane content={content} />
            </div>
          </div>
        )}

        {viewMode === 'split' && (
          <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--border-color)', background: 'var(--bg-editor)' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <EditorPane
                  ref={editorRef}
                  content={content}
                  onChange={onChange}
                  onCursorChange={onCursorChange}
                  onTopLineChange={syncPreviewByEditor}
                />
              </div>
            </div>
            <div
              ref={previewContainerRef}
              onScroll={handlePreviewScroll}
              style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'auto', background: 'var(--bg-preview)' }}
            >
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <PreviewPane content={content} />
              </div>
            </div>
          </div>
        )}

        <SearchPanel
          visible={searchVisible}
          viewMode={viewMode}
          onClose={() => setSearchVisible(false)}
          onSearch={handleSearch}
        />
      </div>
    );
  },
);
