import { useMemo, useEffect, useRef } from 'react';
import { markdownToHtml } from '../../../lib/markdownToHtml';

interface PreviewPaneProps {
  content: string;
}

export function PreviewPane({ content }: PreviewPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const html = useMemo(() => {
    try {
      return markdownToHtml(content);
    } catch {
      return '<p>渲染失败</p>';
    }
  }, [content]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const placeholders = container.querySelectorAll('.mermaid-placeholder');
    if (placeholders.length === 0) return;

    import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        theme: document.body.classList.contains('dark') ? 'dark' : 'default',
        securityLevel: 'loose',
      });

      placeholders.forEach(async (placeholder, i) => {
        const el = placeholder as HTMLElement;
        const encoded = el.getAttribute('data-mermaid');
        if (!encoded) return;

        const code = decodeURIComponent(encoded);
        const id = `mermaid-${Date.now()}-${i}`;

        try {
          const { svg } = await mermaid.render(id, code);
          el.innerHTML = svg;
          el.style.display = 'flex';
          el.style.justifyContent = 'center';
          el.style.margin = '1.5em 0';
        } catch (err) {
          el.innerHTML = `<pre style="color: var(--text-secondary); font-size: 12px;">Mermaid 渲染失败: ${err}</pre>`;
        }
      });
    });
  }, [html]);

  return (
    <div
      ref={containerRef}
      className="markdown-preview"
      style={{
        flex: 1,
        padding: '24px 32px',
        minHeight: 0,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
