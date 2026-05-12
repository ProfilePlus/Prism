import { useEffect } from 'react';

interface ShortcutItem {
  category: string;
  shortcuts: Array<{ keys: string; description: string }>;
}

const SHORTCUTS: ShortcutItem[] = [
  {
    category: '文件',
    shortcuts: [
      { keys: 'Ctrl+N', description: '新建文档' },
      { keys: 'Ctrl+O', description: '打开文件' },
      { keys: 'Ctrl+S', description: '保存' },
      { keys: 'Ctrl+Shift+S', description: '另存为' },
      { keys: 'Ctrl+P', description: '快速打开' },
    ],
  },
  {
    category: '编辑',
    shortcuts: [
      { keys: 'Ctrl+Z', description: '撤销' },
      { keys: 'Ctrl+Y', description: '重做' },
      { keys: 'Ctrl+F', description: '查找' },
      { keys: 'Ctrl+H', description: '替换' },
    ],
  },
  {
    category: '格式',
    shortcuts: [
      { keys: 'Ctrl+B', description: '加粗' },
      { keys: 'Ctrl+I', description: '斜体' },
      { keys: 'Ctrl+U', description: '下划线' },
      { keys: 'Ctrl+K', description: '插入链接' },
      { keys: 'Ctrl+Shift+`', description: '行内代码' },
    ],
  },
  {
    category: '视图',
    shortcuts: [
      { keys: 'Ctrl+/', description: '源码模式' },
      { keys: 'Ctrl+Shift+L', description: '切换侧边栏' },
      { keys: 'F8', description: '专注模式' },
      { keys: 'F9', description: '打字机模式' },
      { keys: 'F11', description: '全屏' },
      { keys: 'Ctrl+Shift+9', description: '实际大小' },
      { keys: 'Ctrl+Shift+=', description: '放大' },
      { keys: 'Ctrl+Shift+-', description: '缩小' },
      { keys: 'Shift+F12', description: '开发者工具' },
    ],
  },
  {
    category: '其他',
    shortcuts: [
      { keys: 'Ctrl+Shift+P', description: '命令面板' },
      { keys: 'Ctrl+/', description: '快捷键面板' },
      { keys: 'Esc', description: '关闭浮层' },
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
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <>
      <div className="sp-overlay" onClick={onClose} />
      <div className="sp" role="dialog" aria-label="快捷键">
        <div className="sp-header">
          <h2>快捷键</h2>
          <button className="sp-close" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="sp-content">
          {SHORTCUTS.map((category) => (
            <div key={category.category} className="sp-category">
              <h3>{category.category}</h3>
              <div className="sp-list">
                {category.shortcuts.map((s, i) => (
                  <div key={i} className="sp-item">
                    <span className="sp-item-desc">{s.description}</span>
                    <span className="sp-item-keys">{s.keys}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
