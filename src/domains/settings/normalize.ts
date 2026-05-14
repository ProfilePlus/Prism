import {
  DEFAULT_SETTINGS,
  type AppearanceMode,
  type DefaultViewMode,
  type ExportDefaultFormat,
  type SettingsState,
  type ShortcutStyle,
  isContentTheme,
} from './types';

function isAppearanceMode(value: unknown): value is AppearanceMode {
  return value === 'light' || value === 'dark' || value === 'auto';
}

function isDefaultViewMode(value: unknown): value is DefaultViewMode {
  return value === 'edit' || value === 'split' || value === 'preview';
}

function isShortcutStyle(value: unknown): value is ShortcutStyle {
  return value === 'auto' || value === 'mac' || value === 'windows';
}

function isExportDefaultFormat(value: unknown): value is ExportDefaultFormat {
  return value === 'html' || value === 'pdf' || value === 'docx' || value === 'png';
}

function numberInRange(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function booleanOrDefault(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function stringOrDefault(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

export function normalizeSettings(saved: Partial<SettingsState>): SettingsState {
  const exportDefaults =
    saved.exportDefaults && typeof saved.exportDefaults === 'object'
      ? saved.exportDefaults
      : {} as Partial<SettingsState['exportDefaults']>;

  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    theme: isAppearanceMode(saved.theme) ? saved.theme : DEFAULT_SETTINGS.theme,
    contentTheme: isContentTheme(saved.contentTheme)
      ? saved.contentTheme
      : DEFAULT_SETTINGS.contentTheme,
    fontSize: numberInRange(saved.fontSize, DEFAULT_SETTINGS.fontSize, 10, 32),
    editorFontFamily: stringOrDefault(saved.editorFontFamily, DEFAULT_SETTINGS.editorFontFamily),
    editorLineHeight: numberInRange(
      saved.editorLineHeight,
      DEFAULT_SETTINGS.editorLineHeight,
      1.1,
      3,
    ),
    previewFontFamily: stringOrDefault(saved.previewFontFamily, DEFAULT_SETTINGS.previewFontFamily),
    previewFontSize: numberInRange(saved.previewFontSize, DEFAULT_SETTINGS.previewFontSize, 10, 36),
    defaultViewMode: isDefaultViewMode(saved.defaultViewMode)
      ? saved.defaultViewMode
      : DEFAULT_SETTINGS.defaultViewMode,
    exportDefaults: {
      ...DEFAULT_SETTINGS.exportDefaults,
      ...exportDefaults,
      format: isExportDefaultFormat(exportDefaults.format)
        ? exportDefaults.format
        : DEFAULT_SETTINGS.exportDefaults.format,
      pngScale: numberInRange(
        exportDefaults.pngScale,
        DEFAULT_SETTINGS.exportDefaults.pngScale,
        1,
        4,
      ),
      htmlIncludeTheme: booleanOrDefault(
        exportDefaults.htmlIncludeTheme,
        DEFAULT_SETTINGS.exportDefaults.htmlIncludeTheme,
      ),
    },
    shortcutStyle: isShortcutStyle(saved.shortcutStyle)
      ? saved.shortcutStyle
      : DEFAULT_SETTINGS.shortcutStyle,
    autoSaveInterval: numberInRange(
      saved.autoSaveInterval,
      DEFAULT_SETTINGS.autoSaveInterval,
      500,
      60000,
    ),
    showLineNumbers: booleanOrDefault(saved.showLineNumbers, DEFAULT_SETTINGS.showLineNumbers),
    windowState: {
      ...DEFAULT_SETTINGS.windowState,
      ...saved.windowState,
    },
  };
}
