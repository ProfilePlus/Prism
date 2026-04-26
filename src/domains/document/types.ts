export interface OpenDocument {
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
  lastSavedAt: number;
  viewMode: 'edit' | 'split' | 'preview';
  cursor?: { line: number; column: number };
}

export interface DocumentState {
  currentDocument: OpenDocument | null;
}
