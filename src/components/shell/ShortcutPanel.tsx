import { useEffect } from 'react';

interface ShortcutItem {
  category: string;
  shortcuts: Array<{
    keys: string;
    description: string;
  }>;
}

const SHORTCUTS: ShortcutItem[] = [
  {
    category: '文件',
    shortcuts: [
      { keys: 'Ctrl+N', description: '新建文档' },
      { keys: 'Ctrl+O', description: '打开文件' },
      { keys: 'Ctrl+S', description: '保存' },
      { keys: 'Ctrl+Shift+S', description: '另存为' },
      { keys: 'Ctrl+P', description: '打印' },
    ],
  },
  {
    category: '编辑',
    shortcuts: [
      { keys: 'Ctrl+Z', description: '撤销' },
      { keys: 'Ctrl+Y', description: '重做' },
      { keys: 'Ctrl+X', description: '剪切' },
      { keys: 'Ctrl+C', description: '复制' },
      { keys: 'Ctrl+V', description: '粘贴' },
      { keys: 'Ctrl+F', description: '查找' },
    ],
  },
  {
    category: '格式',
    shortcuts: [
      { keys: 'Ctrl+B', description: '加粗' },
      { keys: 'Ctrl+I', description: '斜体' },
      { keys: 'Ctrl+U', description: '下划线' },
      { keys: 'Ctrl+K', description: '插入链接' },
      { keys: 'Ctrl+`', description: '行内代码' },
    ],
  },
  {
    category: '视图',
    shortcuts: [
      { keys: 'Ctrl+1', description: '源码模式' },
      { keys: 'Ctrl+2', description: '分栏模式' },
      { keys: 'Ctrl+3', description: '预览模式' },
      { keys: 'Ctrl+\\', description: '切换侧边栏' },
      { keys: 'F8', description: '专注模式' },
    ],
  },
  {
    category: '其他',
    shortcuts: [
      { keys: 'F2', description: '重命名文件' },
      { keys: 'Ctrl+/', description: '快捷键面板' },
      { keys: 'Ctrl+Shift+P', description: '命令面板' },
      { keys: 'Esc', description: '关闭面板' },
    ],
  },
];

interface ShortcutPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function ShortcutPanel({ visible, onClose }: ShortcutPanelProps) {
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <>
      <div className="shortcut-panel-overlay" onClick={onClose} />
      <div className="shortcut-panel">
        <div className="shortcut-panel-header">
          <h2>快捷键</h2>
          <button className="shortcut-panel-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        <div className="shortcut-panel-content">
          {SHORTCUTS.map((category) => (
            <div key={category.category} className="shortcut-category">
              <h3>{category.category}</h3>
              <div className="shortcut-list">
                {category.shortcuts.map((shortcut, index) => (
                  <div key={index} className="shortcut-item">
                    <span className="shortcut-keys">{shortcut.keys}</span>
                    <span className="shortcut-description">{shortcut.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .shortcut-panel-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 9998;
          animation: fadeIn 0.2s ease;
        }

        .shortcut-panel {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90%;
          max-width: 700px;
          max-height: 80vh;
          background: var(--bg-surface-solid);
          border: 1px solid var(--stroke-control);
          border-radius: var(--radius-lg);
          box-shadow: var(--elevation-window);
          z-index: 9999;
          display: flex;
          flex-direction: column;
          animation: slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translate(-50%, -45%) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        .shortcut-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--stroke-surface);
        }

        .shortcut-panel-header h2 {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .shortcut-panel-close {
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          border-radius: var(--radius-sm);
          font-size: 24px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .shortcut-panel-close:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .shortcut-panel-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        .shortcut-category {
          margin-bottom: 32px;
        }

        .shortcut-category:last-child {
          margin-bottom: 0;
        }

        .shortcut-category h3 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary);
          margin: 0 0 12px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .shortcut-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .shortcut-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border-radius: var(--radius-sm);
          transition: background 0.2s;
        }

        .shortcut-item:hover {
          background: var(--bg-hover);
        }

        .shortcut-keys {
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 500;
          color: var(--accent);
          background: var(--accent-tint);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          min-width: 100px;
          text-align: center;
        }

        .shortcut-description {
          font-size: 13px;
          color: var(--text-primary);
          flex: 1;
          margin-left: 16px;
        }
      `}</style>
    </>
  );
}
