import type { ContentTheme } from '../settings/types';
import { mapThemeContracts, type DocxThemeContract } from '../themes';

export const writeClassByTheme: Record<ContentTheme, string> = mapThemeContracts(
  (contract) => contract.export.writeClass,
);

export const docxThemeByContentTheme: Record<ContentTheme, DocxThemeContract> = mapThemeContracts(
  (contract) => contract.export.docx,
);

export type DocxTheme = (typeof docxThemeByContentTheme)[ContentTheme];

export const mermaidFontByTheme: Record<ContentTheme, string> = mapThemeContracts(
  (contract) => contract.mermaid.fontFamily,
);
