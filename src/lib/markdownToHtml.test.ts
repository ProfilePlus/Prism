import { describe, expect, it } from 'vitest';
import { markdownToHtml } from './markdownToHtml';

describe('markdownToHtml compatibility modes', () => {
  const codeBlock = '```ts\nconst answer = 42;\n```';
  const compatibilityModes = ['miaoyan', 'inkstone', 'slate', 'mono', 'nocturne'] as const;

  it('keeps code blocks free of legacy Prism preview chrome by default', () => {
    const html = markdownToHtml(codeBlock);

    expect(html).toContain('<pre');
    expect(html).toContain('class="hljs language-ts"');
    expect(html).not.toContain('class="code-block"');
    expect(html).not.toContain('class="code-header"');
    expect(html).not.toContain('class="code-copy"');
  });

  it.each(compatibilityModes)('keeps %s code blocks in compatibility mode', (compatibilityMode) => {
    const html = markdownToHtml(codeBlock, { compatibilityMode });

    expect(html).toContain('<pre');
    expect(html).toContain('class="hljs language-ts"');
    expect(html).not.toContain('class="code-block"');
    expect(html).not.toContain('class="code-header"');
    expect(html).not.toContain('class="code-copy"');
  });

  it('auto-detects unlabeled fenced blocks like MiaoYan Highlightr', () => {
    const html = markdownToHtml('```\nconst answer = "42";\n```', { compatibilityMode: 'miaoyan' });

    expect(html).toContain('class="hljs');
    expect(html).toContain('hljs-string');
  });
});
