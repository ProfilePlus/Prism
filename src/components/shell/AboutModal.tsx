import { useEffect } from 'react';

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
  onCheckUpdate?: () => void;
  version?: string;
}

export function AboutModal({
  visible,
  onClose,
  onCheckUpdate,
  version = __APP_VERSION__,
}: AboutModalProps) {
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal about-modal" role="dialog" aria-label="关于 Prism">
        <div className="modal-header">
          <div className="modal-title">关于 Prism</div>
          <button className="modal-close" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="modal-body">
          <div className="caption">PRISM · VERSION {version}</div>
          <div className="display">Prism</div>
          <p className="about-copy">
            一个把留白视为最强元素的 Markdown 桌面编辑器，采用 Tauri 2 + React + TypeScript 构建。
          </p>
          <dl className="about-meta">
            <div>
              <dt>版本</dt>
              <dd>v{version}</dd>
            </div>
            <div>
              <dt>许可证</dt>
              <dd>MIT</dd>
            </div>
            <div>
              <dt>更新</dt>
              <dd>GitHub Releases</dd>
            </div>
          </dl>
          <div className="about-actions">
            <button type="button" className="primary" onClick={onCheckUpdate}>
              检查更新
            </button>
            <button type="button" onClick={onClose}>
              关闭
            </button>
          </div>
          <p className="about-footnote">© 2026 Prism · Inter / JetBrains Mono are bundled under OFL.</p>
        </div>
      </div>
    </>
  );
}
