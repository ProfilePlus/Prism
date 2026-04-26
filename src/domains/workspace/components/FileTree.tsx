import { FileNode } from '../types';

interface FileTreeProps {
  nodes: FileNode[];
  activePath?: string | null;
  onFileClick: (path: string) => void;
}

function stripExtension(name: string): { stem: string; ext: string } {
  const idx = name.lastIndexOf('.');
  if (idx <= 0) return { stem: name, ext: '' };
  return { stem: name.slice(0, idx), ext: name.slice(idx) };
}

export function FileTree({ nodes, activePath, onFileClick }: FileTreeProps) {
  if (nodes.length === 0) {
    return (
      <div
        style={{
          padding: '24px 16px',
          fontSize: '13px',
          opacity: 0.7,
          lineHeight: 1.7,
          textAlign: 'center',
        }}
      >
        <div style={{ marginBottom: '8px' }}>未打开工作区</div>
        <div style={{ fontSize: '12px', opacity: 0.8 }}>
          通过菜单或快捷键打开文件 / 文件夹
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '4px 0' }}>
      {nodes.map((node) => {
        const isActive = activePath === node.path;
        const { stem, ext } = stripExtension(node.name);

        return (
          <div
            key={node.path}
            onClick={() => onFileClick(node.path)}
            title={node.path}
            style={{
              padding: '10px 14px',
              cursor: 'pointer',
              borderLeft: isActive
                ? '3px solid var(--accent)'
                : '3px solid transparent',
              background: isActive ? 'var(--bg-active)' : 'transparent',
              transition: 'background 0.12s ease',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '4px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {stem}
              <span style={{ opacity: 0.5, fontWeight: 400 }}>{ext}</span>
            </div>
            {node.preview && (
              <div
                style={{
                  fontSize: '12px',
                  opacity: 0.65,
                  lineHeight: 1.5,
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
      })}
    </div>
  );
}
