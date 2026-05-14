import { exportDocxAdapter } from './adapters/docx';
import { exportHtmlAdapter } from './adapters/html';
import { exportPdfAdapter } from './adapters/pdf';
import { exportPngAdapter } from './adapters/png';
import type { ExportDocumentInput, ExportFormat } from './types';

export type { ExportDocumentInput, ExportFormat } from './types';
export { getExportFormatLabel } from './types';

export async function exportDocument(
  input: ExportDocumentInput,
  format: ExportFormat,
  outputPath?: string,
) {
  switch (format) {
    case 'html':
      return exportHtmlAdapter(input, outputPath);
    case 'pdf':
      return exportPdfAdapter(input, outputPath);
    case 'docx':
      return exportDocxAdapter(input, outputPath);
    case 'png':
      return exportPngAdapter(input, outputPath);
    default:
      throw new Error('不支持的导出格式');
  }
}
