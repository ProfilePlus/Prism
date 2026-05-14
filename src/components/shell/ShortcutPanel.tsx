import { useEffect } from 'react';
import { commandRegistry, getPrimaryShortcutLabel } from '../../domains/commands';

interface ShortcutItem {
  category: string;
  shortcuts: Array<{ keys: string; description: string }>;
}

const CATEGORY_ORDER = ['文件', '编辑', '插入', '格式', '视图', '窗口', '帮助'];

function getShortcutItems(): ShortcutItem[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    shortcuts: commandRegistry
      .filter((command) => command.category === category)
      .map((command) => ({
        keys: getPrimaryShortcutLabel(command.id),
        description: command.label,
      }))
      .filter((item): item is { keys: string; description: string } => Boolean(item.keys)),
  })).filter((category) => category.shortcuts.length > 0);
}

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

  const shortcuts = getShortcutItems();

  return (
    <>
      <div className="sp-overlay" onClick={onClose} />
      <div className="sp" role="dialog" aria-label="快捷键">
        <div className="sp-header">
          <h2>快捷键</h2>
          <button className="sp-close" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="sp-content">
          {shortcuts.map((category) => (
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
