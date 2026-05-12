import { useEffect, useLayoutEffect, useRef, useState } from 'react';

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
  const [position, setPosition] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const margin = 8;
    const rect = menu.getBoundingClientRect();
    const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
    const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);

    setPosition({
      left: Math.min(Math.max(x, margin), maxLeft),
      top: Math.min(Math.max(y, margin), maxTop),
    });
  }, [x, y, items]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="custom-context-menu"
      style={{ left: `${position.left}px`, top: `${position.top}px` }}
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
