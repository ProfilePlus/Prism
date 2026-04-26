import { useDocumentStore } from '../domains/document/store';
import { useSettingsStore } from '../domains/settings/store';
import { useWorkspaceStore } from '../domains/workspace/store';

export interface MenuActionContext {
  documentStore: ReturnType<typeof useDocumentStore.getState>;
  settingsStore: ReturnType<typeof useSettingsStore.getState>;
  workspaceStore: ReturnType<typeof useWorkspaceStore.getState>;
  showToast?: (message: string) => void;
}

export type MenuAction = string;
