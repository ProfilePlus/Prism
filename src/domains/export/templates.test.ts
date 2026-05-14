import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type SettingsState } from '../settings/types';
import { EXPORT_TEMPLATES, resolveExportOptions } from './templates';

function createSettings(overrides: Partial<SettingsState> = {}): SettingsState {
  return {
    ...DEFAULT_SETTINGS,
    ...overrides,
    exportDefaults: {
      ...DEFAULT_SETTINGS.exportDefaults,
      ...overrides.exportDefaults,
    },
  };
}

describe('export templates', () => {
  it('defines the four built-in export templates', () => {
    expect(Object.keys(EXPORT_TEMPLATES)).toEqual(['theme', 'business', 'plain', 'academic']);
    expect(EXPORT_TEMPLATES.business.pdfMargin).toBe('wide');
    expect(EXPORT_TEMPLATES.plain.codeStyle).toBe('plain');
    expect(EXPORT_TEMPLATES.academic.tableStyle).toBe('grid');
  });

  it('resolves export options from settings', () => {
    const options = resolveExportOptions({
      content: '# Title',
      filename: 'demo.md',
      settings: createSettings({
        contentTheme: 'slate',
        exportDefaults: {
          ...DEFAULT_SETTINGS.exportDefaults,
          templateId: 'business',
          pdfPaper: 'letter',
          pdfMargin: 'wide',
          pngScale: 3,
          htmlIncludeTheme: false,
          docxFontPolicy: 'preview',
        },
      }),
    });

    expect(options).toMatchObject({
      contentTheme: 'slate',
      templateId: 'business',
      pdfPaper: 'letter',
      pdfMargin: 'wide',
      pngScale: 3,
      htmlIncludeTheme: false,
      codeStyle: 'boxed',
      tableStyle: 'grid',
      docxFontPolicy: 'preview',
    });
  });

  it('uses imported preview font for DOCX when requested', () => {
    const options = resolveExportOptions({
      content: 'hello',
      filename: 'font.md',
      settings: createSettings({
        previewFontFamily: 'Prism Demo',
        previewFontSource: { kind: 'custom', value: 'font-1' },
        customFonts: [{
          id: 'font-1',
          family: 'Prism Demo',
          displayName: 'Demo',
          filename: 'demo.ttf',
          path: '/tmp/demo.ttf',
          format: 'ttf',
          importedAt: 1,
        }],
        exportDefaults: {
          ...DEFAULT_SETTINGS.exportDefaults,
          docxFontPolicy: 'preview',
        },
      }),
    });

    expect(options.docxFontFamily).toBe('Prism Demo');
    expect(options.docxFontFile).toEqual({
      filename: 'demo.ttf',
      path: '/tmp/demo.ttf',
      format: 'ttf',
    });
  });
});
