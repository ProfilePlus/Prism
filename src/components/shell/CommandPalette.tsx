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

const SearchIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="7" cy="7" r="5" />
    <path d="M11 11l3 3" />
  </svg>
);

export function CommandPalette({ visible, commands, onClose, onExecute }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCommands = commands.filter((cmd) => {
    const searchText = `${cmd.label} ${cmd.category} ${cmd.keywords?.join(' ') || ''}`.toLowerCase();
    return searchText.includes(query.toLowerCase());
  });

  useEffect(() => {
    if (visible) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible]);

  useEffect(() => { setSelectedIndex(0); }, [query]);

  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
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
      <div className="cmdk-overlay" onClick={onClose} />
      <div className="cmdk" role="dialog" aria-label="命令面板">
        <div className="cmdk-search">
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            placeholder="输入命令或搜索…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="cmdk-input"
          />
          <span className="kbd">Esc</span>
        </div>
        <div className="cmdk-list">
          {filteredCommands.length === 0 ? (
            <div className="cmdk-empty">未找到匹配的命令</div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <div
                key={cmd.id}
                className={`cmdk-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => { onExecute(cmd.id); onClose(); }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="cmdk-item-main">
                  <span className="cmdk-label">{cmd.label}</span>
                  <span className="cmdk-cat">{cmd.category}</span>
                </div>
                {cmd.shortcut && (
                  <span className="cmdk-shortcut">
                    {cmd.shortcut.split('+').map((k, j) => (
                      <span key={j} className="kbd">{k}</span>
                    ))}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
