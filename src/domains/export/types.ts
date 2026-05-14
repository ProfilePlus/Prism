import type {
  ContentTheme,
  DocxFontPolicy,
  ExportTemplateId,
  PdfMargin,
  PdfPaper,
} from '../settings/types';

export type ExportFormat = 'html' | 'pdf' | 'docx' | 'png';

export interface ExportDocumentInput {
  content: string;
  filename: string;
  contentTheme: ContentTheme;
  htmlIncludeTheme?: boolean;
  pngScale?: number;
  pdfPaper?: PdfPaper;
  pdfMargin?: PdfMargin;
  templateId?: ExportTemplateId;
  codeStyle?: 'theme' | 'boxed' | 'plain';
  tableStyle?: 'theme' | 'grid' | 'minimal';
  docxFontFamily?: string;
  docxFontFile?: {
    filename: string;
    path: string;
    format: 'ttf' | 'otf' | 'woff' | 'woff2';
  };
  docxFontPolicy?: DocxFontPolicy;
  onProgress?: (message: string) => void;
  onWarning?: (message: string) => void;
}

export const exportFormatLabels: Record<ExportFormat, string> = {
  html: 'HTML',
  pdf: 'PDF',
  docx: 'Word',
  png: 'PNG 图像',
};

export function getExportFormatLabel(format: ExportFormat) {
  return exportFormatLabels[format];
}
