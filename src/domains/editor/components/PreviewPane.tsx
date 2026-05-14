import { useMemo, useEffect, useRef, useState } from 'react';
import { markdownToHtml } from '../../../lib/markdownToHtml';
import { openUrl } from '@tauri-apps/plugin-opener';
import { ContentTheme, DEFAULT_SETTINGS, isContentTheme } from '../../settings/types';
import { useSettingsStore } from '../../settings/store';
import { getMermaidThemeConfig, getThemeContract } from '../../themes';

interface PreviewPaneProps {
  content: string;
}

function getCurrentContentTheme(): ContentTheme {
  const theme = document.documentElement.getAttribute('data-content-theme');
  return isContentTheme(theme) ? theme : DEFAULT_SETTINGS.contentTheme;
}

async function waitForDiagramFont(contentTheme: ContentTheme) {
  if (!('fonts' in document)) return;
  const fontLoadFamily = getThemeContract(contentTheme).mermaid.fontLoadFamily;
  try {
    await Promise.all([
      document.fonts.load(`15px ${fontLoadFamily}`),
      document.fonts.ready,
    ]);
  } catch {
    // Font loading is a visual enhancement; Mermaid can still render with fallbacks.
  }
}

function normalizeMermaidSvg(svg: SVGSVGElement) {
  svg.style.display = 'block';
  svg.style.marginInline = 'auto';
  svg.style.maxWidth = '100%';
  svg.style.height = 'auto';
  svg.style.overflow = 'visible';
  svg.setAttribute('preserveAspectRatio', 'xMidYMin meet');

  svg.querySelectorAll('foreignObject').forEach((node) => {
    const el = node as SVGGraphicsElement;
    el.style.overflow = 'visible';
    el.setAttribute('overflow', 'visible');
  });

  svg.querySelectorAll<HTMLElement>('.nodeLabel, .edgeLabel, .label, .cluster-label').forEach((label) => {
    label.style.overflow = 'visible';
    label.style.lineHeight = '1.35';
  });

  try {
    const box = svg.getBBox();
    if (box.width > 0 && box.height > 0) {
      const padding = 28;
      const x = Math.floor(box.x - padding);
      const y = Math.floor(box.y - padding);
      const width = Math.ceil(box.width + padding * 2);
      const height = Math.ceil(box.height + padding * 2);
      svg.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
      svg.setAttribute('height', String(height));
    }
  } catch {
    // Some SVGs can throw while fonts/images settle; CSS overflow still prevents most clipping.
  }
}

export function PreviewPane({ content }: PreviewPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [contentTheme, setContentTheme] = useState<ContentTheme>(getCurrentContentTheme);
  const previewFontFamily = useSettingsStore((s) => s.previewFontFamily);
  const previewFontSize = useSettingsStore((s) => s.previewFontSize);

  const html = useMemo(() => {
    try {
      return markdownToHtml(content);
    } catch {
      return '<p>渲染失败</p>';
    }
  }, [content]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const next = getCurrentContentTheme();
      setContentTheme((prev) => (prev === next ? prev : next));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-content-theme'],
    });
    return () => observer.disconnect();
  }, []);

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

    const mermaidConfig = getMermaidThemeConfig(contentTheme);
    let cancelled = false;
    const scheduleRender =
      'requestIdleCallback' in window
        ? (callback: () => void) => {
            const id = window.requestIdleCallback(callback, { timeout: 300 });
            return () => window.cancelIdleCallback(id);
          }
        : (callback: () => void) => {
            const id = window.setTimeout(callback, 0);
            return () => window.clearTimeout(id);
          };

    const cancelScheduledRender = scheduleRender(() => {
      import('mermaid').then(({ default: mermaid }) => {
        if (cancelled) return;
        mermaid.initialize({
          startOnLoad: false,
          ...mermaidConfig,
        });

        placeholders.forEach(async (placeholder, i) => {
          const el = placeholder as HTMLElement;
          const encoded = el.getAttribute('data-mermaid');
          if (!encoded) return;

          const code = decodeURIComponent(encoded);
          const id = `mermaid-${Date.now()}-${i}`;

          try {
            await waitForDiagramFont(contentTheme);
            if (cancelled) return;
            const { svg } = await mermaid.render(id, code);
            if (cancelled) return;
            el.innerHTML = svg;
            el.style.display = 'flex';
            el.style.justifyContent = 'center';
            el.style.margin = '1.5em 0';
            const svgEl = el.querySelector('svg');
            if (svgEl) {
              requestAnimationFrame(() => normalizeMermaidSvg(svgEl));
            }
          } catch (err) {
            el.innerHTML = `<pre style="color: var(--c-ash); font-size: 12px;">Mermaid 渲染失败: ${err}</pre>`;
          }
        });
      });
    });

    return () => {
      cancelled = true;
      cancelScheduledRender();
    };
  }, [html, contentTheme]);

  return (
    <div ref={containerRef} className={`preview-compat preview-compat--${contentTheme}`}>
      <div
        id="write"
        className={getThemeContract(contentTheme).preview.writeClass}
        style={{
          fontFamily: previewFontFamily === 'inherit' ? undefined : previewFontFamily,
          fontSize: `${previewFontSize}px`,
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
