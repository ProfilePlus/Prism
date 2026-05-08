import { useMemo } from 'react';

interface HeadingItem {
  level: number;
  text: string;
  line: number;
}

interface OutlinePanelProps {
  content: string;
  onHeadingClick?: (line: number) => void;
}

function extractHeadings(content: string): HeadingItem[] {
  const lines = content.split('\n');
  const headings: HeadingItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        line: i + 1,
      });
    }
  }

  return headings;
}

export function OutlinePanel({ content, onHeadingClick }: OutlinePanelProps) {
  const headings = useMemo(() => extractHeadings(content), [content]);

  if (headings.length === 0) {
    return (
      <div style={{ padding: '16px', fontSize: '13px', opacity: 0.6 }}>
        暂无标题
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '1px' }}>
      {headings.map((h, i) => (
        <div
          key={i}
          onClick={() => onHeadingClick?.(h.line)}
          className="outline-item"
          style={{
            padding: '6px 12px',
            paddingLeft: `${16 + (h.level - 1) * 12}px`,
            cursor: 'pointer',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            borderRadius: 'var(--radius-md)',
            margin: '0 8px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            transition: 'all var(--duration-fast) var(--ease-out)',
          }}
        >
          {h.text}
        </div>
      ))}
      <style>{`
        .outline-item:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .outline-item:active {
          background: var(--bg-active);
          transform: scale(0.98);
        }
      `}</style>
    </div>
  );
}
