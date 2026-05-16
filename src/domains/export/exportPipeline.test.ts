import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, readFile, stat, writeFile as writeNodeFile } from 'node:fs/promises';
import path from 'node:path';
const mermaidMock = vi.hoisted(() => ({
  initialize: vi.fn(),
  render: vi.fn(async (_id?: string, _code?: string, _container?: Element) => ({
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40"><text>Golden Mermaid</text></svg>',
  })),
}));
const canvasRenderMock = vi.hoisted(() => {
  const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';
  return {
    render: vi.fn(async () => ({
      width: 320,
      height: 200,
      toDataURL: () => dataUrl,
    })),
  };
});
const invokeMock = vi.hoisted(() => vi.fn());

vi.mock('mermaid', () => ({ default: mermaidMock }));
vi.mock('html2canvas', () => ({ default: canvasRenderMock.render }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock }));

import { __exportPipelineTesting, exportDocx, exportHtml, exportPdf, exportPng } from './exportPipeline';
import { resolveExportOptions } from './templates';
import { EXPORT_GOLDEN_DOCX_MARKDOWN, EXPORT_GOLDEN_MARKDOWN } from './goldenFixture';
import type { ExportDocumentInput } from './types';
import { DEFAULT_SETTINGS } from '../settings/types';

const fsMock = vi.hoisted(() => ({
  readFile: vi.fn(async (_path: string) => new Uint8Array()),
  writeFile: vi.fn(async (_path: string, _contents: Uint8Array) => undefined),
  writeTextFile: vi.fn(async (_path: string, _contents: string) => undefined),
}));

vi.mock('@tauri-apps/plugin-fs', () => fsMock);

function createInput(overrides: Partial<ExportDocumentInput> = {}): ExportDocumentInput {
  return {
    content: '# Intro\n\n## Details\n\nBody',
    filename: 'demo.md',
    contentTheme: 'miaoyan',
    templateId: 'theme',
    htmlIncludeTheme: true,
    ...overrides,
  };
}

const COMPLEX_EXPORT_SMOKE_MARKDOWN = `---
title: 导出 Smoke 验收文档
author: Prism QA
date: 2026-05-15
template: academic
paper: a4
margin: standard
toc: true
---

# 导出 Smoke 验收文档

这是一段中文长文内容，用于验证 Prism 的复杂导出。English words 与中文混排，行内公式 $E = mc^2$ 应该正常渲染。

引用占位：[@doe2024]。如果 Pandoc 未检测成功，导出应保留 citekey 占位并给出 warning，不应崩溃。

![本地图片](assets/prism-export-figure.png)

## 表格与任务

| 项目 | 期望 | 状态 |
| --- | --- | --- |
| 中文 | 保留中文字符 | 通过 |
| 表格 | 保留表格结构 | 通过 |
| Mermaid | 导出为图表或图片 | 待检 |

- [x] 已完成的任务
- [ ] 待完成的任务

> 引用块应该有明确层级，不能贴边或丢失正文。

## 代码

\`\`\`ts
const title = 'Prism Export Smoke';
console.log(title);
\`\`\`

## Mermaid

\`\`\`mermaid
graph TD
  A[Markdown] --> B[HTML]
  A --> C[PDF]
  A --> D[PNG]
  A --> E[DOCX]
\`\`\`

## KaTeX

$$
\\int_0^1 x^2 dx = \\frac{1}{3}
$$
`;

function resetFsMockImplementations() {
  fsMock.readFile.mockImplementation(async (_path: string) => new Uint8Array());
  fsMock.writeTextFile.mockImplementation(async (_path: string, _contents: string) => undefined);
  fsMock.writeFile.mockImplementation(async (_path: string, _contents: Uint8Array) => undefined);
}

describe('export pipeline html', () => {
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  let originalFonts: unknown;

  beforeEach(() => {
    fsMock.readFile.mockClear();
    fsMock.writeTextFile.mockClear();
    fsMock.writeFile.mockClear();
    mermaidMock.initialize.mockClear();
    mermaidMock.render.mockClear();
    invokeMock.mockReset();
    originalFonts = (document as any).fonts;
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { ready: Promise.resolve() },
    });
    globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      window.setTimeout(() => callback(performance.now()), 0);
      return 1;
    }) as typeof requestAnimationFrame;
  });

  afterEach(() => {
    if (originalRequestAnimationFrame) {
      globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    } else {
      delete (globalThis as Partial<typeof globalThis>).requestAnimationFrame;
    }
    if (originalFonts) {
      Object.defineProperty(document, 'fonts', {
        configurable: true,
        value: originalFonts,
      });
    } else {
      delete (document as any).fonts;
    }
  });

  it('injects a table of contents and heading anchors when toc is enabled', async () => {
    await exportHtml(createInput({
      toc: true,
      title: 'Export Title',
      author: 'Alex',
      date: '2026-05-15',
    }), '/tmp/demo.html');

    expect(fsMock.writeTextFile).toHaveBeenCalledTimes(1);
    const html = fsMock.writeTextFile.mock.calls[0][1] as string;
    expect(html).toContain('<title>Export Title</title>');
    expect(html).toContain('<meta name="author" content="Alex">');
    expect(html).toContain('<meta name="date" content="2026-05-15">');
    expect(html).toContain('class="prism-export-toc"');
    expect(html).toContain('href="#intro"');
    expect(html).toContain('href="#details"');
    expect(html).toContain('id="intro"');
    expect(html).toContain('id="details"');
  });

  it('does not inject toc markup when toc is disabled', async () => {
    await exportHtml(createInput({ toc: false }), '/tmp/demo.html');

    const html = fsMock.writeTextFile.mock.calls[0][1] as string;
    expect(html).not.toContain('<nav class="prism-export-toc"');
    expect(html).not.toContain('href="#intro"');
  });

  it('exports the golden markdown fixture with front matter, toc, rich blocks, and rendered mermaid', async () => {
    const options = resolveExportOptions({
      content: EXPORT_GOLDEN_MARKDOWN,
      filename: 'golden.md',
      settings: {
        ...DEFAULT_SETTINGS,
        contentTheme: 'miaoyan',
        exportDefaults: {
          ...DEFAULT_SETTINGS.exportDefaults,
          frontMatterOverrides: true,
          htmlIncludeTheme: true,
        },
      },
    });

    await exportHtml(options, '/tmp/golden.html');

    const html = fsMock.writeTextFile.mock.calls[0][1] as string;
    expect(html).toContain('<title>导出验收文档</title>');
    expect(html).toContain('<meta name="author" content="Prism QA">');
    expect(html).toContain('<meta name="date" content="2026-05-15">');
    expect(html).toContain('class="prism-export-toc"');
    expect(html).toContain('<span>导出验收文档</span>');
    expect(html).toContain('id="导出验收文档"');
    expect(html).toContain('<table');
    expect(html).toContain('<th>项目</th>');
    expect(html).toContain('class="hljs language-ts"');
    expect(html).toContain('class="katex');
    expect(html).toContain('Golden Mermaid');
    expect(html).not.toContain('template: business');
    expect(mermaidMock.render).toHaveBeenCalledTimes(1);
  });

  it('reports diagnostic progress stages for html export', async () => {
    const onProgress = vi.fn();

    await exportHtml(createInput({
      content: '# Intro\n\n```mermaid\ngraph TD\nA-->B\n```',
      onProgress,
    }), '/tmp/progress.html');

    expect(onProgress.mock.calls.map(([message]) => message)).toEqual([
      '正在解析 Markdown',
      '正在应用导出主题',
      '正在渲染图表',
      '正在生成 HTML 文件',
      '正在写入 HTML 文件',
    ]);
  });

  it('inlines relative local svg images from the markdown document directory', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><text>Local SVG</text></svg>';
    fsMock.readFile.mockImplementationOnce(async (targetPath: string) => {
      expect(targetPath).toBe('/tmp/prism-doc/assets/logo.svg');
      return new TextEncoder().encode(svg);
    });

    await exportHtml(createInput({
      content: '# Local image\n\n![Logo](assets/logo.svg)',
      documentPath: '/tmp/prism-doc/article.md',
    } as Partial<ExportDocumentInput>), '/tmp/local-svg.html');

    const html = fsMock.writeTextFile.mock.calls[0][1] as string;
    expect(fsMock.readFile).toHaveBeenCalledWith('/tmp/prism-doc/assets/logo.svg');
    expect(html).toContain('src="data:image/svg+xml;base64,');
    expect(Buffer.from(html.match(/src="data:image\/svg\+xml;base64,([^"]+)"/)?.[1] ?? '', 'base64').toString('utf8'))
      .toContain('Local SVG');
    expect(html).not.toContain('src="assets/logo.svg"');
    expect(html).not.toContain('<div id="root"></div>');
  });

  it('isolates Mermaid parser error artifacts during html export', async () => {
    let renderContainer: Element | undefined;
    let sandboxWasConnectedDuringRender = false;
    mermaidMock.render.mockImplementationOnce(async (_id, _code, container?: Element) => {
      renderContainer = container;
      sandboxWasConnectedDuringRender = container?.isConnected ?? false;
      const artifact = document.createElement('svg');
      artifact.dataset.testid = 'mermaid-export-error-artifact';
      artifact.textContent = 'Syntax error in text';
      (container ?? document.body).appendChild(artifact);
      throw new Error('Syntax error in text');
    });

    await exportHtml(createInput({
      content: '# Bad diagram\n\n```mermaid\ngraph TD\n  A -->\n```',
    }), '/tmp/bad-mermaid.html');

    expect(renderContainer).toBeInstanceOf(HTMLElement);
    expect((renderContainer as HTMLElement).dataset.prismExportMermaidSandbox).toBe('true');
    expect(sandboxWasConnectedDuringRender).toBe(true);
    expect((renderContainer as HTMLElement).isConnected).toBe(false);
    expect(document.body.querySelector('[data-testid="mermaid-export-error-artifact"]')).toBeNull();
    const html = fsMock.writeTextFile.mock.calls[0][1] as string;
    expect(html).toContain('Mermaid 渲染失败');
    expect(html).toContain('Syntax error in text');
  });

  it('uses pandoc citeproc html when HTML export has detected pandoc and bibliography settings', async () => {
    const onWarning = vi.fn();
    invokeMock.mockResolvedValueOnce({
      html: '<p>研究参考 <span class="citation">Doe 2024</span>。</p><section id="refs"></section>',
      warnings: 'pandoc citeproc warning',
    });

    await exportHtml(createInput({
      content: '研究参考 [@doe2024]。',
      citation: {
        bibliographyPath: '/tmp/library.bib',
        cslStylePath: '/tmp/chinese-gb7714.csl',
      },
      pandoc: {
        path: '/opt/homebrew/bin/pandoc',
        detected: true,
        version: 'pandoc 3.2.1',
        lastCheckedAt: 123,
        lastError: '',
      },
      onWarning,
    }), '/tmp/citation.html');

    expect(invokeMock).toHaveBeenCalledWith('render_citations_with_pandoc', {
      path: '/opt/homebrew/bin/pandoc',
      markdown: '研究参考 [@doe2024]。',
      bibliographyPath: '/tmp/library.bib',
      cslStylePath: '/tmp/chinese-gb7714.csl',
    });
    const html = fsMock.writeTextFile.mock.calls[0][1] as string;
    expect(html).toContain('Doe 2024');
    expect(html).not.toContain('[@doe2024]');
    expect(onWarning).toHaveBeenCalledWith('pandoc citeproc warning');
    expect(onWarning).not.toHaveBeenCalledWith(expect.stringContaining('占位形式保留'));
  });

  it('sanitizes unsafe html returned by pandoc before writing html export output', async () => {
    invokeMock.mockResolvedValueOnce({
      html: [
        '<p>',
        '<a href="javascript:alert(1)" onclick="alert(2)">bad link</a>',
        '<a href="https://example.com/ref">safe link</a>',
        '<img src="javascript:alert(3)" onerror="alert(4)" style="width: 999px" alt="bad image">',
        '<script>alert(5)</script>',
        '</p>',
      ].join(''),
      warnings: '',
    });

    await exportHtml(createInput({
      content: '研究参考 [@doe2024]。',
      citation: {
        bibliographyPath: '/tmp/library.bib',
        cslStylePath: '',
      },
      pandoc: {
        path: '/opt/homebrew/bin/pandoc',
        detected: true,
        version: 'pandoc 3.2.1',
        lastCheckedAt: 123,
        lastError: '',
      },
    }), '/tmp/citation.html');

    const html = fsMock.writeTextFile.mock.calls[0][1] as string;
    expect(html).toContain('bad link');
    expect(html).toContain('href="https://example.com/ref"');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('width: 999px');
  });

  it('falls back to built-in HTML export when pandoc citation rendering fails', async () => {
    const onWarning = vi.fn();
    invokeMock.mockRejectedValueOnce(new Error('citeproc failed'));

    await exportHtml(createInput({
      content: '研究参考 [@doe2024]。',
      citation: {
        bibliographyPath: '/tmp/library.bib',
        cslStylePath: '',
      },
      pandoc: {
        path: '',
        detected: true,
        version: 'pandoc 3.2.1',
        lastCheckedAt: 123,
        lastError: '',
      },
      onWarning,
    }), '/tmp/citation.html');

    const html = fsMock.writeTextFile.mock.calls[0][1] as string;
    expect(html).toContain('[@doe2024]');
    expect(onWarning).toHaveBeenCalledWith(expect.stringContaining('已回退内置导出'));
    expect(onWarning).toHaveBeenCalledWith(expect.stringContaining('citeproc failed'));
  });

  it('warns when built-in export keeps configured citations as placeholders', async () => {
    const onWarning = vi.fn();

    await exportHtml(createInput({
      content: '研究参考 [@doe2024]。',
      citation: {
        bibliographyPath: '/tmp/library.bib',
        cslStylePath: '/tmp/chinese-gb7714.csl',
      },
      onWarning,
    }), '/tmp/citation.html');

    expect(onWarning).toHaveBeenCalledWith(expect.stringContaining('Pandoc 未检测成功'));
    expect(onWarning).toHaveBeenCalledWith(expect.stringContaining('请在设置中心检测 Pandoc'));
  });

  it('explains when CSL is configured without a bibliography file', async () => {
    const onWarning = vi.fn();

    await exportHtml(createInput({
      content: '研究参考 [@doe2024]。',
      citation: {
        bibliographyPath: '',
        cslStylePath: '/tmp/chinese-gb7714.csl',
      },
      onWarning,
    }), '/tmp/citation.html');

    expect(onWarning).toHaveBeenCalledWith('已配置 CSL 样式，但缺少参考文献文件；当前导出会保留 citekey 占位。');
  });

  it('explains unsupported citation path suffixes before falling back', async () => {
    const onWarning = vi.fn();

    await exportHtml(createInput({
      content: '研究参考 [@doe2024]。',
      citation: {
        bibliographyPath: '/tmp/references.txt',
        cslStylePath: '/tmp/style.json',
      },
      pandoc: {
        path: '/opt/homebrew/bin/pandoc',
        detected: true,
        version: 'pandoc 3.2.1',
        lastCheckedAt: 123,
        lastError: '',
      },
      onWarning,
    }), '/tmp/citation.html');

    expect(invokeMock).not.toHaveBeenCalled();
    expect(onWarning).toHaveBeenCalledWith(expect.stringContaining('参考文献文件后缀需要是 .bib、.bibtex 或 .json'));
  });

  it('does not warn about citations when bibliography settings are empty', async () => {
    const onWarning = vi.fn();

    await exportHtml(createInput({
      content: '研究参考 [@doe2024]。',
      citation: {
        bibliographyPath: '',
        cslStylePath: '',
      },
      onWarning,
    }), '/tmp/citation.html');

    expect(onWarning).not.toHaveBeenCalled();
  });
});

describe('export pipeline pdf page numbers', () => {
  it('formats page number labels and keeps them inside the bottom margin', () => {
    expect(__exportPipelineTesting.getPdfPageNumberLabel(0, 3)).toBe('1 / 3');
    expect(__exportPipelineTesting.getPdfPageNumberLabel(2, 3)).toBe('3 / 3');
    expect(__exportPipelineTesting.getPdfPageNumberY(40)).toBe(14);
    expect(__exportPipelineTesting.getPdfPageNumberY(120)).toBe(28);
  });

  it('formats pdf header and footer token text', () => {
    expect(__exportPipelineTesting.formatPdfHeaderFooterText(
      '{title} · {author} · {page}/{pages}',
      createInput({ title: '季度报告', author: 'Alex' }),
      1,
      6,
    )).toBe('季度报告 · Alex · 2/6');
    expect(__exportPipelineTesting.formatPdfHeaderFooterText(
      '{filename} {date}',
      createInput({ filename: 'demo.md', date: '2026-05-15' }),
      0,
      1,
    )).toBe('demo.md 2026-05-15');
    expect(__exportPipelineTesting.normalizePdfChromeText(` ${'x'.repeat(200)} `)).toHaveLength(160);
  });

  it('positions pdf header and footer inside page margins', () => {
    expect(__exportPipelineTesting.getPdfHeaderY(841.89, 51, 14)).toBeCloseTo(809.39);
    expect(__exportPipelineTesting.getPdfFooterY(57)).toBeCloseTo(19.95);
  });
});

describe('export pipeline raster CSS compatibility', () => {
  it('removes modern color function declarations before html2canvas rendering', () => {
    const css = `
      .preview-compat {
        --preview-search-match-bg: color-mix(in srgb, #1c5d33 15%, transparent);
        color: #262626;
        box-shadow: 0 0 0 3px color-mix(in srgb, #1c5d33 18%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.28);
      }
      .prism-export-document {
        background: color(display-p3 1 1 1);
        border: 1px solid #dddddd;
      }
    `;

    const safeCss = __exportPipelineTesting.stripRasterUnsafeColorDeclarations(css);

    expect(safeCss).not.toContain('color-mix(');
    expect(safeCss).not.toContain('color(display-p3');
    expect(safeCss).toContain('color: #262626;');
    expect(safeCss).toContain('border: 1px solid #dddddd;');
  });

  it('normalizes WebKit color functions before html2canvas reads computed styles', () => {
    expect(
      __exportPipelineTesting.normalizeCssColorFunctionsForRaster('color(srgb 1 0.5 0 / 75%)'),
    ).toBe('rgba(255, 128, 0, 0.75)');
    expect(
      __exportPipelineTesting.normalizeCssColorFunctionsForRaster(
        '0 0 0 1px color(display-p3 0.1 0.2 0.3)',
      ),
    ).toBe('0 0 0 1px rgb(26, 51, 77)');
  });
});

describe('export pipeline image progress', () => {
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalImage = globalThis.Image;
  const originalCreateElement = document.createElement.bind(document);
  let createElementSpy: { mockRestore: () => void } | null = null;
  let getContextSpy: { mockRestore: () => void } | null = null;
  let toDataUrlSpy: { mockRestore: () => void } | null = null;
  let originalFonts: unknown;

  beforeEach(() => {
    fsMock.writeFile.mockClear();
    fsMock.writeTextFile.mockClear();
    mermaidMock.initialize.mockClear();
    mermaidMock.render.mockClear();
    canvasRenderMock.render.mockClear();
    originalFonts = (document as any).fonts;
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { ready: Promise.resolve() },
    });
    globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      window.setTimeout(() => callback(performance.now()), 0);
      return 1;
    }) as typeof requestAnimationFrame;
    createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: any, options?: any) => {
      const element = originalCreateElement(tagName, options);
      if (String(tagName).toLowerCase() === 'iframe') {
        Object.defineProperty(element, 'srcdoc', {
          configurable: true,
          get: () => '',
          set: (value: string) => {
            window.setTimeout(() => {
              const frameDocument = (element as HTMLIFrameElement).contentDocument;
              if (frameDocument) {
                frameDocument.open();
                frameDocument.write(value);
                frameDocument.close();
              }
              (element as HTMLIFrameElement).onload?.(new Event('load'));
            }, 0);
          },
        });
      }
      return element;
    });
    globalThis.Image = class {
      width = 320;
      height = 200;
      onload: ((event: Event) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;

      set src(_value: string) {
        window.setTimeout(() => this.onload?.(new Event('load')), 0);
      }
    } as typeof Image;
    getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      scale: vi.fn(),
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn((text: string) => ({ width: text.length * 7 })),
    } as unknown as CanvasRenderingContext2D);
    toDataUrlSpy = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation((type?: string) => (
      type === 'image/jpeg'
        ? 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2w=='
        : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='
    ));
  });

  afterEach(() => {
    if (originalRequestAnimationFrame) {
      globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    } else {
      delete (globalThis as Partial<typeof globalThis>).requestAnimationFrame;
    }
    globalThis.Image = originalImage;
    createElementSpy?.mockRestore();
    createElementSpy = null;
    getContextSpy?.mockRestore();
    getContextSpy = null;
    toDataUrlSpy?.mockRestore();
    toDataUrlSpy = null;
    if (originalFonts) {
      Object.defineProperty(document, 'fonts', {
        configurable: true,
        value: originalFonts,
      });
    } else {
      delete (document as any).fonts;
    }
  });

  it('renders the golden markdown fixture through png and pdf image exports', async () => {
    const options = resolveExportOptions({
      content: EXPORT_GOLDEN_MARKDOWN,
      filename: 'golden.md',
      settings: {
        ...DEFAULT_SETTINGS,
        contentTheme: 'miaoyan',
        exportDefaults: {
          ...DEFAULT_SETTINGS.exportDefaults,
          frontMatterOverrides: true,
          htmlIncludeTheme: true,
        },
      },
    });

    await exportPng(options, '/tmp/golden.png');
    await exportPdf(options, '/tmp/golden.pdf');

    expect(fsMock.writeFile.mock.calls.map(([path]) => path)).toEqual([
      '/tmp/golden.png',
      '/tmp/golden.pdf',
    ]);
    expect(canvasRenderMock.render).toHaveBeenCalledTimes(2);
    expect(mermaidMock.render).toHaveBeenCalledTimes(2);
  });

  it('reports diagnostic progress stages for png export', async () => {
    const onProgress = vi.fn();

    await exportPng(createInput({ onProgress }), '/tmp/progress.png');

    expect(onProgress.mock.calls.map(([message]) => message)).toEqual([
      '正在解析 Markdown',
      '正在应用导出主题',
      '正在渲染图表',
      '正在生成 PNG 文件',
      '正在写入 PNG 文件',
    ]);
    expect(canvasRenderMock.render).toHaveBeenCalled();
  });

  it('does not reload the generated png data url to determine export size', async () => {
    fsMock.writeFile.mockClear();
    globalThis.Image = class {
      onload: ((event: Event) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;

      set src(_value: string) {
        window.setTimeout(() => this.onerror?.(new Event('error')), 0);
      }
    } as typeof Image;
    canvasRenderMock.render.mockResolvedValueOnce({
      width: 640,
      height: 1200,
      toDataURL: () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
    });

    await exportPng(createInput(), '/tmp/no-reload.png');

    expect(fsMock.writeFile).toHaveBeenCalledWith('/tmp/no-reload.png', expect.any(Uint8Array));
  });

  it('caps raster export scale for very tall documents', () => {
    expect(__exportPipelineTesting.getSafeRasterScale(980, 60_000, 2)).toBeLessThan(0.3);
    expect(__exportPipelineTesting.getSafeRasterScale(980, 2_000, 2)).toBe(2);
  });

  it('reports diagnostic progress stages for pdf export', async () => {
    const onProgress = vi.fn();

    await exportPdf(createInput({ onProgress }), '/tmp/progress.pdf');

    expect(onProgress.mock.calls.map(([message]) => message)).toEqual([
      '正在解析 Markdown',
      '正在应用导出主题',
      '正在渲染图表',
      '正在生成 PDF 文件',
      '正在写入 PDF 文件',
    ]);
    expect(canvasRenderMock.render).toHaveBeenCalled();
  });

  it('writes complex export smoke artifacts for all supported formats', async () => {
    const outDir = path.resolve(process.cwd(), '.codex-smoke/complex-export/out');
    const outputPaths = {
      html: path.join(outDir, 'complex-export.html'),
      pdf: path.join(outDir, 'complex-export.pdf'),
      png: path.join(outDir, 'complex-export.png'),
      docx: path.join(outDir, 'complex-export.docx'),
    };
    const warnings: string[] = [];

    await mkdir(outDir, { recursive: true });
    fsMock.writeTextFile.mockImplementation(async (targetPath: string, contents: string) => {
      await mkdir(path.dirname(targetPath), { recursive: true });
      await writeNodeFile(targetPath, contents, 'utf8');
    });
    fsMock.writeFile.mockImplementation(async (targetPath: string, contents: Uint8Array) => {
      await mkdir(path.dirname(targetPath), { recursive: true });
      await writeNodeFile(targetPath, Buffer.from(contents));
    });

    try {
      const options = resolveExportOptions({
        content: COMPLEX_EXPORT_SMOKE_MARKDOWN,
        filename: 'complex-export.md',
        settings: {
          ...DEFAULT_SETTINGS,
          contentTheme: 'miaoyan',
          exportDefaults: {
            ...DEFAULT_SETTINGS.exportDefaults,
            frontMatterOverrides: true,
            htmlIncludeTheme: true,
            toc: true,
            pageHeaderFooter: true,
            pageHeaderText: '{title}',
            pageFooterText: '{filename} · {page}/{pages}',
            pdfPageNumbers: true,
          },
          citation: {
            bibliographyPath: '/tmp/prism-smoke-library.bib',
            cslStylePath: '',
          },
          pandoc: {
            ...DEFAULT_SETTINGS.pandoc,
            lastError: 'pandoc command not found',
          },
        },
        onWarning: (message) => warnings.push(message),
      });

      await exportHtml(options, outputPaths.html);
      await exportPdf(options, outputPaths.pdf);
      await exportPng(options, outputPaths.png);
      await exportDocx(options, outputPaths.docx);

      for (const targetPath of Object.values(outputPaths)) {
        expect((await stat(targetPath)).size).toBeGreaterThan(0);
      }

      const html = await readFile(outputPaths.html, 'utf8');
      expect(html).toContain('<title>导出 Smoke 验收文档</title>');
      expect(html).toContain('class="prism-export-toc"');
      expect(html).toContain('<table');
      expect(html).toContain('Golden Mermaid');
      expect(html).toContain('class="katex');
      expect(html).toContain('assets/prism-export-figure.png');
      expect(html).toContain('[@doe2024]');

      const { PDFDocument } = await import('pdf-lib');
      const pdf = await PDFDocument.load(new Uint8Array(await readFile(outputPaths.pdf)));
      expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
      expect(pdf.getPage(0).getWidth()).toBeCloseTo(595.28, 1);
      expect(pdf.getPage(0).getHeight()).toBeCloseTo(841.89, 1);

      const pngBytes = await readFile(outputPaths.png);
      expect(Array.from(pngBytes.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);

      const { default: JSZip } = await import('jszip');
      const docx = await JSZip.loadAsync(await readFile(outputPaths.docx));
      const documentXml = await docx.file('word/document.xml')?.async('string');
      const mediaFiles = Object.keys(docx.files).filter((filePath) => filePath.startsWith('word/media/'));
      expect(documentXml).toContain('导出 Smoke 验收文档');
      expect(documentXml).toContain('Prism Export Smoke');
      expect(documentXml).toContain('项目');
      expect(documentXml).not.toContain('graph TD');
      expect(mediaFiles.some((filePath) => /\.(png|jpe?g|svg)$/.test(filePath))).toBe(true);

      expect(warnings.some((message) => message.includes('Pandoc 未检测成功'))).toBe(true);
    } finally {
      resetFsMockImplementations();
    }
  });
});

describe('export pipeline docx header and footer', () => {
  const originalImage = globalThis.Image;
  let getContextSpy: { mockRestore: () => void } | null = null;
  let toDataUrlSpy: { mockRestore: () => void } | null = null;

  beforeEach(() => {
    fsMock.readFile.mockClear();
    globalThis.Image = class {
      onload: ((event: Event) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;

      set src(_value: string) {
        window.setTimeout(() => this.onload?.(new Event('load')), 0);
      }
    } as typeof Image;
    getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      scale: vi.fn(),
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn((text: string) => ({ width: text.length * 7 })),
    } as unknown as CanvasRenderingContext2D);
    toDataUrlSpy = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation((type?: string) => (
      type === 'image/jpeg'
        ? 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2w=='
        : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='
    ));
  });

  afterEach(() => {
    globalThis.Image = originalImage;
    getContextSpy?.mockRestore();
    getContextSpy = null;
    toDataUrlSpy?.mockRestore();
    toDataUrlSpy = null;
  });

  it('writes configured header and footer tokens to docx parts', async () => {
    fsMock.writeFile.mockClear();

    await exportDocx(createInput({
      title: '季度报告',
      pageHeaderFooter: true,
      pageHeaderText: '{title}',
      pageFooterText: '{filename} · {page}/{pages}',
      pdfPageNumbers: false,
    }), '/tmp/demo.docx');

    const { default: JSZip } = await import('jszip');
    const bytes = fsMock.writeFile.mock.calls[0][1] as Uint8Array;
    const zip = await JSZip.loadAsync(bytes);
    const headerXml = await zip.file('word/header1.xml')?.async('string');
    const footerXml = await zip.file('word/footer1.xml')?.async('string');

    expect(headerXml).toContain('季度报告');
    expect(footerXml).toContain('demo.md');
    expect(footerXml).toContain('PAGE');
    expect(footerXml).toContain('NUMPAGES');
  });

  it('exports the docx golden fixture with toc, table, code, and chinese text', async () => {
    fsMock.writeFile.mockClear();

    await exportDocx(createInput({
      content: EXPORT_GOLDEN_DOCX_MARKDOWN,
      title: '导出验收文档',
      toc: true,
      pageHeaderFooter: true,
      pageHeaderText: '{title}',
      pageFooterText: '{filename}',
      pdfPageNumbers: true,
    }), '/tmp/golden.docx');

    const { default: JSZip } = await import('jszip');
    const bytes = fsMock.writeFile.mock.calls[0][1] as Uint8Array;
    const zip = await JSZip.loadAsync(bytes);
    const documentXml = await zip.file('word/document.xml')?.async('string');
    const headerXml = await zip.file('word/header1.xml')?.async('string');
    const footerXml = await zip.file('word/footer1.xml')?.async('string');
    const mediaFiles = Object.keys(zip.files).filter((path) => path.startsWith('word/media/'));

    expect(documentXml).toContain('目录');
    expect(documentXml).toContain('导出验收文档');
    expect(documentXml).toContain('项目');
    expect(documentXml).toContain('const title');
    expect(documentXml).not.toContain('graph TD');
    expect(mediaFiles.some((path) => /\.(png|jpe?g|svg)$/.test(path))).toBe(true);
    expect(headerXml).toContain('导出验收文档');
    expect(footerXml).toContain('demo.md');
    expect(footerXml).toContain('PAGE');
    expect(footerXml).toContain('NUMPAGES');
    expect(mermaidMock.render).toHaveBeenCalled();
  });

  it('exports GFM task lists as readable checked and unchecked items in docx', async () => {
    fsMock.writeFile.mockClear();

    await exportDocx(createInput({
      content: '# 任务\n\n- [x] 已完成\n- [ ] 待确认\n',
    }), '/tmp/tasks.docx');

    const { default: JSZip } = await import('jszip');
    const bytes = fsMock.writeFile.mock.calls[0][1] as Uint8Array;
    const zip = await JSZip.loadAsync(bytes);
    const documentXml = await zip.file('word/document.xml')?.async('string');

    expect(documentXml).toContain('☑');
    expect(documentXml).toContain('已完成');
    expect(documentXml).toContain('☐');
    expect(documentXml).toContain('待确认');
  });

  it('embeds relative local svg images in docx output', async () => {
    fsMock.writeFile.mockClear();
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120"><text>Local Docx SVG</text></svg>';
    fsMock.readFile.mockImplementationOnce(async (targetPath: string) => {
      expect(targetPath).toBe('/tmp/prism-doc/assets/logo.svg');
      return new TextEncoder().encode(svg);
    });

    await exportDocx(createInput({
      content: '# Local image\n\n![Logo](assets/logo.svg)',
      documentPath: '/tmp/prism-doc/article.md',
    } as Partial<ExportDocumentInput>), '/tmp/image.docx');

    const { default: JSZip } = await import('jszip');
    const bytes = fsMock.writeFile.mock.calls[0][1] as Uint8Array;
    const zip = await JSZip.loadAsync(bytes);
    const documentXml = await zip.file('word/document.xml')?.async('string');
    const mediaFiles = Object.keys(zip.files).filter((filePath) => filePath.startsWith('word/media/'));

    expect(fsMock.readFile).toHaveBeenCalledWith('/tmp/prism-doc/assets/logo.svg');
    expect(documentXml).toContain('<w:drawing>');
    expect(mediaFiles.some((filePath) => /\.jpe?g$/.test(filePath))).toBe(true);
    expect(mediaFiles.some((filePath) => /\.svg$/.test(filePath))).toBe(false);
  });

  it('rasterizes Mermaid foreignObject labels for docx output', async () => {
    fsMock.writeFile.mockClear();
    mermaidMock.render.mockResolvedValueOnce({
      svg: [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80">',
        '<g class="node" transform="translate(60,40)">',
        '<rect x="-40" y="-20" width="80" height="40"></rect>',
        '<g class="label" transform="translate(-18,-10)">',
        '<foreignObject width="36" height="20">',
        '<div xmlns="http://www.w3.org/1999/xhtml"><span class="nodeLabel"><p>节点</p></span></div>',
        '</foreignObject>',
        '</g>',
        '</g>',
        '</svg>',
      ].join(''),
    });

    await exportDocx(createInput({
      content: '# Mermaid\n\n```mermaid\ngraph TD\nA[节点]-->B[结束]\n```',
    }), '/tmp/mermaid.docx');

    const { default: JSZip } = await import('jszip');
    const bytes = fsMock.writeFile.mock.calls[0][1] as Uint8Array;
    const zip = await JSZip.loadAsync(bytes);
    const mediaFiles = Object.keys(zip.files).filter((filePath) => filePath.startsWith('word/media/'));
    const documentXml = await zip.file('word/document.xml')?.async('string');

    expect(documentXml).toContain('<w:drawing>');
    expect(mediaFiles.some((filePath) => /\.jpe?g$/.test(filePath))).toBe(true);
    expect(mediaFiles.some((filePath) => /\.svg$/.test(filePath))).toBe(false);
  });

  it('reports diagnostic progress stages for docx export', async () => {
    fsMock.writeFile.mockClear();
    mermaidMock.render.mockClear();
    const onProgress = vi.fn();

    await exportDocx(createInput({
      content: '# Intro\n\n```mermaid\ngraph TD\nA-->B\n```',
      onProgress,
    }), '/tmp/progress.docx');

    expect(onProgress.mock.calls.map(([message]) => message)).toEqual([
      '正在解析 Markdown',
      '正在应用导出主题',
      '正在渲染图表',
      '正在生成 Word 文件',
      '正在写入 Word 文件',
    ]);
    expect(mermaidMock.render).toHaveBeenCalled();
  });

  it('isolates Mermaid parser error artifacts during docx image rendering retries', async () => {
    fsMock.writeFile.mockClear();
    mermaidMock.render.mockClear();
    let renderContainer: Element | undefined;
    let sandboxWasConnectedDuringRender = false;
    mermaidMock.render.mockImplementationOnce(async (_id, _code, container?: Element) => {
      renderContainer = container;
      sandboxWasConnectedDuringRender = container?.isConnected ?? false;
      const artifact = document.createElement('svg');
      artifact.dataset.testid = 'mermaid-docx-error-artifact';
      artifact.textContent = 'Syntax error in text';
      (container ?? document.body).appendChild(artifact);
      throw new Error('Syntax error in text');
    });

    await exportDocx(createInput({
      content: '# Intro\n\n```mermaid\ngraph TD\n  A --> B\n```',
    }), '/tmp/retry.docx');

    expect(renderContainer).toBeInstanceOf(HTMLElement);
    expect((renderContainer as HTMLElement).dataset.prismExportMermaidSandbox).toBe('true');
    expect(sandboxWasConnectedDuringRender).toBe(true);
    expect((renderContainer as HTMLElement).isConnected).toBe(false);
    expect(document.body.querySelector('[data-testid="mermaid-docx-error-artifact"]')).toBeNull();
    expect(mermaidMock.render).toHaveBeenCalledTimes(2);
    expect(fsMock.writeFile).toHaveBeenCalledTimes(1);
  });
});
