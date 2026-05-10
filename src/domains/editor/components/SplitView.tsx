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
    const isProgrammaticScrollRef = useRef(false);
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

    const syncPreview = (ratio: number) => {
      const preview = previewContainerRef.current;
      if (!preview) return;
      const maxScroll = preview.scrollHeight - preview.clientHeight;
      const targetScroll = ratio * maxScroll;
      if (Math.abs(preview.scrollTop - targetScroll) > 1) {
        isProgrammaticScrollRef.current = true;
        preview.scrollTop = targetScroll;
      }
    };

    const handlePreviewScroll = () => {
      if (isProgrammaticScrollRef.current) {
        isProgrammaticScrollRef.current = false;
        return;
      }
      const preview = previewContainerRef.current;
      if (!preview) return;
      const maxScroll = preview.scrollHeight - preview.clientHeight;
      const ratio = maxScroll > 0 ? preview.scrollTop / maxScroll : 0;
      if (editorRef.current) {
        editorRef.current.setScrollRatio(ratio);
      }
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
                onScrollRatioChange={syncPreview}
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
