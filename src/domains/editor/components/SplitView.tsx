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

export const SplitView = forwardRef<EditorPaneHandle, SplitViewProps>(
  function SplitView({ content, viewMode, onChange, onCursorChange }, ref) {
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<EditorPaneHandle>(null);
    const lastSyncAtRef = useRef(0);
    const [searchVisible, setSearchVisible] = useState(false);

    useImperativeHandle(ref, () => ({
      jumpToLine: (line) => {
        // 编辑器跳转
        editorRef.current?.jumpToLine(line);

        // 预览跳转与闪烁
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
        // 全局捕获 Ctrl+F，彻底拦截默认行为
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
          e.preventDefault();
          e.stopPropagation();
          setSearchVisible(true);
        }
      };

      const handlePrismSearch = () => {
        setSearchVisible(true);
      };

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

    // 预览的锚点 → 编辑器行号：按源码行号索引
    const collectPreviewAnchors = () => {
      const preview = previewContainerRef.current;
      if (!preview) return [];
      const nodes = preview.querySelectorAll<HTMLElement>('[data-line]');
      const anchors: Array<{ line: number; top: number }> = [];
      const previewTop = preview.getBoundingClientRect().top;
      nodes.forEach((el) => {
        const raw = el.getAttribute('data-line');
        const line = raw ? Number(raw) : NaN;
        if (!Number.isFinite(line)) return;
        const top = el.getBoundingClientRect().top - previewTop + preview.scrollTop;
        anchors.push({ line, top });
      });
      anchors.sort((a, b) => a.line - b.line);
      return anchors;
    };

    // 反向：从预览 scrollTop → 源码行号
    const previewScrollToLine = (scrollTop: number, anchors: Array<{ line: number; top: number }>): number => {
      if (anchors.length === 0) return 1;
      if (scrollTop <= anchors[0].top) return anchors[0].line;
      for (let i = 0; i < anchors.length - 1; i++) {
        const a = anchors[i];
        const b = anchors[i + 1];
        if (scrollTop >= a.top && scrollTop <= b.top) {
          const ratio = b.top === a.top ? 0 : (scrollTop - a.top) / (b.top - a.top);
          return a.line + (b.line - a.line) * ratio;
        }
      }
      return anchors[anchors.length - 1].line;
    };

    // 正向：源码行号 → 预览 scrollTop
    const lineToPreviewScrollTop = (line: number, anchors: Array<{ line: number; top: number }>): number | null => {
      if (anchors.length === 0) return null;
      if (line <= anchors[0].line) return anchors[0].top;
      for (let i = 0; i < anchors.length - 1; i++) {
        const a = anchors[i];
        const b = anchors[i + 1];
        if (line >= a.line && line <= b.line) {
          const ratio = b.line === a.line ? 0 : (line - a.line) / (b.line - a.line);
          return a.top + (b.top - a.top) * ratio;
        }
      }
      return anchors[anchors.length - 1].top;
    };

    const previewAnimRef = useRef<{ raf: number | null; target: number }>({ raf: null, target: 0 });

    const smoothScrollPreview = (target: number) => {
      const preview = previewContainerRef.current;
      if (!preview) return;
      previewAnimRef.current.target = target;
      if (previewAnimRef.current.raf !== null) return;
      const step = () => {
        const preview = previewContainerRef.current;
        if (!preview) { previewAnimRef.current.raf = null; return; }
        const goal = previewAnimRef.current.target;
        const current = preview.scrollTop;
        const delta = goal - current;
        lastSyncAtRef.current = Date.now();
        if (Math.abs(delta) < 0.5) {
          preview.scrollTop = goal;
          previewAnimRef.current.raf = null;
          return;
        }
        preview.scrollTop = current + delta * 0.22;
        previewAnimRef.current.raf = requestAnimationFrame(step);
      };
      previewAnimRef.current.raf = requestAnimationFrame(step);
    };

    const syncPreviewByLine = (line: number) => {
      const preview = previewContainerRef.current;
      if (!preview) return;
      const anchors = collectPreviewAnchors();
      const targetScroll = lineToPreviewScrollTop(line, anchors);
      if (targetScroll === null) return;
      if (Math.abs(preview.scrollTop - targetScroll) > 1) {
        smoothScrollPreview(targetScroll);
      }
    };

    const handlePreviewScroll = () => {
      // 编辑器驱动预览期间，忽略预览的回传
      if (Date.now() - lastSyncAtRef.current < 160) return;
      const preview = previewContainerRef.current;
      if (!preview) return;
      const anchors = collectPreviewAnchors();
      const line = previewScrollToLine(preview.scrollTop, anchors);
      editorRef.current?.scrollToLine?.(Math.round(line));
    };

    // 核心渲染逻辑：根据 viewMode 返回不同的主体内容
    const renderBody = () => {
      if (viewMode === 'edit') {
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--bg-editor)' }}>
            <EditorPane
              ref={editorRef}
              content={content}
              onChange={onChange}
              onCursorChange={onCursorChange}
            />
          </div>
        );
      }

      if (viewMode === 'preview') {
        return (
          <div
            ref={previewContainerRef}
            onScroll={handlePreviewScroll}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', background: 'var(--bg-preview)' }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <PreviewPane content={content} />
            </div>
          </div>
        );
      }

      // 分栏模式
      return (
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              borderRight: '1px solid var(--border-color)',
              background: 'var(--bg-editor)',
            }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <EditorPane
                ref={editorRef}
                content={content}
                onChange={onChange}
                onCursorChange={onCursorChange}
                onTopLineChange={syncPreviewByLine}
              />
            </div>
          </div>
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
        </div>
      );
    };

    return (
      <div style={{ display: 'flex', flex: 1, minHeight: 0, minWidth: 0, backgroundColor: 'transparent', position: 'relative' }}>
        {renderBody()}
        {/* 全局唯一的 SearchPanel 实例 */}
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
