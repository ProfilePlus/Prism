import { useEffect } from 'react';
import type { LinkDiagnostic } from '../extensions/linkDiagnostics';

interface LinkDiagnosticsPanelProps {
  diagnostics: LinkDiagnostic[];
  onClose: () => void;
  onSelect: (line: number) => void;
  visible: boolean;
}

const KIND_LABEL: Record<LinkDiagnostic['kind'], string> = {
  'empty-target': '空链接',
  'missing-file': '缺失文件',
  'missing-heading': '缺失标题',
};

export function LinkDiagnosticsPanel({
  diagnostics,
  onClose,
  onSelect,
  visible,
}: LinkDiagnosticsPanelProps) {
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, visible]);

  if (!visible) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal prism-link-diagnostics-modal" role="dialog" aria-label="链接问题">
        <div className="modal-header">
          <div className="modal-title">链接问题</div>
          <button className="modal-close" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="modal-body prism-link-diagnostics-body">
          {diagnostics.length === 0 ? (
            <div className="prism-link-diagnostics-empty">当前文档没有链接问题</div>
          ) : (
            <div className="prism-link-diagnostics-list">
              {diagnostics.map((diagnostic, index) => (
                <button
                  key={`${diagnostic.line}-${diagnostic.column}-${diagnostic.kind}-${index}`}
                  type="button"
                  className="prism-link-diagnostic-item"
                  onClick={() => onSelect(diagnostic.line)}
                >
                  <span className="prism-link-diagnostic-kind">{KIND_LABEL[diagnostic.kind]}</span>
                  <span className="prism-link-diagnostic-main">
                    <span className="prism-link-diagnostic-message">{diagnostic.message}</span>
                    <span className="prism-link-diagnostic-target">{diagnostic.target || '空目标'}</span>
                  </span>
                  <span className="prism-link-diagnostic-location">
                    {diagnostic.line}:{diagnostic.column}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
