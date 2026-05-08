import { useEffect, useMemo, useRef, useState } from 'react';
import { FileNode } from '../types';
import { useWorkspaceStore } from '../store';
import { ContextMenu, ContextMenuItem } from '../../../components/shell/ContextMenu';

interface FileTreeProps {
  nodes: FileNode[];
  activePath?: string | null;
  onFileClick: (path: string) => void;
}

interface RenameFieldProps {
  value: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}

interface FlatFileNode {
  node: FileNode;
  folderLabel: string;
}

function stripExtension(name: string): { stem: string; ext: string } {
  const idx = name.lastIndexOf('.');
  if (idx <= 0) return { stem: name, ext: '' };
  return { stem: name.slice(0, idx), ext: name.slice(idx) };
}

function dirname(path: string): string {
  const parts = path.split(/[\\/]/);
  parts.pop();
  return parts.join(path.includes('\\') ? '\\' : '/');
}

function isDirectory(node: FileNode): boolean {
  return node.kind === 'directory' || Array.isArray(node.children);
}

function collectDirectoryPaths(nodes: FileNode[], out = new Set<string>()): Set<string> {
  for (const node of nodes) {
    if (isDirectory(node)) {
      out.add(node.path);
      collectDirectoryPaths(node.children ?? [], out);
    }
  }
  return out;
}

function flattenFiles(nodes: FileNode[], rootPath: string | null, out: FlatFileNode[] = []): FlatFileNode[] {
  for (const node of nodes) {
    if (isDirectory(node)) {
      flattenFiles(node.children ?? [], rootPath, out);
      continue;
    }

    const parent = dirname(node.path);
    const folderLabel = rootPath && parent !== rootPath
      ? parent.replace(rootPath, '').replace(/^[\\/]/, '')
      : '';

    out.push({ node, folderLabel });
  }

  return out;
}

function dispatchFileAction(action: string, detail?: { path?: string; name?: string }): void {
  window.dispatchEvent(new CustomEvent('prism-file-action', { detail: { action, ...detail } }));
}

function RenameField({ value, onCommit, onCancel }: RenameFieldProps) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      // 自动选中文件名（不含扩展名）
      const { stem } = stripExtension(value);
      inputRef.current.setSelectionRange(0, stem.length);
    }
  }, [value]);

  const finish = (commit: boolean) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (commit) {
      onCommit(draft);
    } else {
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => finish(true)}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          finish(true);
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          finish(false);
        }
      }}
      className="file-tree-rename-input"
    />
  );
}

export function FileTree({ nodes, activePath, onFileClick }: FileTreeProps) {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const fileTreeMode = useWorkspaceStore((s) => s.fileTreeMode);
  const fileSortMode = useWorkspaceStore((s) => s.fileSortMode);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, items: ContextMenuItem[] } | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => collectDirectoryPaths(nodes));

  useEffect(() => {
    setExpandedPaths(collectDirectoryPaths(nodes));
  }, [nodes]);

  useEffect(() => {
    const handler = (event: Event) => {
      const path = (event as CustomEvent<{ path?: string }>).detail?.path;
      if (!path) return;
      setExpandedPaths(collectDirectoryPaths(nodes));
      setRenamingPath(path);
      setContextMenu(null);
    };

    window.addEventListener('prism-file-rename-request', handler as EventListener);
    return () => window.removeEventListener('prism-file-rename-request', handler as EventListener);
  }, [nodes]);

  // F2 快捷键重命名
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F2' && activePath) {
        event.preventDefault();
        setRenamingPath(activePath);
        setContextMenu(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePath]);

  const flatFiles = useMemo(() => flattenFiles(nodes, rootPath, []), [nodes, rootPath]);

  const commitRename = (path: string, name: string) => {
    setRenamingPath(null);
    dispatchFileAction('commitRename', { path, name });
  };

  const makeContextItems = (node?: FileNode): ContextMenuItem[] => {
    const nodeIsDirectory = node ? isDirectory(node) : false;
    const targetDir = node ? (nodeIsDirectory ? node.path : dirname(node.path)) : undefined;

    const items: ContextMenuItem[] = [];

    if (node && !nodeIsDirectory) {
      items.push(
        { label: '打开', action: `openFile:${node.path}` },
        { label: '在新窗口中打开', action: `openNewWindow:${node.path}` },
        { type: 'separator' },
      );
    } else if (nodeIsDirectory && node) {
      items.push(
        { label: '在新窗口中打开', action: `openNewWindow:${node.path}` },
        { type: 'separator' },
      );
    } else {
      items.push(
        { label: '在新窗口中打开', action: 'openNewWindow' },
        { type: 'separator' },
      );
    }

    items.push(
      { label: '新建文件', action: targetDir ? `newFile:${targetDir}` : 'newFile' },
      { label: '新建文件夹', action: targetDir ? `newFolder:${targetDir}` : 'newFolder' },
      { type: 'separator' },
      { label: '搜索', action: 'searchInFolder' },
      { type: 'separator' },
      { label: '文档列表', action: 'viewList', checked: fileTreeMode === 'list' },
      { label: '文档树', action: 'viewTree', checked: fileTreeMode === 'tree' },
      { type: 'separator' },
      { label: '按名称排序', action: 'sortByName', checked: fileSortMode === 'name' },
      { label: '按修改时间排序', action: 'sortByModified', checked: fileSortMode === 'modified' },
      { label: '按创建时间排序', action: 'sortByCreated', checked: fileSortMode === 'created' },
      { label: '按大小排序', action: 'sortBySize', checked: fileSortMode === 'size' },
      { type: 'separator' },
    );

    if (node) {
      items.push({ label: '重命名', action: `rename:${node.path}` });
      if (!nodeIsDirectory) {
        items.push({ label: '创建副本', action: `duplicate:${node.path}` });
      }
      items.push(
        { label: '删除', action: `delete:${node.path}`, danger: true },
        { type: 'separator' },
        { label: '属性', action: `properties:${node.path}` },
        { label: '复制文件路径', action: `copyPath:${node.path}` },
        { label: '打开文件位置', action: `openLocation:${node.path}` },
      );
    } else {
      items.push(
        { label: '在新窗口中打开', action: 'openNewWindow' },
        { type: 'separator' },
        { label: '新建文件', action: 'newFile' },
        { label: '新建文件夹', action: 'newFolder' },
        { label: '搜索', action: 'searchInFolder' },
        { type: 'separator' },
        { label: '文档列表', action: 'viewList', checked: fileTreeMode === 'list' },
        { label: '文档树', action: 'viewTree', checked: fileTreeMode === 'tree' },
        { type: 'separator' },
        { label: '复制文件路径', action: 'copyRootPath' },
        { label: '打开文件位置', action: 'openRootLocation' },
      );
    }

    return items;
  };

  const handleContextMenu = (event: React.MouseEvent, node?: FileNode) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY, items: makeContextItems(node) });
  };

  const handleAction = (action: string) => {
    dispatchFileAction(action);
  };

  const renderFileName = (node: FileNode, isActive: boolean) => {
    if (renamingPath === node.path) {
      return (
        <RenameField
          value={node.name}
          onCommit={(name) => commitRename(node.path, name)}
          onCancel={() => setRenamingPath(null)}
        />
      );
    }

    const { stem, ext } = stripExtension(node.name);
    return (
      <div
        style={{
          fontSize: '13.5px',
          fontWeight: isActive ? 600 : 500,
          color: isActive ? 'var(--accent)' : 'var(--text-primary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {stem}
        <span style={{ opacity: 0.4, fontWeight: 400 }}>{ext}</span>
      </div>
    );
  };

  const renderFileNode = (node: FileNode, depth: number, index: number, folderLabel?: string) => {
    const isActive = activePath === node.path;

    return (
      <div
        key={node.path}
        onClick={() => onFileClick(node.path)}
        onContextMenu={(event) => handleContextMenu(event, node)}
        title={node.path}
        style={{
          padding: '10px 14px',
          margin: '2px 8px',
          marginLeft: fileTreeMode === 'tree' ? `${8 + depth * 14}px` : '8px',
          cursor: 'pointer',
          borderRadius: 'var(--radius-lg)',
          background: isActive ? 'var(--bg-surface-solid)' : 'transparent',
          boxShadow: isActive ? 'var(--elevation-flyout)' : 'none',
          transform: isActive ? 'scale(1.02)' : 'scale(1)',
          position: 'relative',
          transition: 'all 0.24s cubic-bezier(0.34, 1.56, 0.64, 1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          zIndex: isActive ? 10 : 1,
          animation: `fileItemEntry 0.36s cubic-bezier(0.34, 1.56, 0.64, 1) backwards`,
          animationDelay: `${Math.min(index, 24) * 0.02}s`,
        }}
        className="file-tree-item"
      >
        {renderFileName(node, isActive)}

        {folderLabel && (
          <div className="file-tree-folder-label">{folderLabel}</div>
        )}

        {node.preview && (
          <div
            style={{
              fontSize: '11px',
              color: isActive ? 'var(--text-secondary)' : 'var(--text-tertiary)',
              lineHeight: '1.45',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {node.preview}
          </div>
        )}
      </div>
    );
  };

  const renderDirectoryNode = (node: FileNode, depth: number) => {
    const expanded = expandedPaths.has(node.path);

    return (
      <div key={node.path}>
        <div
          onClick={() => {
            setExpandedPaths((prev) => {
              const next = new Set(prev);
              if (next.has(node.path)) {
                next.delete(node.path);
              } else {
                next.add(node.path);
              }
              return next;
            });
          }}
          onContextMenu={(event) => handleContextMenu(event, node)}
          title={node.path}
          className="file-tree-directory"
          style={{ paddingLeft: `${12 + depth * 14}px` }}
        >
          <span className={`file-tree-caret ${expanded ? 'is-expanded' : ''}`}>›</span>
          {renamingPath === node.path ? (
            <RenameField
              value={node.name}
              onCommit={(name) => commitRename(node.path, name)}
              onCancel={() => setRenamingPath(null)}
            />
          ) : (
            <span className="file-tree-directory-name">{node.name}</span>
          )}
        </div>
        {expanded && (
          <div>
            {(node.children ?? []).map((child, index) => (
              isDirectory(child)
                ? renderDirectoryNode(child, depth + 1)
                : renderFileNode(child, depth + 1, index)
            ))}
          </div>
        )}
      </div>
    );
  };

  const isEmpty = fileTreeMode === 'list' ? flatFiles.length === 0 : nodes.length === 0;

  return (
    <div
      style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}
      onContextMenu={(event) => handleContextMenu(event)}
    >
      {isEmpty ? (
        <div className="file-tree-empty">
          <div style={{ marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {rootPath ? '暂无文档' : '未打开工作区'}
          </div>
          <div style={{ fontSize: '12px' }}>
            {rootPath ? '可以从这里新建文件或刷新文件夹' : '通过菜单或快捷键打开文件 / 文件夹'}
          </div>
        </div>
      ) : fileTreeMode === 'list' ? (
        flatFiles.map(({ node, folderLabel }, index) => renderFileNode(node, 0, index, folderLabel))
      ) : (
        nodes.map((node, index) => (
          isDirectory(node)
            ? renderDirectoryNode(node, 0)
            : renderFileNode(node, 0, index)
        ))
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onAction={handleAction}
          onClose={() => setContextMenu(null)}
        />
      )}

      <style>{`
        @keyframes fileItemEntry {
          from { opacity: 0; transform: translateX(-12px) scale(0.97); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        .file-tree-item:hover {
          background: var(--bg-hover);
        }
        .file-tree-item:active {
          transform: scale(0.98);
          background: var(--bg-active);
        }
        .file-tree-directory {
          height: 30px;
          margin: 1px 8px;
          padding-right: 10px;
          display: flex;
          align-items: center;
          gap: 6px;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .file-tree-directory:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .file-tree-caret {
          width: 12px;
          display: inline-flex;
          justify-content: center;
          color: var(--text-tertiary);
          transform: rotate(0deg);
          transition: transform 0.15s;
          font-size: 16px;
          line-height: 1;
        }
        .file-tree-caret.is-expanded {
          transform: rotate(90deg);
        }
        .file-tree-directory-name {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12.5px;
          font-weight: 500;
        }
        .file-tree-rename-input {
          width: 100%;
          min-width: 0;
          height: 22px;
          padding: 0 6px;
          border: 1px solid var(--accent);
          border-radius: var(--radius-sm);
          background: var(--bg-surface-solid);
          color: var(--text-primary);
          font: inherit;
          outline: none;
          box-shadow: 0 0 0 2px var(--accent-tint);
        }
        .file-tree-folder-label {
          font-size: 10.5px;
          color: var(--text-tertiary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .file-tree-empty {
          padding: 48px 16px;
          font-size: 13px;
          color: var(--text-tertiary);
          line-height: 1.7;
          text-align: center;
        }
      `}</style>
    </div>
  );
}
