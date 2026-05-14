export const SUPPORTED_MARKDOWN_EXTENSIONS = ['md', 'markdown', 'txt'] as const;

export const MARKDOWN_FILE_FILTERS = [
  { name: 'Markdown', extensions: ['md', 'markdown'] },
  { name: 'Text', extensions: ['txt'] },
];

export function isSupportedMarkdownPath(path: string): boolean {
  return /\.(md|markdown|txt)$/i.test(path);
}
