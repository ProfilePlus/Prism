interface RecentFilesProps {
  recentFiles: string[];
  onFileClick: (path: string) => void;
}

function basename(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

export function RecentFiles({ recentFiles, onFileClick }: RecentFilesProps) {
  if (recentFiles.length === 0) {
    return (
      <div style={{ padding: '16px', fontSize: '13px', opacity: 0.6, lineHeight: 1.6 }}>
        暂无最近打开的文件
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 0' }}>
      {recentFiles.map((path) => (
        <div
          key={path}
          onClick={() => onFileClick(path)}
          title={path}
          style={{
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: '13px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {basename(path)}
        </div>
      ))}
    </div>
  );
}
