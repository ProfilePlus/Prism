import { useEffect } from 'react';

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AboutModal({ visible, onClose }: AboutModalProps) {
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
      <div className="modal" role="dialog" aria-label="关于 Prism">
        <div className="modal-header">
          <div className="modal-title">关于</div>
          <button className="modal-close" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="modal-body">
          <div className="caption">PRISM · VERSION 0.1.1</div>
          <div className="display">落笔之前的空白。</div>
          <p style={{ color: 'var(--c-graphite)', marginBottom: 16 }}>
            一个把留白视为最强元素的 Markdown 桌面编辑器，采用 Tauri 2 + React + TypeScript 构建。
          </p>
          <p style={{ color: 'var(--c-ash)', fontSize: 12 }}>
            © 2026 Prism · MIT License
          </p>
        </div>
      </div>
    </>
  );
}
