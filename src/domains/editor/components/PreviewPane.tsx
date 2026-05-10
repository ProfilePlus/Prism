import { useMemo, useEffect, useRef, useState } from 'react';
import { markdownToHtml } from '../../../lib/markdownToHtml';
import { openUrl } from '@tauri-apps/plugin-opener';

interface PreviewPaneProps {
  content: string;
}

export function PreviewPane({ content }: PreviewPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

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

    const handleLinkClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (anchor && anchor.href) {
        const url = anchor.href;
        if (url.startsWith('http')) {
          e.preventDefault();
          try { await openUrl(url); }
          catch (err) { console.error('[PreviewPane] Failed to open URL:', err); }
        }
      }
    };

    container.addEventListener('click', handleLinkClick);
    return () => container.removeEventListener('click', handleLinkClick);
  }, [html]);

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
          el.innerHTML = `<pre style="color: var(--c-ash); font-size: 12px;">Mermaid 渲染失败: ${err}</pre>`;
        }
      });
    });
  }, [html]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleCopyClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const copyBtn = target.closest('.code-copy') as HTMLButtonElement | null;
      if (copyBtn) {
        e.preventDefault();
        const code = copyBtn.getAttribute('data-code');
        if (code) {
          try {
            await navigator.clipboard.writeText(code);
            copyBtn.classList.add('copied');
            setTimeout(() => copyBtn.classList.remove('copied'), 2000);
          } catch (err) {
            console.error('[PreviewPane] Failed to copy code:', err);
          }
        }
      }
    };

    container.addEventListener('click', handleCopyClick);
    return () => container.removeEventListener('click', handleCopyClick);
  }, [html]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleImageClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        e.preventDefault();
        const img = target as HTMLImageElement;
        setLightboxImage(img.src);
      }
    };

    container.addEventListener('click', handleImageClick);
    return () => container.removeEventListener('click', handleImageClick);
  }, [html]);

  return (
    <>
      <div
        ref={containerRef}
        className="markdown-preview"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {lightboxImage && (
        <div
          className="lightbox-overlay"
          onClick={() => setLightboxImage(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setLightboxImage(null);
          }}
          tabIndex={0}
        >
          <img src={lightboxImage} alt="放大图片" className="lightbox-image" />
          <button
            className="lightbox-close"
            onClick={() => setLightboxImage(null)}
            aria-label="关闭"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
