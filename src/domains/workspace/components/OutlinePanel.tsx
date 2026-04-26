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
    <div style={{ padding: '8px 0' }}>
      {headings.map((h, i) => (
        <div
          key={i}
          onClick={() => onHeadingClick?.(h.line)}
          style={{
            padding: '4px 8px',
            paddingLeft: `${8 + (h.level - 1) * 12}px`,
            cursor: 'pointer',
            fontSize: '13px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {h.text}
        </div>
      ))}
    </div>
  );
}
