export type AppearanceMode = 'light' | 'dark' | 'auto';
export type DefaultViewMode = 'edit' | 'split' | 'preview';
export type ShortcutStyle = 'auto' | 'mac' | 'windows';
export type ExportDefaultFormat = 'html' | 'pdf' | 'docx' | 'png';
export type AutoSaveStrategy = 'instant' | 'balanced' | 'battery';
export type PdfPaper = 'a4' | 'letter';
export type PdfMargin = 'compact' | 'standard' | 'wide';
export type ExportTemplateId = 'theme' | 'business' | 'plain' | 'academic';
export type ExportDefaultLocation = 'ask' | 'document' | 'downloads' | 'custom';
export type DocxFontPolicy = 'theme' | 'preview' | 'custom';
export type FontSourceKind = 'theme' | 'builtin' | 'system' | 'custom';

export const CONTENT_THEMES = ['miaoyan', 'inkstone', 'slate', 'mono', 'nocturne'] as const;

export type ContentTheme = (typeof CONTENT_THEMES)[number];

export function isContentTheme(theme: unknown): theme is ContentTheme {
  return typeof theme === 'string' && CONTENT_THEMES.includes(theme as ContentTheme);
}

export interface FontSource {
  kind: FontSourceKind;
  value: string;
}

export interface CustomFont {
  id: string;
  family: string;
  displayName: string;
  filename: string;
  path: string;
  format: 'ttf' | 'otf' | 'woff' | 'woff2';
  importedAt: number;
}

export interface RecentFileEntry {
  path: string;
  name: string;
  lastOpened: number;
}

export interface LastSessionState {
  filePath?: string;
  folderPath?: string;
  viewMode?: DefaultViewMode;
  sidebarVisible?: boolean;
  sidebarTab?: 'files' | 'outline' | 'search';
  updatedAt: number;
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
    pdfPaper: PdfPaper;
    pdfMargin: PdfMargin;
    templateId: ExportTemplateId;
    defaultLocation: ExportDefaultLocation;
    customDirectory: string;
    docxFontPolicy: DocxFontPolicy;
    docxCustomFontId: string;
  };
  shortcutStyle: ShortcutStyle;
  autoSaveEnabled: boolean;
  autoSaveInterval: number;
  autoSaveStrategy: AutoSaveStrategy;
  showLineNumbers: boolean;
  wordWrap: boolean;
  customFonts: CustomFont[];
  editorFontSource: FontSource;
  previewFontSource: FontSource;
  recentFiles: RecentFileEntry[];
  recentFilesLimit: number;
  restoreLastSession: boolean;
  lastSession: LastSessionState | null;
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
    pdfPaper: 'a4',
    pdfMargin: 'standard',
    templateId: 'theme',
    defaultLocation: 'document',
    customDirectory: '',
    docxFontPolicy: 'theme',
    docxCustomFontId: '',
  },
  shortcutStyle: 'auto',
  autoSaveEnabled: true,
  autoSaveInterval: 2000,
  autoSaveStrategy: 'balanced',
  showLineNumbers: false,
  wordWrap: true,
  customFonts: [],
  editorFontSource: { kind: 'theme', value: '' },
  previewFontSource: { kind: 'theme', value: '' },
  recentFiles: [],
  recentFilesLimit: 10,
  restoreLastSession: true,
  lastSession: null,
  windowState: {
    width: 1200,
    height: 800,
    x: 100,
    y: 100,
  },
};
