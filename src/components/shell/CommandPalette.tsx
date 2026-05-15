import { useState, useEffect, useMemo, useRef } from 'react';
import type { FileNode } from '../../domains/workspace/types';
import { rankQuickOpenFiles, type QuickOpenRecentFile } from '../../domains/workspace/services';

export interface Command {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  keywords?: string[];
}

export type CommandPaletteMode = 'commands' | 'files';

interface CommandPaletteProps {
  visible: boolean;
  commands: Command[];
  files?: FileNode[];
  workspaceRoot?: string | null;
  recentFiles?: QuickOpenRecentFile[];
  mode?: CommandPaletteMode;
  onClose: () => void;
  onExecute: (commandId: string) => void;
}

const SearchIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="7" cy="7" r="5" />
    <path d="M11 11l3 3" />
  </svg>
);

export function CommandPalette({
  visible,
  commands,
  files = [],
  workspaceRoot = null,
  recentFiles = [],
  mode = 'commands',
  onClose,
  onExecute,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCommands = useMemo(() => commands.filter((cmd) => {
    const searchText = `${cmd.label} ${cmd.category} ${cmd.keywords?.join(' ') || ''}`.toLowerCase();
    return searchText.includes(query.toLowerCase());
  }), [commands, query]);
  const quickOpenItems = useMemo(
    () => rankQuickOpenFiles(files, query, 30, workspaceRoot, recentFiles),
    [files, query, recentFiles, workspaceRoot],
  );
  const visibleItems = useMemo(() => (mode === 'files'
    ? quickOpenItems.map((result) => ({
        id: `openWorkspaceFile:${encodeURIComponent(result.node.path)}`,
        label: result.node.name,
        category: result.folderLabel || '工作区文件',
        shortcut: undefined,
      }))
    : filteredCommands), [filteredCommands, mode, quickOpenItems]);
  const placeholder = mode === 'files' ? '搜索工作区文件…' : '输入命令或搜索…';
  const emptyText = mode === 'files' ? '未找到匹配的文件' : '未找到匹配的命令';

  useEffect(() => {
    if (visible) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible, mode]);

  useEffect(() => { setSelectedIndex(0); }, [query]);

  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => visibleItems.length === 0 ? 0 : Math.min(prev + 1, visibleItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (visibleItems[selectedIndex]) {
          onExecute(visibleItems[selectedIndex].id);
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, selectedIndex, visibleItems, onClose, onExecute]);

  if (!visible) return null;

  return (
    <>
      <div className="cmdk-overlay" onClick={onClose} />
      <div className="cmdk" role="dialog" aria-label={mode === 'files' ? '快速打开' : '命令面板'}>
        <div className="cmdk-search">
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="cmdk-input"
          />
          <span className="kbd">Esc</span>
        </div>
        <div className="cmdk-list">
          {visibleItems.length === 0 ? (
            <div className="cmdk-empty">{emptyText}</div>
          ) : (
            visibleItems.map((cmd, index) => (
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
