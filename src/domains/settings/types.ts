export type AppearanceMode = 'light' | 'dark' | 'auto';
export type DefaultViewMode = 'edit' | 'split' | 'preview';
export type ShortcutStyle = 'auto' | 'mac' | 'windows';
export type ExportDefaultFormat = 'html' | 'pdf' | 'docx' | 'png';

export const CONTENT_THEMES = ['miaoyan', 'inkstone', 'slate', 'mono', 'nocturne'] as const;

export type ContentTheme = (typeof CONTENT_THEMES)[number];

export function isContentTheme(theme: unknown): theme is ContentTheme {
  return typeof theme === 'string' && CONTENT_THEMES.includes(theme as ContentTheme);
}

export interface SettingsState {
  theme: AppearanceMode;
  contentTheme: ContentTheme;
  fontSize: number;
  editorFontFamily: string;
  editorLineHeight: number;
  previewFontFamily: string;
  previewFontSize: number;
  defaultViewMode: DefaultViewMode;
  exportDefaults: {
    format: ExportDefaultFormat;
    pngScale: number;
    htmlIncludeTheme: boolean;
  };
  shortcutStyle: ShortcutStyle;
  autoSaveInterval: number;
  showLineNumbers: boolean;
  windowState: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
}

export const DEFAULT_SETTINGS: SettingsState = {
  theme: 'auto',
  contentTheme: 'miaoyan',
  fontSize: 16,
  editorFontFamily: 'Cascadia Code, Consolas, monospace',
  editorLineHeight: 1.72,
  previewFontFamily: 'inherit',
  previewFontSize: 16,
  defaultViewMode: 'edit',
  exportDefaults: {
    format: 'pdf',
    pngScale: 2,
    htmlIncludeTheme: true,
  },
  shortcutStyle: 'auto',
  autoSaveInterval: 2000,
  showLineNumbers: false,
  windowState: {
    width: 1200,
    height: 800,
    x: 100,
    y: 100,
  },
};
