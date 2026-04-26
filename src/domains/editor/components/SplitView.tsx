import { forwardRef, useRef } from 'react';
import { EditorPane, EditorPaneHandle } from './EditorPane';
import { PreviewPane } from './PreviewPane';

interface SplitViewProps {
  content: string;
  viewMode: 'edit' | 'split' | 'preview';
  onChange: (content: string) => void;
  onCursorChange?: (cursor: { line: number; column: number }) => void;
}

export const SplitView = forwardRef<EditorPaneHandle, SplitViewProps>(
  function SplitView({ content, viewMode, onChange, onCursorChange }, ref) {
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const syncingRef = useRef(false);

    const syncPreview = (ratio: number) => {
      const preview = previewContainerRef.current;
      if (!preview || syncingRef.current) return;
      syncingRef.current = true;
      const maxScroll = preview.scrollHeight - preview.clientHeight;
      preview.scrollTop = ratio * maxScroll;
      requestAnimationFrame(() => {
        syncingRef.current = false;
      });
    };

    const handlePreviewScroll = () => {
      const preview = previewContainerRef.current;
      if (!preview || syncingRef.current) return;
      syncingRef.current = true;
      const maxScroll = preview.scrollHeight - preview.clientHeight;
      const ratio = maxScroll > 0 ? preview.scrollTop / maxScroll : 0;
      if (ref && typeof ref !== 'function') {
        ref.current?.setScrollRatio(ratio);
      }
      requestAnimationFrame(() => {
        syncingRef.current = false;
      });
    };

    if (viewMode === 'edit') {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', flex: 1, minHeight: 0 }}>
          <div style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column' }}>
            <EditorPane
              ref={ref}
              content={content}
              onChange={onChange}
              onCursorChange={onCursorChange}
            />
          </div>
        </div>
      );
    }

    if (viewMode === 'preview') {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', flex: 1, overflow: 'auto' }}>
          <div style={{ width: '100%', maxWidth: '900px', padding: '20px' }}>
            <PreviewPane content={content} />
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flex: 1, minHeight: 0, minWidth: 0 }}>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRight: '1px solid var(--border-color)',
          }}
        >
          <EditorPane
            ref={ref}
            content={content}
            onChange={onChange}
            onCursorChange={onCursorChange}
            onScrollRatioChange={syncPreview}
          />
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
          }}
        >
          <PreviewPane content={content} />
        </div>
      </div>
    );
  },
);
