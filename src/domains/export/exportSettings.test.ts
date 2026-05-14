import { describe, expect, it } from 'vitest';
import { CONTENT_THEMES } from '../settings/types';
import { docxThemeByContentTheme, mermaidFontByTheme, writeClassByTheme } from './exportSettings';
import { getExportFormatLabel } from './types';

describe('export domain settings', () => {
  it('covers every content theme with export tokens', () => {
    for (const theme of CONTENT_THEMES) {
      expect(writeClassByTheme[theme]).toBeTruthy();
      expect(docxThemeByContentTheme[theme].font).toBeTruthy();
      expect(docxThemeByContentTheme[theme].codeFont).toBeTruthy();
      expect(mermaidFontByTheme[theme]).toBeTruthy();
    }
  });

  it('exposes stable format labels', () => {
    expect(getExportFormatLabel('html')).toBe('HTML');
    expect(getExportFormatLabel('pdf')).toBe('PDF');
    expect(getExportFormatLabel('docx')).toBe('Word');
    expect(getExportFormatLabel('png')).toBe('PNG 图像');
  });
});
