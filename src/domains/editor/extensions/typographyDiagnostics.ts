export type TypographyDiagnosticKind =
  | 'cjk-latin-spacing'
  | 'halfwidth-punctuation'
  | 'heading-hierarchy'
  | 'repeated-empty-lines';

export interface TypographyDiagnostic {
  column: number;
  kind: TypographyDiagnosticKind;
  line: number;
  message: string;
  suggestion: string;
}

const CJK_LATIN_LEFT_RE = /(\p{Script=Han})([A-Za-z0-9])/gu;
const CJK_LATIN_RIGHT_RE = /([A-Za-z0-9])(\p{Script=Han})/gu;
const HALFWIDTH_PUNCT_RE = /\p{Script=Han}([,.;:!?])|([,.;:!?])\p{Script=Han}/gu;

function isFenceStart(line: string) {
  return /^\s*(```|~~~)/.test(line);
}

function maskInlineCode(line: string) {
  return line.replace(/`[^`\n]*`/g, (match) => ' '.repeat(match.length));
}

function maskMarkdownLinkDestinations(line: string) {
  return line.replace(/(\]\()([^)\n]*)(\))/g, (_match, open: string, target: string, close: string) => {
    return `${open}${' '.repeat(target.length)}${close}`;
  });
}

function pushBoundaryDiagnostics(input: {
  diagnostics: TypographyDiagnostic[];
  kind: TypographyDiagnosticKind;
  line: number;
  lineText: string;
  message: string;
  regex: RegExp;
  suggestion: string;
}) {
  for (const match of input.lineText.matchAll(input.regex)) {
    input.diagnostics.push({
      column: (match.index ?? 0) + 1,
      kind: input.kind,
      line: input.line,
      message: input.message,
      suggestion: input.suggestion,
    });
  }
}

export function scanChineseTypography(content: string): TypographyDiagnostic[] {
  const diagnostics: TypographyDiagnostic[] = [];
  const lines = content.split('\n');
  let inFence = false;
  let previousHeadingLevel = 0;
  let blankStreak = 0;

  lines.forEach((rawLine, lineIndex) => {
    const line = lineIndex + 1;
    if (isFenceStart(rawLine)) {
      inFence = !inFence;
      blankStreak = 0;
      return;
    }

    if (inFence) return;

    if (rawLine.trim() === '') {
      blankStreak += 1;
      if (blankStreak === 3) {
        diagnostics.push({
          column: 1,
          kind: 'repeated-empty-lines',
          line,
          message: '连续空行超过 2 行',
          suggestion: '保留 1-2 个空行即可，避免正文节奏被拉开。',
        });
      }
      return;
    }

    blankStreak = 0;

    const heading = rawLine.match(/^(#{1,6})\s+\S/);
    if (heading) {
      const level = heading[1].length;
      if (previousHeadingLevel > 0 && level > previousHeadingLevel + 1) {
        diagnostics.push({
          column: 1,
          kind: 'heading-hierarchy',
          line,
          message: `标题层级从 H${previousHeadingLevel} 跳到 H${level}`,
          suggestion: `补一个 H${previousHeadingLevel + 1}，或把当前标题降为 H${previousHeadingLevel + 1}。`,
        });
      }
      previousHeadingLevel = level;
    }

    const text = maskMarkdownLinkDestinations(maskInlineCode(rawLine));
    pushBoundaryDiagnostics({
      diagnostics,
      kind: 'cjk-latin-spacing',
      line,
      lineText: text,
      message: '中英文之间缺少空格',
      regex: CJK_LATIN_LEFT_RE,
      suggestion: '在中文与英文/数字之间补一个半角空格。',
    });
    pushBoundaryDiagnostics({
      diagnostics,
      kind: 'cjk-latin-spacing',
      line,
      lineText: text,
      message: '英文/数字与中文之间缺少空格',
      regex: CJK_LATIN_RIGHT_RE,
      suggestion: '在英文/数字与中文之间补一个半角空格。',
    });
    pushBoundaryDiagnostics({
      diagnostics,
      kind: 'halfwidth-punctuation',
      line,
      lineText: text,
      message: '中文语境中出现半角标点',
      regex: HALFWIDTH_PUNCT_RE,
      suggestion: '中文正文优先使用全角标点，例如 ，。！？：；。',
    });
  });

  return diagnostics;
}
