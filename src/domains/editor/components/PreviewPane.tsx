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

  // 处理链接点击，在系统浏览器中打开
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleLinkClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      
      if (anchor && anchor.href) {
        const url = anchor.href;
        // 如果是外部链接（http/https），拦截并在系统浏览器打开
        if (url.startsWith('http')) {
          e.preventDefault();
          try {
            await openUrl(url);
          } catch (err) {
            console.error('[PreviewPane] Failed to open URL:', err);
          }
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
          el.innerHTML = `<pre style="color: var(--text-secondary); font-size: 12px;">Mermaid 渲染失败: ${err}</pre>`;
        }
      });
    });
  }, [html]);

  // 处理代码复制按钮点击
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleCopyClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const copyBtn = target.closest('.code-copy-btn') as HTMLButtonElement;

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

  // 处理图片点击放大
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
        style={{
          padding: '32px 48px',
          color: 'var(--text-primary)',
          maxWidth: '860px',
          margin: '0 auto',
          width: '100%',
        }}
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
          <style>{`
            .lightbox-overlay {
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.9);
              backdrop-filter: blur(8px);
              z-index: 10000;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: zoom-out;
              animation: fadeIn 0.2s ease;
            }

            .lightbox-image {
              max-width: 90vw;
              max-height: 90vh;
              object-fit: contain;
              border-radius: var(--radius-lg);
              box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
              animation: zoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }

            .lightbox-close {
              position: fixed;
              top: 24px;
              right: 24px;
              width: 48px;
              height: 48px;
              border: none;
              background: rgba(255, 255, 255, 0.1);
              color: white;
              font-size: 32px;
              border-radius: 50%;
              cursor: pointer;
              transition: all 0.2s;
              display: flex;
              align-items: center;
              justify-content: center;
              backdrop-filter: blur(10px);
            }

            .lightbox-close:hover {
              background: rgba(255, 255, 255, 0.2);
              transform: scale(1.1);
            }

            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }

            @keyframes zoomIn {
              from {
                opacity: 0;
                transform: scale(0.8);
              }
              to {
                opacity: 1;
                transform: scale(1);
              }
            }

            .markdown-preview img {
              cursor: zoom-in;
              transition: transform 0.2s;
            }

            .markdown-preview img:hover {
              transform: scale(1.02);
            }
          `}</style>
        </div>
      )}
    </>
  );
}
