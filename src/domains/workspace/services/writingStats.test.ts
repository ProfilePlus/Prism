import { describe, expect, it } from 'vitest';
import { computeWritingStats } from './writingStats';

describe('computeWritingStats', () => {
  it('returns zero stats for empty documents', () => {
    expect(computeWritingStats('')).toEqual({
      chineseChars: 0,
      englishWords: 0,
      characters: 0,
      readingMinutes: 0,
      wordCount: 0,
    });
  });

  it('counts Chinese characters and English words in mixed writing', () => {
    expect(computeWritingStats('这是中文长文 with OpenAI editor')).toMatchObject({
      chineseChars: 6,
      englishWords: 3,
      wordCount: 9,
      readingMinutes: 1,
    });
  });

  it('ignores common Markdown structure noise while keeping readable text', () => {
    const stats = computeWritingStats(`---
title: 不统计
---
# 标题 Alpha

正文 with [链接 Beta](https://example.com/hidden-url)
![图片 Alt](./image-hidden.png)

\`\`\`ts
const hidden = "隐藏";
\`\`\`

\`inline hidden\`
> 引用 Gamma
- [x] 任务 Delta
`);

    expect(stats.chineseChars).toBe(10);
    expect(stats.englishWords).toBe(5);
    expect(stats.wordCount).toBe(15);
  });

  it('estimates reading time from Chinese and English load', () => {
    expect(computeWritingStats('你'.repeat(801))).toMatchObject({
      chineseChars: 801,
      readingMinutes: 3,
    });
  });
});
