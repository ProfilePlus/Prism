import type {
  CustomFont,
  DocxFontPolicy,
  ExportTemplateId,
  PdfMargin,
  SettingsState,
} from '../settings/types';
import { docxThemeByContentTheme } from './exportSettings';
import type { ExportDocumentInput } from './types';

export interface ExportTemplate {
  id: ExportTemplateId;
  label: string;
  description: string;
  pdfMargin: PdfMargin;
  docxFontPolicy: DocxFontPolicy;
  codeStyle: 'theme' | 'boxed' | 'plain';
  tableStyle: 'theme' | 'grid' | 'minimal';
}

export const EXPORT_TEMPLATES: Record<ExportTemplateId, ExportTemplate> = {
  theme: {
    id: 'theme',
    label: '跟随主题',
    description: '尽量保持当前写作主题的视觉风格。',
    pdfMargin: 'standard',
    docxFontPolicy: 'theme',
    codeStyle: 'theme',
    tableStyle: 'theme',
  },
  business: {
    id: 'business',
    label: '商务文档',
    description: '更宽边距、清晰表格边线，适合正式交付。',
    pdfMargin: 'wide',
    docxFontPolicy: 'preview',
    codeStyle: 'boxed',
    tableStyle: 'grid',
  },
  plain: {
    id: 'plain',
    label: '纯净兼容',
    description: '减少装饰和背景，适合外发或平台粘贴。',
    pdfMargin: 'standard',
    docxFontPolicy: 'theme',
    codeStyle: 'plain',
    tableStyle: 'minimal',
  },
  academic: {
    id: 'academic',
    label: '长文论文',
    description: '标题层级更稳，引用和脚注更适合长文。',
    pdfMargin: 'compact',
    docxFontPolicy: 'preview',
    codeStyle: 'boxed',
    tableStyle: 'grid',
  },
};

export interface ResolvedExportOptions extends ExportDocumentInput {
  templateId: ExportTemplateId;
  codeStyle: ExportTemplate['codeStyle'];
  tableStyle: ExportTemplate['tableStyle'];
}

function resolveDocxFont(settings: SettingsState) {
  const themeFont = docxThemeByContentTheme[settings.contentTheme].font;
  const policy = settings.exportDefaults.docxFontPolicy;
  let customFont: CustomFont | undefined;

  if (policy === 'preview') {
    if (settings.previewFontSource.kind === 'custom') {
      customFont = settings.customFonts.find((font) => font.id === settings.previewFontSource.value);
    }

    return {
      family: customFont?.family ?? (settings.previewFontFamily === 'inherit' ? themeFont : settings.previewFontFamily),
      customFont,
    };
  }

  if (policy === 'custom') {
    customFont = settings.customFonts.find((font) => font.id === settings.exportDefaults.docxCustomFontId);
    return {
      family: customFont?.family ?? themeFont,
      customFont,
    };
  }

  return { family: themeFont, customFont: undefined };
}

export function resolveExportOptions(input: {
  content: string;
  filename: string;
  settings: SettingsState;
  onProgress?: (message: string) => void;
  onWarning?: (message: string) => void;
}): ResolvedExportOptions {
  const template = EXPORT_TEMPLATES[input.settings.exportDefaults.templateId] ?? EXPORT_TEMPLATES.theme;
  const docxFont = resolveDocxFont(input.settings);

  return {
    content: input.content,
    filename: input.filename,
    contentTheme: input.settings.contentTheme,
    htmlIncludeTheme: input.settings.exportDefaults.htmlIncludeTheme,
    pngScale: input.settings.exportDefaults.pngScale,
    pdfPaper: input.settings.exportDefaults.pdfPaper,
    pdfMargin: input.settings.exportDefaults.pdfMargin || template.pdfMargin,
    templateId: template.id,
    codeStyle: template.codeStyle,
    tableStyle: template.tableStyle,
    docxFontFamily: docxFont.family,
    docxFontFile: docxFont.customFont
      ? {
          filename: docxFont.customFont.filename,
          path: docxFont.customFont.path,
          format: docxFont.customFont.format,
        }
      : undefined,
    docxFontPolicy: input.settings.exportDefaults.docxFontPolicy || template.docxFontPolicy,
    onProgress: input.onProgress,
    onWarning: input.onWarning,
  };
}
