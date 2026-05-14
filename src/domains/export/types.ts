import type { ContentTheme } from '../settings/types';

export type ExportFormat = 'html' | 'pdf' | 'docx' | 'png';

export interface ExportDocumentInput {
  content: string;
  filename: string;
  contentTheme: ContentTheme;
  onProgress?: (message: string) => void;
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
