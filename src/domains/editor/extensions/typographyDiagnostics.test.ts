import { describe, expect, it } from 'vitest';
import { scanChineseTypography } from './typographyDiagnostics';

function buildLongTypographySmokeText() {
  const parts: string[] = ['# 中文排版长文 Smoke\n\n'];
  let fencedProblemLine = 0;
  let linkDestinationOnlyLine = 0;

  for (let index = 1; index <= 1200; index += 1) {
    parts.push(`## 第 ${index} 节\n\n`);
    parts.push(
      `这是Prism编辑器第${index}段,用于验证中文Typography诊断在长文中保持可用。` +
      `English${index}和中文之间故意缺少空格，同时保留足够正文长度模拟真实写作。\n\n`,
    );

    if (index === 200) {
      fencedProblemLine = parts.join('').split('\n').length + 1;
      parts.push('```\n这是Prism编辑器,但在代码块中应被忽略\n```\n\n');
    }

    if (index === 300) {
      linkDestinationOnlyLine = parts.join('').split('\n').length + 1;
      parts.push('[参考](docs/这是Prism编辑器.md)\n\n');
    }
  }

  return {
    content: parts.join(''),
    fencedProblemLine,
    linkDestinationOnlyLine,
  };
}

describe('scanChineseTypography', () => {
  it('reports missing spacing between Chinese and English text', () => {
    const diagnostics = scanChineseTypography('这是Prism编辑器');

    expect(diagnostics).toMatchObject([
      {
        column: 2,
        kind: 'cjk-latin-spacing',
        line: 1,
        message: '中英文之间缺少空格',
      },
      {
        column: 7,
        kind: 'cjk-latin-spacing',
        line: 1,
        message: '英文/数字与中文之间缺少空格',
      },
    ]);
  });

  it('reports halfwidth punctuation in Chinese context', () => {
    expect(scanChineseTypography('这是中文,不是 English.')).toMatchObject([
      {
        column: 4,
        kind: 'halfwidth-punctuation',
        line: 1,
        message: '中文语境中出现半角标点',
      },
    ]);
  });

  it('reports heading level jumps', () => {
    expect(scanChineseTypography('# 一级\n### 三级')).toMatchObject([
      {
        column: 1,
        kind: 'heading-hierarchy',
        line: 2,
        message: '标题层级从 H1 跳到 H3',
      },
    ]);
  });

  it('reports repeated empty lines only once per run', () => {
    const diagnostics = scanChineseTypography('第一段\n\n\n\n第二段');

    expect(diagnostics).toMatchObject([
      {
        column: 1,
        kind: 'repeated-empty-lines',
        line: 4,
        message: '连续空行超过 2 行',
      },
    ]);
  });

  it('ignores fenced and inline code', () => {
    expect(scanChineseTypography([
      '```',
      '这是Prism编辑器',
      '```',
      '正文 `这是Prism编辑器`',
    ].join('\n'))).toEqual([]);
  });

  it('ignores markdown link and image destinations but still checks visible link text', () => {
    expect(scanChineseTypography([
      '![截图](assets/图1.png)',
      '[参考](docs/第2章.md)',
    ].join('\n'))).toEqual([]);

    expect(scanChineseTypography('[这是Prism](docs/intro.md)')).toMatchObject([
      {
        kind: 'cjk-latin-spacing',
        line: 1,
        message: '中英文之间缺少空格',
      },
    ]);
  });

  it('scans a long Chinese writing fixture within a bounded time without code/link-target false positives', () => {
    const { content, fencedProblemLine, linkDestinationOnlyLine } = buildLongTypographySmokeText();
    const startedAt = performance.now();
    const diagnostics = scanChineseTypography(content);
    const durationMs = performance.now() - startedAt;

    expect(content.length).toBeGreaterThan(100_000);
    expect(durationMs).toBeLessThan(1500);
    expect(diagnostics.length).toBeGreaterThan(2500);
    expect(diagnostics.some((diagnostic) => diagnostic.line === fencedProblemLine)).toBe(false);
    expect(diagnostics.some((diagnostic) => diagnostic.line === linkDestinationOnlyLine)).toBe(false);
  });
});
