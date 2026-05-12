/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { __editorPaneTesting } from './EditorPane';

describe('EditorPane Miaoyan code highlighting', () => {
  it('matches MiaoYan fenced language rules', () => {
    expect(__editorPaneTesting.getMiaoyanCodeLanguage('```swift\nlet title = "miaoyan"\n```')).toBe('swift');
    expect(__editorPaneTesting.getMiaoyanCodeLanguage('```go\nfmt.Println("miaoyan")\n```')).toBeUndefined();
    expect(__editorPaneTesting.getMiaoyanCodeLanguage('let title = "miaoyan"')).toBeUndefined();
  });

  it('creates atom-one-light token classes for fenced code under the MiaoYan limit', () => {
    const ranges = __editorPaneTesting.getMiaoyanCodeHighlightRanges(
      '```swift\nlet title = "miaoyan"\nprint(title)\n```',
    );
    const classes = ranges.map((range) => range.className);

    expect(classes).toContain('hljs-keyword');
    expect(classes).toContain('hljs-string');
    expect(classes).toContain('hljs-built_in');
  });

  it('highlights JavaScript inside fences instead of treating the fence as a template string', () => {
    const code = '```js\nconst answer = 42;\nfunction hello(name) {\n  return name;\n}\n```';
    const ranges = __editorPaneTesting.getMiaoyanCodeHighlightRanges(code);

    expect(ranges.some((range) => (
      range.className.includes('hljs-keyword') &&
      code.slice(range.from, range.to) === 'const'
    ))).toBe(true);
    expect(ranges.every((range) => code.slice(range.from, range.to) !== '```')).toBe(true);
  });

  it('falls back to basic code styling above the MiaoYan block size limit', () => {
    const oversizedCode = 'x'.repeat(__editorPaneTesting.MIAOYAN_CODE_BLOCK_HIGHLIGHT_LIMIT + 1);

    expect(__editorPaneTesting.getMiaoyanCodeHighlightRanges(oversizedCode)).toEqual([]);
  });

  it('uses the same code highlighting pipeline for every compatibility theme', () => {
    expect(__editorPaneTesting.shouldHighlightCompatibilityCodeTheme('miaoyan')).toBe(true);
    expect(__editorPaneTesting.shouldHighlightCompatibilityCodeTheme('inkstone')).toBe(true);
    expect(__editorPaneTesting.shouldHighlightCompatibilityCodeTheme('slate')).toBe(true);
    expect(__editorPaneTesting.shouldHighlightCompatibilityCodeTheme('mono')).toBe(true);
    expect(__editorPaneTesting.shouldHighlightCompatibilityCodeTheme('nocturne')).toBe(true);
  });
});
