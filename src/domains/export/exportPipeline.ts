import { writeFile, writeTextFile } from '@tauri-apps/plugin-fs';
import type {
  Paragraph as DocxParagraph,
  Table as DocxTable,
  TextRun as DocxTextRun,
} from 'docx';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { markdownToHtml } from '../../lib/markdownToHtml';
import type { ContentTheme } from '../settings/types';
import type { ExportDocumentInput } from './types';
import {
  docxThemeByContentTheme,
  mermaidFontByTheme,
  writeClassByTheme,
  type DocxTheme,
} from './exportSettings';

type DocxModule = typeof import('docx');
type DocxBlock = DocxParagraph | DocxTable;
type DocxInline = DocxTextRun | InstanceType<DocxModule['ImageRun']>;

function stripMarkdownExtension(filename: string) {
  return filename.replace(/\.(md|markdown|txt)$/i, '') || 'Untitled';
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function reportProgress(input: ExportDocumentInput, message: string) {
  input.onProgress?.(message);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function dataUrlToBytes(dataUrl: string) {
  const [, base64 = ''] = dataUrl.split(',');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function getImageSize(dataUrl: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error('导出图像尺寸读取失败'));
    image.src = dataUrl;
  });
}

function isMermaidSource(value: string, lang?: string | null) {
  const normalizedLang = (lang ?? '').trim().toLowerCase();
  if (normalizedLang === 'mermaid' || normalizedLang === 'mmd') return true;
  const source = value.trimStart();
  return /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|mindmap|timeline|quadrantChart|requirementDiagram|gitGraph|C4Context)\b/.test(source);
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function inlineCssUrls(css: string) {
  const pattern = /url\((['"]?)([^'")]+)\1\)/g;
  const urls = Array.from(css.matchAll(pattern))
    .map((match) => match[2])
    .filter((url) => !url.startsWith('data:') && !url.startsWith('#') && !url.startsWith('about:'));
  const uniqueUrls = Array.from(new Set(urls));
  const replacements = new Map<string, string>();

  for (const rawUrl of uniqueUrls) {
    try {
      const absoluteUrl = new URL(rawUrl, document.baseURI).toString();
      const response = await fetch(absoluteUrl);
      if (!response.ok) continue;
      const blob = await response.blob();
      replacements.set(rawUrl, await blobToDataUrl(blob));
    } catch {
      // Export CSS can still work with system fallbacks if an asset cannot be inlined.
    }
  }

  return css.replace(pattern, (full, quote, rawUrl) => {
    const replacement = replacements.get(rawUrl);
    return replacement ? `url(${quote}${replacement}${quote})` : full;
  });
}

async function collectExportCss() {
  let css = '';
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      css += Array.from(sheet.cssRules).map((rule) => rule.cssText).join('\n');
    } catch {
      // Cross-origin stylesheets are ignored; Prism's bundled CSS is same-origin.
    }
  }

  css += `
    html, body {
      min-height: 100%;
      height: auto !important;
      overflow: auto !important;
    }
    body {
      margin: 0;
      background: var(--bg-preview, #fff);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .prism-export-document {
      position: static !important;
      min-height: 100vh;
      height: auto !important;
      overflow: visible !important;
      background: var(--bg-preview, #fff);
    }
    .prism-export-document #write {
      min-height: auto !important;
      padding-top: 44px !important;
      padding-bottom: 56px !important;
    }
    @page { margin: 18mm 18mm 20mm; }
    @media print {
      body { background: #fff !important; }
      .prism-export-document { background: #fff !important; }
      .prism-export-document #write {
        max-width: none !important;
        padding: 0 !important;
      }
      pre, blockquote, table, figure, .mermaid-placeholder { break-inside: avoid; }
    }
  `;

  return inlineCssUrls(css);
}

function getMermaidConfig(contentTheme: ContentTheme) {
  const shared = {
    theme: contentTheme === 'miaoyan' ? 'neutral' as const : 'base' as const,
    securityLevel: 'loose' as const,
    fontSize: contentTheme === 'mono' ? 13 : contentTheme === 'slate' ? 14 : 15,
    fontFamily: mermaidFontByTheme[contentTheme],
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
  };

  const variables: Record<ContentTheme, Record<string, string>> = {
    miaoyan: {
      background: '#FFFFFF',
      textColor: '#1f2933',
      primaryColor: '#FFFFFF',
      primaryTextColor: '#1f2933',
      primaryBorderColor: '#262626',
      secondaryColor: '#f0f3f6',
      secondaryTextColor: '#1f2933',
      secondaryBorderColor: '#262626',
      lineColor: '#1C5D33',
      mainBkg: '#FFFFFF',
      nodeBorder: '#262626',
      clusterBkg: '#f0f3f6',
      clusterBorder: '#262626',
      edgeLabelBackground: 'transparent',
      titleColor: '#1C5D33',
    },
    inkstone: {
      background: '#fcfbf7',
      primaryColor: '#fffdf8',
      primaryTextColor: '#24231f',
      primaryBorderColor: '#466f57',
      secondaryColor: '#f0eadf',
      lineColor: '#466f57',
      textColor: '#24231f',
      mainBkg: '#fffdf8',
      nodeBorder: '#466f57',
      clusterBkg: '#f0eadf',
      clusterBorder: '#d7cebd',
      titleColor: '#8f4638',
      edgeLabelBackground: '#fcfbf7',
    },
    slate: {
      background: '#f7f8f8',
      primaryColor: '#fbfcfc',
      primaryTextColor: '#222829',
      primaryBorderColor: '#587a85',
      secondaryColor: '#e4e9e9',
      lineColor: '#587a85',
      textColor: '#222829',
      mainBkg: '#fbfcfc',
      nodeBorder: '#587a85',
      clusterBkg: '#e4e9e9',
      clusterBorder: '#cbd4d5',
      titleColor: '#4f6d7a',
      edgeLabelBackground: '#f7f8f8',
    },
    mono: {
      background: '#fbfbfa',
      primaryColor: '#fbfbfa',
      primaryTextColor: '#171817',
      primaryBorderColor: '#3b6f48',
      secondaryColor: '#e7ebe4',
      lineColor: '#3b6f48',
      textColor: '#171817',
      mainBkg: '#fbfbfa',
      nodeBorder: '#3b6f48',
      clusterBkg: '#e7ebe4',
      clusterBorder: '#d4d8d0',
      titleColor: '#6d4c9f',
      edgeLabelBackground: '#fbfbfa',
    },
    nocturne: {
      background: '#171a18',
      primaryColor: '#171a18',
      primaryTextColor: '#e5e1d7',
      primaryBorderColor: '#86a878',
      secondaryColor: '#262b25',
      lineColor: '#86a878',
      textColor: '#e5e1d7',
      mainBkg: '#171a18',
      nodeBorder: '#86a878',
      clusterBkg: '#262b25',
      clusterBorder: '#394035',
      titleColor: '#d1ad82',
      edgeLabelBackground: '#20241f',
    },
  };

  return { ...shared, themeVariables: variables[contentTheme] };
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
      svg.setAttribute(
        'viewBox',
        `${Math.floor(box.x - padding)} ${Math.floor(box.y - padding)} ${Math.ceil(box.width + padding * 2)} ${Math.ceil(box.height + padding * 2)}`,
      );
    }
  } catch {
    // Font timing can make getBBox unavailable. Overflow rules still protect labels.
  }
}

async function renderMermaidPlaceholders(root: HTMLElement, contentTheme: ContentTheme) {
  const placeholders = Array.from(root.querySelectorAll<HTMLElement>('.mermaid-placeholder'));
  if (placeholders.length === 0) return;

  const { default: mermaid } = await import('mermaid');
  mermaid.initialize(getMermaidConfig(contentTheme) as any);

  if ('fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      // Font readiness is best effort.
    }
  }

  await Promise.all(placeholders.map(async (placeholder, index) => {
    const encoded = placeholder.getAttribute('data-mermaid');
    if (!encoded) return;
    const source = decodeURIComponent(encoded);
    try {
      const { svg } = await mermaid.render(`prism-export-mermaid-${Date.now()}-${index}`, source);
      placeholder.innerHTML = svg;
      placeholder.style.display = 'flex';
      placeholder.style.justifyContent = 'center';
      placeholder.style.margin = '1.5em 0';
      const svgEl = placeholder.querySelector('svg');
      if (svgEl) normalizeMermaidSvg(svgEl);
    } catch (err) {
      placeholder.innerHTML = `<pre>Mermaid 渲染失败: ${escapeHtml(String(err))}</pre>`;
    }
  }));
}

async function svgToPngDataUrl(svgText: string) {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-12000px';
  container.style.top = '0';
  container.style.pointerEvents = 'none';
  container.innerHTML = svgText;
  document.body.appendChild(container);

  try {
    const svg = container.querySelector('svg');
    if (!svg) return null;
    normalizeMermaidSvg(svg);
    const box = svg.getBBox();
    const width = Math.max(320, Math.ceil(box.width + 56));
    const height = Math.max(180, Math.ceil(box.height + 56));
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Mermaid SVG 转图片失败'));
        img.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('无法创建 Mermaid 图片画布');
      ctx.scale(2, 2);
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-preview') || '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(image, 0, 0, width, height);
      return { dataUrl: canvas.toDataURL('image/png'), width, height };
    } finally {
      URL.revokeObjectURL(url);
    }
  } finally {
    container.remove();
  }
}

async function renderMermaidImage(source: string, contentTheme: ContentTheme) {
  const { default: mermaid } = await import('mermaid');
  const config = getMermaidConfig(contentTheme) as any;
  const candidates = [
    source,
    source.replace(/<br\s*\/?>/gi, '<br/>'),
    source.replace(/<br\s*\/?>/gi, '<br>'),
  ];

  for (const [configIndex, htmlLabels] of [false, true].entries()) {
    mermaid.initialize({
      ...config,
      flowchart: {
        ...config.flowchart,
        htmlLabels,
      },
    });

    for (const [sourceIndex, candidate] of candidates.entries()) {
      try {
        const { svg } = await mermaid.render(
          `prism-docx-mermaid-${Date.now()}-${configIndex}-${sourceIndex}-${Math.random().toString(36).slice(2)}`,
          candidate,
        );
        const image = await svgToPngDataUrl(svg);
        if (image) return image;
      } catch {
        // Try the next Mermaid rendering variant before falling back.
      }
    }
  }

  return null;
}

async function inlineImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>('img'));
  await Promise.all(images.map(async (image) => {
    if (!image.src || image.src.startsWith('data:')) return;
    try {
      const response = await fetch(image.src);
      if (!response.ok) return;
      image.src = await blobToDataUrl(await response.blob());
    } catch {
      // Leave the original src when it cannot be fetched.
    }
  }));
}

async function createRenderedExportNode(input: ExportDocumentInput) {
  const html = markdownToHtml(input.content);
  const root = document.createElement('div');
  root.className = `prism-export-document preview-compat preview-compat--${input.contentTheme}`;
  root.style.position = 'fixed';
  root.style.left = '-12000px';
  root.style.top = '0';
  root.style.width = '980px';
  root.style.pointerEvents = 'none';
  root.style.opacity = '0';
  root.innerHTML = `<div id="write" class="${writeClassByTheme[input.contentTheme]}">${html}</div>`;
  document.body.appendChild(root);

  try {
    await renderMermaidPlaceholders(root, input.contentTheme);
    await inlineImages(root);
    if ('fonts' in document) {
      await document.fonts.ready;
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return root;
  } catch (err) {
    root.remove();
    throw err;
  }
}

async function buildStandaloneHtml(
  input: ExportDocumentInput,
  renderedRoot?: HTMLElement,
  options: { includeTheme?: boolean } = {},
) {
  const css = options.includeTheme === false ? '' : await collectExportCss();
  const body = (() => {
    if (!renderedRoot) {
      return `<div class="prism-export-document preview-compat preview-compat--${input.contentTheme}">
        <div id="write" class="${writeClassByTheme[input.contentTheme]}">${markdownToHtml(input.content)}</div>
      </div>`;
    }

    const clone = renderedRoot.cloneNode(true) as HTMLElement;
    clone.removeAttribute('style');
    return clone.outerHTML;
  })();

  return `<!DOCTYPE html>
<html lang="zh-CN" data-content-theme="${input.contentTheme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(stripMarkdownExtension(input.filename))}</title>
  ${css ? `<style>${css}</style>` : ''}
</head>
<body class="${document.body.classList.contains('dark') ? 'dark' : ''}">
${body}
</body>
</html>`;
}

async function createStandaloneExportFrame(input: ExportDocumentInput) {
  const node = await createRenderedExportNode(input);
  let html = '';
  try {
    html = await buildStandaloneHtml(input, node);
  } finally {
    node.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-12000px';
  iframe.style.top = '0';
  iframe.style.width = '1040px';
  iframe.style.height = '1200px';
  iframe.style.border = '0';
  iframe.style.opacity = '1';
  iframe.style.pointerEvents = 'none';
  iframe.setAttribute('aria-hidden', 'true');

  await new Promise<void>((resolve) => {
    const timeout = window.setTimeout(resolve, 1600);
    iframe.onload = () => {
      window.clearTimeout(timeout);
      resolve();
    };
    iframe.srcdoc = html;
    document.body.appendChild(iframe);
  });

  const frameDocument = iframe.contentDocument;
  if (!frameDocument) {
    iframe.remove();
    throw new Error('无法创建导出渲染环境');
  }

  if ('fonts' in frameDocument) {
    try {
      await frameDocument.fonts.ready;
    } catch {
      // Font readiness is best effort in the export frame.
    }
  }
  await nextFrame();
  return iframe;
}

async function getExportOutputPath(outputPath?: string) {
  if (outputPath) return outputPath;
  return null;
}

export async function exportHtml(input: ExportDocumentInput, outputPath?: string) {
  const targetPath = await getExportOutputPath(outputPath);
  if (!targetPath) return false;

  reportProgress(input, '正在生成 HTML');
  const node = await createRenderedExportNode(input);
  try {
    await writeTextFile(targetPath, await buildStandaloneHtml(input, node, {
      includeTheme: input.htmlIncludeTheme !== false,
    }));
  } finally {
    node.remove();
  }
  return true;
}

export async function exportPdf(input: ExportDocumentInput, outputPath?: string) {
  const targetPath = await getExportOutputPath(outputPath);
  if (!targetPath) return false;

  reportProgress(input, '正在渲染 PDF 页面');
  const { PDFDocument } = await import('pdf-lib');
  const image = await createRenderedPng(input, { scale: 1.25 });
  reportProgress(input, '正在写入 PDF 文件');
  const pdf = await PDFDocument.create();
  const embedded = await pdf.embedPng(dataUrlToBytes(image.dataUrl));

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const scaledHeight = pageWidth * (image.height / image.width);
  const pageCount = Math.max(1, Math.ceil(scaledHeight / pageHeight));

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const page = pdf.addPage([pageWidth, pageHeight]);
    page.drawImage(embedded, {
      x: 0,
      y: pageHeight - scaledHeight + pageIndex * pageHeight,
      width: pageWidth,
      height: scaledHeight,
    });
  }

  await writeFile(targetPath, await pdf.save());
  return true;
}

async function createRenderedPng(input: ExportDocumentInput, options: { scale?: number } = {}) {
  const { default: html2canvas } = await import('html2canvas');
  const iframe = await createStandaloneExportFrame(input);
  try {
    const frameDocument = iframe.contentDocument;
    const target = frameDocument?.querySelector<HTMLElement>('.prism-export-document');
    if (!frameDocument || !target) throw new Error('导出内容渲染失败');

    const width = Math.max(980, Math.ceil(target.scrollWidth), Math.ceil(frameDocument.documentElement.scrollWidth));
    const height = Math.max(
      200,
      Math.ceil(target.scrollHeight),
      Math.ceil(frameDocument.body.scrollHeight),
      Math.ceil(frameDocument.documentElement.scrollHeight),
    );
    iframe.style.width = `${width}px`;
    iframe.style.height = `${height}px`;
    await nextFrame();

    const canvas = await html2canvas(target, {
      backgroundColor: getComputedStyle(target).backgroundColor || '#ffffff',
      scale: options.scale ?? 2,
      useCORS: true,
      logging: false,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      scrollX: 0,
      scrollY: 0,
    });
    const dataUrl = canvas.toDataURL('image/png');
    const size = await getImageSize(dataUrl);
    return { dataUrl, ...size };
  } catch (err) {
    const message = err instanceof Error ? err.message : err instanceof Event ? err.type : String(err);
    throw new Error(`图像渲染失败: ${message}`);
  } finally {
    iframe.remove();
  }
}

export async function exportPng(input: ExportDocumentInput, outputPath?: string) {
  const targetPath = await getExportOutputPath(outputPath);
  if (!targetPath) return false;

  reportProgress(input, '正在渲染 PNG 图像');
  const image = await createRenderedPng(input, { scale: input.pngScale });
  reportProgress(input, '正在写入 PNG 文件');
  await writeFile(targetPath, dataUrlToBytes(image.dataUrl));
  return true;
}

type RunStyle = Record<string, any>;

function splitMarkedText(docx: DocxModule, value: string, base: RunStyle = {}) {
  const { ShadingType, TextRun } = docx;
  const runs: DocxTextRun[] = [];
  const pattern = /==([^=\n]+)==/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun({ ...base, text: value.slice(lastIndex, match.index) }));
    }
    runs.push(new TextRun({
      ...base,
      text: match[1],
      shading: { type: ShadingType.CLEAR, fill: 'FFF3A3' },
    }));
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < value.length) {
    runs.push(new TextRun({ ...base, text: value.slice(lastIndex) }));
  }
  return runs.length > 0 ? runs : [new TextRun({ ...base, text: value })];
}

async function inlineToRuns(
  docx: DocxModule,
  node: any,
  theme: DocxTheme,
  style: RunStyle = {},
): Promise<DocxInline[]> {
  const { ShadingType, TextRun, UnderlineType } = docx;
  if (!node) return [];
  if (node.type === 'text') return splitMarkedText(docx, node.value ?? '', style);
  if (node.type === 'break') return [new TextRun({ text: '', break: 1 })];
  if (node.type === 'inlineCode') {
    return [new TextRun({
      ...style,
      text: node.value ?? '',
      font: theme.codeFont,
      color: theme.accent,
      shading: { type: ShadingType.CLEAR, fill: theme.fill },
    })];
  }
  if (node.type === 'strong') {
    const nested = await Promise.all((node.children ?? []).map((child: any) => inlineToRuns(docx, child, theme, { ...style, bold: true })));
    return nested.flat();
  }
  if (node.type === 'emphasis') {
    const nested = await Promise.all((node.children ?? []).map((child: any) => inlineToRuns(docx, child, theme, { ...style, italics: true })));
    return nested.flat();
  }
  if (node.type === 'delete') {
    const nested = await Promise.all((node.children ?? []).map((child: any) => inlineToRuns(docx, child, theme, { ...style, strike: true })));
    return nested.flat();
  }
  if (node.type === 'link') {
    const nested = await Promise.all((node.children ?? []).map((child: any) => inlineToRuns(docx, child, theme, {
      ...style,
      color: theme.accent,
      underline: { type: UnderlineType.SINGLE },
    })));
    return nested.flat();
  }
  if (node.value && typeof node.value === 'string') return splitMarkedText(docx, node.value, style);
  const nested = await Promise.all((node.children ?? []).map((child: any) => inlineToRuns(docx, child, theme, style)));
  return nested.flat();
}

async function paragraphFromInlineChildren(
  docx: DocxModule,
  children: any[],
  theme: DocxTheme,
  style: RunStyle = {},
) {
  const { Paragraph } = docx;
  return new Paragraph({
    children: (await Promise.all(children.map((child) => inlineToRuns(docx, child, theme, style)))).flat(),
    spacing: { after: 180, line: 330 },
  });
}

function isInlineMdastNode(node: any) {
  return [
    'text',
    'emphasis',
    'strong',
    'delete',
    'inlineCode',
    'link',
    'break',
    'html',
  ].includes(node?.type);
}

async function tableCellToDocxBlocks(
  docx: DocxModule,
  children: any[],
  theme: DocxTheme,
  contentTheme: ContentTheme,
  isHeader: boolean,
) {
  const { Paragraph, TextRun } = docx;
  if (children.length === 0) {
    return [new Paragraph({ children: [new TextRun('')], spacing: { before: 0, after: 0 } })];
  }

  if (children.every(isInlineMdastNode)) {
    return [
      new Paragraph({
        children: (await Promise.all(children.map((child) => inlineToRuns(docx, child, theme, { bold: isHeader })))).flat(),
        spacing: { before: 0, after: 0, line: 300 },
      }),
    ];
  }

  const blocks = await mdastToDocxBlocks(docx, children, theme, contentTheme);
  return blocks.length > 0 ? blocks : [new Paragraph('')];
}

function codeBlockToDocxTable(docx: DocxModule, value: string, theme: DocxTheme) {
  const {
    AlignmentType,
    BorderStyle,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableLayoutType,
    TableRow,
    TextRun,
    VerticalAlignTable,
    WidthType,
  } = docx;
  const lines = String(value ?? '').replace(/\t/g, '  ').split('\n');
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: theme.border },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: theme.border },
      left: { style: BorderStyle.SINGLE, size: 4, color: theme.border },
      right: { style: BorderStyle.SINGLE, size: 4, color: theme.border },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: theme.fill },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: theme.fill },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: theme.fill },
            margins: { top: 140, bottom: 140, left: 160, right: 160 },
            verticalAlign: VerticalAlignTable.TOP,
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 0, after: 0, line: 250 },
                children: lines.flatMap((line, index) => [
                  new TextRun({
                    text: line.length > 0 ? line : ' ',
                    font: theme.codeFont,
                    size: 18,
                    noProof: true,
                    break: index === 0 ? 0 : 1,
                  }),
                ]),
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

async function mdastToDocxBlocks(
  docx: DocxModule,
  nodes: any[],
  theme: DocxTheme,
  contentTheme: ContentTheme,
  listDepth = 0,
): Promise<DocxBlock[]> {
  const {
    AlignmentType,
    BorderStyle,
    HeadingLevel,
    ImageRun,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableLayoutType,
    TableRow,
    TextRun,
    VerticalAlignTable,
    WidthType,
  } = docx;
  const blocks: DocxBlock[] = [];

  for (const node of nodes) {
    if (node.type === 'heading') {
      const level = Math.min(Math.max(node.depth ?? 1, 1), 6);
      blocks.push(new Paragraph({
        heading: [
          HeadingLevel.HEADING_1,
          HeadingLevel.HEADING_2,
          HeadingLevel.HEADING_3,
          HeadingLevel.HEADING_4,
          HeadingLevel.HEADING_5,
          HeadingLevel.HEADING_6,
        ][level - 1],
        children: (await Promise.all((node.children ?? []).map((child: any) => inlineToRuns(docx, child, theme)))).flat(),
        spacing: { before: level <= 2 ? 360 : 260, after: 160 },
      }));
      continue;
    }

    if (node.type === 'paragraph') {
      blocks.push(await paragraphFromInlineChildren(docx, node.children ?? [], theme));
      continue;
    }

    if (node.type === 'blockquote') {
      const textRuns = (await Promise.all((node.children ?? []).map(async (child: any) => {
        if (child.type === 'paragraph') {
          return (await Promise.all((child.children ?? []).map((inline: any) => inlineToRuns(docx, inline, theme)))).flat();
        }
        return inlineToRuns(docx, child, theme);
      }))).flat();
      blocks.push(new Paragraph({
        children: textRuns,
        indent: { left: 360 },
        border: {
          left: { style: BorderStyle.SINGLE, size: 12, color: theme.accent, space: 12 },
        },
        shading: { type: ShadingType.CLEAR, fill: theme.fill },
        spacing: { before: 120, after: 180, line: 330 },
      }));
      continue;
    }

    if (node.type === 'code') {
      if (isMermaidSource(String(node.value ?? ''), node.lang)) {
        const image = await renderMermaidImage(String(node.value ?? ''), contentTheme);
        if (image) {
          const width = Math.min(500, image.width);
          const height = Math.round(width * (image.height / image.width));
          blocks.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 180, after: 220 },
            children: [
              new ImageRun({
                type: 'png',
                data: dataUrlToBytes(image.dataUrl),
                transformation: { width, height },
                altText: {
                  title: 'Mermaid diagram',
                  description: 'Mermaid diagram exported from Prism',
                  name: 'Mermaid diagram',
                },
              } as any),
            ],
          }));
          continue;
        }

        blocks.push(new Paragraph({
          children: [
            new TextRun({
              text: 'Mermaid 图表渲染失败，请检查语法',
              color: theme.accent,
              italics: true,
            }),
          ],
          spacing: { before: 120, after: 160 },
        }));
        continue;
      }

      blocks.push(codeBlockToDocxTable(docx, node.value ?? '', theme));
      continue;
    }

    if (node.type === 'list') {
      for (const [index, item] of (node.children ?? []).entries()) {
        const marker = node.ordered ? `${(node.start ?? 1) + index}. ` : '• ';
        const paragraphChild = (item.children ?? []).find((child: any) => child.type === 'paragraph');
        const runs = paragraphChild
          ? (await Promise.all((paragraphChild.children ?? []).map((child: any) => inlineToRuns(docx, child, theme)))).flat()
          : [];
        blocks.push(new Paragraph({
          children: [new TextRun({ text: marker, color: theme.accent }), ...runs],
          indent: { left: 360 + listDepth * 240, hanging: 240 },
          spacing: { after: 100, line: 330 },
        }));
        const nested = (item.children ?? []).filter((child: any) => child.type !== 'paragraph');
        blocks.push(...await mdastToDocxBlocks(docx, nested, theme, contentTheme, listDepth + 1));
      }
      continue;
    }

    if (node.type === 'table') {
      const rows = [];
      for (const [rowIndex, row] of (node.children ?? []).entries()) {
        const cells = [];
        for (const cell of row.children ?? []) {
          cells.push(new TableCell({
            children: await tableCellToDocxBlocks(docx, cell.children ?? [], theme, contentTheme, rowIndex === 0),
            shading: rowIndex === 0 ? { type: ShadingType.CLEAR, fill: theme.fill } : undefined,
            margins: { top: 110, bottom: 110, left: 140, right: 140 },
            verticalAlign: VerticalAlignTable.TOP,
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: theme.border },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: theme.border },
              left: { style: BorderStyle.SINGLE, size: 4, color: theme.border },
              right: { style: BorderStyle.SINGLE, size: 4, color: theme.border },
            },
          }));
        }
        rows.push(new TableRow({ children: cells, cantSplit: true }));
      }
      blocks.push(new Table({
        rows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: theme.border },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: theme.border },
          left: { style: BorderStyle.SINGLE, size: 4, color: theme.border },
          right: { style: BorderStyle.SINGLE, size: 4, color: theme.border },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: theme.border },
          insideVertical: { style: BorderStyle.SINGLE, size: 4, color: theme.border },
        },
      }));
      continue;
    }

    if (node.type === 'thematicBreak') {
      blocks.push(new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: theme.border } },
        spacing: { before: 240, after: 240 },
      }));
      continue;
    }

    if (node.type === 'html') {
      blocks.push(new Paragraph({
        children: [new TextRun({ text: String(node.value ?? '').replace(/<[^>]*>/g, '') })],
      }));
      continue;
    }
  }

  return blocks;
}

export async function exportDocx(input: ExportDocumentInput, outputPath?: string) {
  const docx = await import('docx');
  const targetPath = await getExportOutputPath(outputPath);
  if (!targetPath) return false;

  reportProgress(input, '正在生成 Word 文档');
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMath);
  const tree = processor.runSync(processor.parse(input.content)) as any;
  const theme = docxThemeByContentTheme[input.contentTheme];
  const blocks = await mdastToDocxBlocks(docx, tree.children ?? [], theme, input.contentTheme);
  const { Document, Packer, Paragraph } = docx;

  const document = new Document({
    styles: {
      default: {
        document: {
          run: { font: theme.font, color: theme.text, size: 24 },
          paragraph: { spacing: { line: 330 } },
        },
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 34, color: theme.accent, bold: false, font: theme.font },
          paragraph: { spacing: { before: 420, after: 160 } },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 30, color: theme.accent, bold: false, font: theme.font },
          paragraph: { spacing: { before: 360, after: 140 } },
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 26, color: theme.accent, bold: false, font: theme.font },
          paragraph: { spacing: { before: 300, after: 120 } },
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
        },
      },
      children: blocks.length > 0 ? blocks : [new Paragraph('')],
    }],
  });

  const blob = await Packer.toBlob(document);
  await writeFile(targetPath, new Uint8Array(await blob.arrayBuffer()));
  return true;
}
