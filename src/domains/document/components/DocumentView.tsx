import { forwardRef } from 'react';
import { useDocumentStore } from '../store';
import { SplitView } from '../../editor/components/SplitView';
import { EditorPaneHandle } from '../../editor/components/EditorPane';

interface DocumentViewProps {
  onCursorChange?: (cursor: { line: number; column: number }) => void;
  onSelectionTextChange?: (text: string) => void;
  onNotice?: (message: string) => void;
}

export const DocumentView = forwardRef<EditorPaneHandle, DocumentViewProps>(
  function DocumentView({ onCursorChange, onSelectionTextChange, onNotice }, ref) {
    const currentDocument = useDocumentStore((s) => s.currentDocument);
    const updateContent = useDocumentStore((s) => s.updateContent);
    const updateScrollState = useDocumentStore((s) => s.updateScrollState);

    if (!currentDocument) {
      return (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            fontSize: '14px',
          }}
        >
          请打开一个 Markdown 文件开始编辑
        </div>
      );
    }

    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          minWidth: 0,
          position: 'relative',
        }}
      >
        <SplitView
          ref={ref}
          content={currentDocument.content}
          scrollState={currentDocument.scrollState}
          viewMode={currentDocument.viewMode}
          onChange={updateContent}
          onCursorChange={onCursorChange}
          onSelectionTextChange={onSelectionTextChange}
          onNotice={onNotice}
          onScrollStateChange={updateScrollState}
        />
      </div>
    );
  },
);
