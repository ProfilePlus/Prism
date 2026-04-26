import { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  label?: string;
  action?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  checked?: boolean;
  type?: 'separator' | 'item';
  danger?: boolean;
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

  // 确保菜单不超出屏幕
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - (items.length * 30));

  return (
    <div
      ref={menuRef}
      className="custom-context-menu"
      style={{
        left: `${adjustedX}px`,
        top: `${adjustedY}px`,
      }}
    >
      {items.map((item, idx) => {
        if (item.type === 'separator') {
          return <div key={idx} className="menu-separator" />;
        }
        return (
          <div
            key={idx}
            className={`menu-item ${item.danger ? 'danger' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              if (item.action) onAction(item.action);
              onClose();
            }}
          >
            <div className="menu-icon-slot">
              {item.icon}
              {item.checked && <span className="check-mark"></span>}
            </div>
            <span className="menu-label">{item.label}</span>
            {item.shortcut && <span className="menu-shortcut">{item.shortcut}</span>}
          </div>
        );
      })}

      <style>{`
        .custom-context-menu {
          position: fixed;
          z-index: 10000;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(25px) saturate(180%);
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 8px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
          padding: 5px;
          min-width: 200px;
          animation: menuEnter 0.12s cubic-bezier(0, 0, 0.2, 1);
        }

        @keyframes menuEnter {
          from { opacity: 0; transform: scale(0.96) translateY(-4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .menu-item {
          display: flex;
          align-items: center;
          padding: 6px 12px;
          gap: 12px;
          cursor: pointer;
          border-radius: 5px;
          transition: all 0.1s;
        }

        .menu-item:hover {
          background: rgba(0, 0, 0, 0.05);
        }

        .menu-item.danger:hover {
          background: rgba(255, 59, 48, 0.1);
        }
        .menu-item.danger .menu-label { color: #ff3b30; }

        .menu-icon-slot {
          width: 14px;
          display: flex;
          justify-content: center;
          font-family: 'Segoe Fluent Icons', 'Segoe MDL2 Assets';
          font-size: 10px;
          color: var(--text-tertiary);
        }

        .menu-label {
          flex: 1;
          font-size: 12px;
          color: var(--text-primary);
          font-weight: 400;
        }

        .menu-shortcut {
          font-size: 10px;
          color: var(--text-tertiary);
          opacity: 0.6;
          font-family: var(--font-ui);
        }

        .menu-separator {
          height: 1px;
          background: rgba(0, 0, 0, 0.06);
          margin: 4px 6px;
        }
      `}</style>
    </div>
  );
}

