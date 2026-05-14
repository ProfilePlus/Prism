import type { ContentTheme } from '../settings/types';

export const writeClassByTheme: Record<ContentTheme, string> = {
  miaoyan: 'markdown-body heti',
  inkstone: 'markdown-body heti inkstone-write',
  slate: 'markdown-body heti slate-write',
  mono: 'markdown-body heti mono-write',
  nocturne: 'markdown-body heti nocturne-write',
};

export const docxThemeByContentTheme: Record<ContentTheme, {
  font: string;
  codeFont: string;
  text: string;
  muted: string;
  accent: string;
  fill: string;
  border: string;
}> = {
  miaoyan: {
    font: 'Kaiti SC',
    codeFont: 'Menlo',
    text: '282828',
    muted: '6F6F6F',
    accent: '1C5D33',
    fill: 'F7F7F7',
    border: 'DDDDDD',
  },
  inkstone: {
    font: 'Kaiti SC',
    codeFont: 'Menlo',
    text: '24231F',
    muted: '6B6355',
    accent: '466F57',
    fill: 'F0EADF',
    border: 'D7CEBD',
  },
  slate: {
    font: 'Arial',
    codeFont: 'Menlo',
    text: '222829',
    muted: '4E5A5C',
    accent: '587A85',
    fill: 'E4E9E9',
    border: 'CBD4D5',
  },
  mono: {
    font: 'Menlo',
    codeFont: 'Menlo',
    text: '171817',
    muted: '4D564C',
    accent: '3B6F48',
    fill: 'E7EBE4',
    border: 'D4D8D0',
  },
  nocturne: {
    font: 'Georgia',
    codeFont: 'Menlo',
    text: '2B2A27',
    muted: '5E574C',
    accent: '6F7F62',
    fill: 'EEE9DE',
    border: 'D7CBB8',
  },
};

export type DocxTheme = (typeof docxThemeByContentTheme)[ContentTheme];

export const mermaidFontByTheme: Record<ContentTheme, string> = {
  miaoyan:
    "'TsangerJinKai02 W04', 'TsangerJinKai02', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', Arial, sans-serif",
  inkstone: "'TsangerJinKai02-W04', 'Kaiti SC', 'STKaiti', 'Songti SC', serif",
  slate: "'IBM Plex Sans', 'PingFang SC', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', Menlo, 'PingFang SC', monospace",
  nocturne: "'Newsreader', 'Source Serif 4', 'Songti SC', Georgia, serif",
};
