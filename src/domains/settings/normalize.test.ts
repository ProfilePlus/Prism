import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type SettingsState } from './types';
import { normalizeSettings } from './normalize';

describe('normalizeSettings', () => {
  it('fills missing 1.0.3 fields from defaults for old configs', () => {
    const settings = normalizeSettings({
      theme: 'dark',
      contentTheme: 'miaoyan',
      fontSize: 18,
      editorFontFamily: 'Menlo',
      autoSaveInterval: 3000,
      showLineNumbers: true,
      windowState: { width: 900, height: 700, x: 10, y: 20 },
    });

    expect(settings.theme).toBe('dark');
    expect(settings.fontSize).toBe(18);
    expect(settings.editorLineHeight).toBe(DEFAULT_SETTINGS.editorLineHeight);
    expect(settings.previewFontFamily).toBe(DEFAULT_SETTINGS.previewFontFamily);
    expect(settings.previewFontSize).toBe(DEFAULT_SETTINGS.previewFontSize);
    expect(settings.defaultViewMode).toBe(DEFAULT_SETTINGS.defaultViewMode);
    expect(settings.exportDefaults).toEqual(DEFAULT_SETTINGS.exportDefaults);
    expect(settings.shortcutStyle).toBe(DEFAULT_SETTINGS.shortcutStyle);
  });

  it('rejects invalid persisted values and keeps valid nested export defaults', () => {
    const settings = normalizeSettings({
      theme: 'sepia',
      contentTheme: 'unknown',
      fontSize: Number.NaN,
      editorLineHeight: 99,
      previewFontSize: 'large',
      defaultViewMode: 'reader',
      shortcutStyle: 'linux',
      showLineNumbers: 'yes',
      exportDefaults: {
        format: 'docx',
        pngScale: 3,
        htmlIncludeTheme: false,
      },
    } as unknown as Partial<SettingsState>);

    expect(settings.theme).toBe(DEFAULT_SETTINGS.theme);
    expect(settings.contentTheme).toBe(DEFAULT_SETTINGS.contentTheme);
    expect(settings.fontSize).toBe(DEFAULT_SETTINGS.fontSize);
    expect(settings.editorLineHeight).toBe(3);
    expect(settings.previewFontSize).toBe(DEFAULT_SETTINGS.previewFontSize);
    expect(settings.defaultViewMode).toBe(DEFAULT_SETTINGS.defaultViewMode);
    expect(settings.shortcutStyle).toBe(DEFAULT_SETTINGS.shortcutStyle);
    expect(settings.showLineNumbers).toBe(DEFAULT_SETTINGS.showLineNumbers);
    expect(settings.exportDefaults).toEqual({
      format: 'docx',
      pngScale: 3,
      htmlIncludeTheme: false,
    });
  });
});
