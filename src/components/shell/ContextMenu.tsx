import { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  label?: string;
  action?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  checked?: boolean;
  type?: 'separator' | 'item';
  danger?: boolean;
  disabled?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onAction: (action: string) => void;
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onAction, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const adjustedX = Math.min(x, window.innerWidth - 240);
  const adjustedY = Math.min(y, window.innerHeight - items.length * 32 - 20);

  return (
    <div
      ref={menuRef}
      className="custom-context-menu"
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {items.map((item, idx) => {
        if (item.type === 'separator') {
          return <div key={`sep-${idx}`} className="menu-separator" />;
        }
        const cls = ['menu-item', item.danger ? 'danger' : '', item.disabled ? 'disabled' : '']
          .filter(Boolean)
          .join(' ');
        return (
          <div
            key={idx}
            className={cls}
            onClick={(e) => {
              e.stopPropagation();
              if (item.disabled) return;
              if (item.action) onAction(item.action);
              onClose();
            }}
          >
            <div className="menu-icon-slot">
              {item.icon}
              {item.checked && <span className="check-mark" />}
            </div>
            <span className="menu-label">{item.label}</span>
            {item.shortcut && <span className="menu-shortcut">{item.shortcut}</span>}
          </div>
        );
      })}
    </div>
  );
}
