import { useMemo, useEffect, useRef, useState } from 'react';
import { markdownToHtml } from '../../../lib/markdownToHtml';
import { openUrl } from '@tauri-apps/plugin-opener';
import { ContentTheme, DEFAULT_SETTINGS, isContentTheme } from '../../settings/types';
import { useSettingsStore } from '../../settings/store';

interface PreviewPaneProps {
  content: string;
}

const previewWriteClassByTheme: Record<ContentTheme, string> = {
  miaoyan: 'markdown-body heti',
  inkstone: 'markdown-body heti inkstone-write',
  slate: 'markdown-body heti slate-write',
  mono: 'markdown-body heti mono-write',
  nocturne: 'markdown-body heti nocturne-write',
};

const diagramFontByTheme: Record<ContentTheme, string> = {
  miaoyan: '"TsangerJinKai02-W04"',
  inkstone: '"TsangerJinKai02-W04"',
  slate: '"IBM Plex Sans"',
  mono: '"JetBrains Mono"',
  nocturne: '"Newsreader"',
};

function getCurrentContentTheme(): ContentTheme {
  const theme = document.documentElement.getAttribute('data-content-theme');
  return isContentTheme(theme) ? theme : DEFAULT_SETTINGS.contentTheme;
}

async function waitForDiagramFont(contentTheme: ContentTheme) {
  if (!('fonts' in document)) return;
  try {
    await Promise.all([
      document.fonts.load(`15px ${diagramFontByTheme[contentTheme]}`),
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

    const mermaidConfigByTheme: Record<ContentTheme, {
      theme: 'base' | 'neutral';
      fontSize: number;
      fontFamily: string;
      themeVariables: Record<string, string>;
    }> = {
      // 浅色：妙言（完全复刻 MiaoYan/Resources/DownView.bundle/js/theme-config.js 的 light 配置）
      miaoyan: {
        theme: 'neutral',
        fontSize: 15,
        fontFamily:
          "'TsangerJinKai02 W04', 'TsangerJinKai02', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei UI', 'Microsoft YaHei', Arial, sans-serif",
        themeVariables: {
          background: '#FFFFFF',
          textColor: '#1f2933',
          primaryColor: '#FFFFFF',
          primaryTextColor: '#1f2933',
          primaryBorderColor: '#262626',
          secondaryColor: '#f0f3f6',
          secondaryTextColor: '#1f2933',
          secondaryBorderColor: '#262626',
          tertiaryColor: '#FFFFFF',
          tertiaryTextColor: '#333333',
          tertiaryBorderColor: '#262626',
          lineColor: '#1C5D33',
          mainBkg: '#FFFFFF',
          secondBkg: '#f0f3f6',
          nodeBorder: '#262626',
          nodeBkg: '#FFFFFF',
          clusterBkg: '#f0f3f6',
          clusterBorder: '#262626',
          edgeLabelBackground: 'transparent',
          edgeLabelTextColor: '#1f2933',
          actorBkg: '#FFFFFF',
          actorBorder: '#262626',
          actorTextColor: '#1f2933',
          signalColor: '#1C5D33',
          signalTextColor: '#1f2933',
          noteBkgColor: '#f0f3f6',
          noteBorderColor: '#262626',
          noteTextColor: '#1f2933',
          arrowheadColor: '#1C5D33',
          relationColor: '#1C5D33',
          titleColor: '#1C5D33',
        },
      },
      inkstone: {
        theme: 'base',
        fontSize: 15,
        fontFamily: "'TsangerJinKai02-W04', 'Kaiti SC', 'STKaiti', 'Songti SC', serif",
        themeVariables: {
          background: '#fcfbf7',
          primaryColor: '#fffdf8',
          primaryTextColor: '#24231f',
          primaryBorderColor: '#466f57',
          secondaryColor: '#f0eadf',
          secondaryTextColor: '#24231f',
          secondaryBorderColor: '#d7cebd',
          tertiaryColor: '#f5f1e7',
          tertiaryTextColor: '#6b6355',
          tertiaryBorderColor: '#d7cebd',
          lineColor: '#466f57',
          textColor: '#24231f',
          mainBkg: '#fffdf8',
          nodeBorder: '#466f57',
          clusterBkg: '#f0eadf',
          clusterBorder: '#d7cebd',
          titleColor: '#8f4638',
          edgeLabelBackground: '#fcfbf7',
        },
      },
      slate: {
        theme: 'base',
        fontSize: 14,
        fontFamily: "'IBM Plex Sans', 'PingFang SC', 'Hiragino Sans GB', -apple-system, BlinkMacSystemFont, sans-serif",
        themeVariables: {
          background: '#f7f8f8',
          primaryColor: '#fbfcfc',
          primaryTextColor: '#222829',
          primaryBorderColor: '#587a85',
          secondaryColor: '#e4e9e9',
          secondaryTextColor: '#222829',
          secondaryBorderColor: '#cbd4d5',
          tertiaryColor: '#edf1f1',
          tertiaryTextColor: '#4e5a5c',
          tertiaryBorderColor: '#cbd4d5',
          lineColor: '#587a85',
          textColor: '#222829',
          mainBkg: '#fbfcfc',
          nodeBorder: '#587a85',
          clusterBkg: '#e4e9e9',
          clusterBorder: '#cbd4d5',
          titleColor: '#4f6d7a',
          edgeLabelBackground: '#f7f8f8',
        },
      },
      mono: {
        theme: 'base',
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, 'PingFang SC', monospace",
        themeVariables: {
          background: '#fbfbfa',
          primaryColor: '#fbfbfa',
          primaryTextColor: '#171817',
          primaryBorderColor: '#3b6f48',
          secondaryColor: '#e7ebe4',
          secondaryTextColor: '#171817',
          secondaryBorderColor: '#d4d8d0',
          tertiaryColor: '#f0f3ee',
          tertiaryTextColor: '#4d564c',
          tertiaryBorderColor: '#d4d8d0',
          lineColor: '#3b6f48',
          textColor: '#171817',
          mainBkg: '#fbfbfa',
          nodeBorder: '#3b6f48',
          clusterBkg: '#e7ebe4',
          clusterBorder: '#d4d8d0',
          titleColor: '#6d4c9f',
          edgeLabelBackground: '#fbfbfa',
        },
      },
      nocturne: {
        theme: 'base',
        fontSize: 15,
        fontFamily: "'Newsreader', 'Source Serif 4', 'Songti SC', 'STSong', 'Iowan Old Style', Georgia, serif",
        themeVariables: {
          background: '#171a18',
          primaryColor: '#171a18',
          primaryTextColor: '#e5e1d7',
          primaryBorderColor: '#86a878',
          secondaryColor: '#262b25',
          secondaryTextColor: '#e5e1d7',
          secondaryBorderColor: '#394035',
          tertiaryColor: '#20241f',
          tertiaryTextColor: '#cfc6b5',
          tertiaryBorderColor: '#394035',
          lineColor: '#86a878',
          textColor: '#e5e1d7',
          mainBkg: '#171a18',
          nodeBorder: '#86a878',
          clusterBkg: '#262b25',
          clusterBorder: '#394035',
          titleColor: '#d1ad82',
          edgeLabelBackground: '#20241f',
        },
      },
    };

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
      const mermaidConfig = mermaidConfigByTheme[contentTheme];
      mermaid.initialize({
        startOnLoad: false,
        theme: mermaidConfig.theme,
        themeVariables: mermaidConfig.themeVariables,
        securityLevel: 'loose',
        fontSize: mermaidConfig.fontSize,
        fontFamily: mermaidConfig.fontFamily,
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis',
          nodeSpacing: 80,
          rankSpacing: 80,
          padding: 30,
        },
        sequence: { useMaxWidth: true },
        gantt: { useMaxWidth: true },
        journey: { useMaxWidth: true },
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
        className={previewWriteClassByTheme[contentTheme]}
        style={{
          fontFamily: previewFontFamily === 'inherit' ? undefined : previewFontFamily,
          fontSize: `${previewFontSize}px`,
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
