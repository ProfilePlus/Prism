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
      ...DEFAULT_SETTINGS.exportDefaults,
      format: 'docx',
      pngScale: 3,
      htmlIncludeTheme: false,
    });
  });

  it('normalizes 1.0.3 export, autosave, font and session fields', () => {
    const settings = normalizeSettings({
      autoSaveEnabled: false,
      autoSaveInterval: 8000,
      exportDefaults: {
        ...DEFAULT_SETTINGS.exportDefaults,
        templateId: 'academic',
        pdfPaper: 'letter',
        pdfMargin: 'compact',
        defaultLocation: 'custom',
        customDirectory: '/tmp/exports',
        docxFontPolicy: 'custom',
        docxCustomFontId: 'font-1',
      },
      customFonts: [{
        id: 'font-1',
        family: 'Prism Demo',
        displayName: 'Demo',
        filename: 'demo.ttf',
        path: '/tmp/demo.ttf',
        format: 'ttf',
        importedAt: 1,
      }],
      previewFontSource: { kind: 'custom', value: 'font-1' },
      recentFilesLimit: 5,
      recentFiles: [
        { path: '/tmp/a.md', name: 'a.md', lastOpened: 1 },
        { path: '/tmp/b.md', name: 'b.md', lastOpened: 2 },
      ],
      restoreLastSession: false,
      lastSession: {
        filePath: '/tmp/b.md',
        folderPath: '/tmp',
        viewMode: 'split',
        sidebarVisible: false,
        sidebarTab: 'files',
        updatedAt: 3,
      },
    });

    expect(settings.autoSaveEnabled).toBe(false);
    expect(settings.autoSaveStrategy).toBe('battery');
    expect(settings.exportDefaults).toMatchObject({
      templateId: 'academic',
      pdfPaper: 'letter',
      pdfMargin: 'compact',
      defaultLocation: 'custom',
      customDirectory: '/tmp/exports',
      docxFontPolicy: 'custom',
      docxCustomFontId: 'font-1',
    });
    expect(settings.customFonts).toHaveLength(1);
    expect(settings.previewFontSource).toEqual({ kind: 'custom', value: 'font-1' });
    expect(settings.recentFiles.map((file) => file.name)).toEqual(['b.md', 'a.md']);
    expect(settings.restoreLastSession).toBe(false);
    expect(settings.lastSession?.viewMode).toBe('split');
  });
});
