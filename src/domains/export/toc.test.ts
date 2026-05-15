import { describe, expect, it } from 'vitest';
import {
  buildExportTocHtml,
  buildExportTocItems,
  buildExportTocItemsFromMdast,
} from './toc';

describe('export toc', () => {
  it('builds stable unique anchors from headings', () => {
    expect(buildExportTocItems([
      { level: 1, text: 'Intro' },
      { level: 2, text: 'Intro' },
      { level: 3, text: '中文标题 / API' },
      { level: 9, text: ' Deep   Dive ' },
      { level: 2, text: '   ' },
    ])).toEqual([
      { level: 1, text: 'Intro', anchor: 'intro' },
      { level: 2, text: 'Intro', anchor: 'intro-2' },
      { level: 3, text: '中文标题 / API', anchor: '中文标题-api' },
      { level: 6, text: 'Deep Dive', anchor: 'deep-dive' },
    ]);
  });

  it('extracts heading text from mdast inline children', () => {
    const items = buildExportTocItemsFromMdast([
      {
        type: 'heading',
        depth: 2,
        children: [
          { type: 'text', value: 'Hello ' },
          { type: 'inlineCode', value: 'API' },
          { type: 'emphasis', children: [{ type: 'text', value: ' now' }] },
        ],
      },
      { type: 'paragraph', children: [{ type: 'text', value: 'ignored' }] },
    ]);

    expect(items).toEqual([
      { level: 2, text: 'Hello API now', anchor: 'hello-api-now' },
    ]);
  });

  it('renders escaped toc html with heading links', () => {
    const html = buildExportTocHtml([
      { level: 1, text: 'Intro & Scope', anchor: 'intro-scope' },
      { level: 2, text: '<Unsafe>', anchor: 'unsafe' },
    ]);

    expect(html).toContain('class="prism-export-toc"');
    expect(html).toContain('href="#intro-scope"');
    expect(html).toContain('Intro &amp; Scope');
    expect(html).toContain('&lt;Unsafe&gt;');
    expect(html).not.toContain('<Unsafe>');
    expect(html).toContain('--toc-indent: 14px');
  });
});
