export interface WritingStats {
  chineseChars: number;
  englishWords: number;
  characters: number;
  readingMinutes: number;
  wordCount: number;
}

const CHINESE_READING_CHARS_PER_MINUTE = 400;
const ENGLISH_READING_WORDS_PER_MINUTE = 200;

function stripMarkdownNoise(markdown: string) {
  return markdown
    .replace(/^\s*---\s*[\r\n][\s\S]*?[\r\n]---\s*(?:\r?\n|$)/, '\n')
    .replace(/```[\s\S]*?```/g, '\n')
    .replace(/~~~[\s\S]*?~~~/g, '\n')
    .replace(/`[^`\n]*`/g, '')
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/^\s*\[[^\]]+]:\s+\S+.*$/gm, '')
    .replace(/<\/?[^>\n]+>/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\[\[([^[\]|]+)\|([^\]]+)]]/g, '$2')
    .replace(/\[\[([^[\]]+)]]/g, '$1')
    .split(/\r?\n/)
    .map((line) => line
      .replace(/^\s{0,3}#{1,6}\s+/, '')
      .replace(/^\s{0,3}>\s?/, '')
      .replace(/^\s*(?:[-+*]|\d+[.)])\s+/, '')
      .replace(/^\[[ xX]]\s+/, '')
      .replace(/[*_~#>|()[\]{}]/g, ''))
    .join('\n');
}

export function computeWritingStats(markdown: string): WritingStats {
  const plain = stripMarkdownNoise(markdown);
  const chineseChars = plain.match(/\p{Script=Han}/gu)?.length ?? 0;
  const englishWords = plain.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g)?.length ?? 0;
  const characters = Array.from(plain.replace(/\s/g, '')).length;
  const readingLoad =
    chineseChars / CHINESE_READING_CHARS_PER_MINUTE +
    englishWords / ENGLISH_READING_WORDS_PER_MINUTE;
  const readingMinutes = characters === 0 ? 0 : Math.max(1, Math.ceil(readingLoad));

  return {
    chineseChars,
    englishWords,
    characters,
    readingMinutes,
    wordCount: chineseChars + englishWords,
  };
}
