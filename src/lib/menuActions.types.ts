import { useDocumentStore } from '../domains/document/store';
import { useSettingsStore } from '../domains/settings/store';
import { useWorkspaceStore } from '../domains/workspace/store';
import type { ExportFormat } from './exportDocument';

export interface MenuActionContext {
  documentStore: ReturnType<typeof useDocumentStore.getState>;
  settingsStore: ReturnType<typeof useSettingsStore.getState>;
  workspaceStore: ReturnType<typeof useWorkspaceStore.getState>;
  showToast?: (message: string) => void;
  requestExportPath?: (input: {
    format: ExportFormat;
    filename: string;
    documentPath?: string;
  }) => Promise<string | null>;
  requestSavePath?: (input: {
    filename: string;
    documentPath?: string;
  }) => Promise<string | null>;
}

export type MenuAction = string;
