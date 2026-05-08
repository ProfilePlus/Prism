import { useState, useEffect, useRef } from 'react';

export interface Command {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  keywords?: string[];
}

interface CommandPaletteProps {
  visible: boolean;
  commands: Command[];
  onClose: () => void;
  onExecute: (commandId: string) => void;
}

export function CommandPalette({ visible, commands, onClose, onExecute }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 简单的模糊搜索
  const filteredCommands = commands.filter(cmd => {
    const searchText = `${cmd.label} ${cmd.category} ${cmd.keywords?.join(' ') || ''}`.toLowerCase();
    const queryLower = query.toLowerCase();
    return searchText.includes(queryLower);
  });

  useEffect(() => {
    if (visible) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onExecute(filteredCommands[selectedIndex].id);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, selectedIndex, filteredCommands, onClose, onExecute]);

  if (!visible) return null;

  return (
    <>
      <div className="command-palette-overlay" onClick={onClose} />
      <div className="command-palette">
        <div className="command-palette-search">
          <span className="command-palette-icon">⌘</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="输入命令..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="command-palette-input"
          />
        </div>
        <div className="command-palette-results">
          {filteredCommands.length === 0 ? (
            <div className="command-palette-empty">未找到匹配的命令</div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <div
                key={cmd.id}
                className={`command-palette-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => {
                  onExecute(cmd.id);
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="command-palette-item-main">
                  <span className="command-palette-item-label">{cmd.label}</span>
                  <span className="command-palette-item-category">{cmd.category}</span>
                </div>
                {cmd.shortcut && (
                  <span className="command-palette-item-shortcut">{cmd.shortcut}</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        .command-palette-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 10000;
          animation: fadeIn 0.2s ease;
        }

        .command-palette {
          position: fixed;
          top: 20%;
          left: 50%;
          transform: translateX(-50%);
          width: 90%;
          max-width: 600px;
          background: var(--bg-surface-solid);
          border: 1px solid var(--stroke-control);
          border-radius: var(--radius-lg);
          box-shadow: var(--elevation-window);
          z-index: 10001;
          display: flex;
          flex-direction: column;
          animation: slideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }

        .command-palette-search {
          display: flex;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid var(--stroke-surface);
          gap: 12px;
        }

        .command-palette-icon {
          font-size: 20px;
          color: var(--text-tertiary);
        }

        .command-palette-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 16px;
          color: var(--text-primary);
          outline: none;
          font-family: var(--font-ui);
        }

        .command-palette-input::placeholder {
          color: var(--text-tertiary);
        }

        .command-palette-results {
          max-height: 400px;
          overflow-y: auto;
          padding: 8px;
        }

        .command-palette-empty {
          padding: 32px;
          text-align: center;
          color: var(--text-tertiary);
          font-size: 14px;
        }

        .command-palette-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.15s;
          margin-bottom: 4px;
        }

        .command-palette-item:hover,
        .command-palette-item.selected {
          background: var(--bg-hover);
        }

        .command-palette-item.selected {
          background: var(--accent-tint);
          border-left: 3px solid var(--accent);
          padding-left: 13px;
        }

        .command-palette-item-main {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }

        .command-palette-item-label {
          font-size: 14px;
          color: var(--text-primary);
          font-weight: 500;
        }

        .command-palette-item-category {
          font-size: 12px;
          color: var(--text-tertiary);
        }

        .command-palette-item-shortcut {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-tertiary);
          background: var(--bg-hover);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
        }
      `}</style>
    </>
  );
}
