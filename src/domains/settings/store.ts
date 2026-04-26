import { create } from 'zustand';
import { SettingsState, DEFAULT_SETTINGS } from './types';
import {
  readTextFile,
  writeTextFile,
  mkdir,
  exists,
} from '@tauri-apps/plugin-fs';
import { appDataDir } from '@tauri-apps/api/path';

const CONFIG_FILENAME = 'config.json';

async function getConfigPath(): Promise<string> {
  const appData = await appDataDir();
  return `${appData}${CONFIG_FILENAME}`;
}

interface SettingsStore extends SettingsState {
  setTheme: (theme: 'light' | 'dark') => void;
  setFontSize: (size: number) => void;
  setEditorFontFamily: (family: string) => void;
  setAutoSaveInterval: (interval: number) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULT_SETTINGS,

  setTheme: (theme) => {
    set({ theme });
    document.body.className = theme;
    get().saveSettings();
  },

  setFontSize: (fontSize) => {
    set({ fontSize });
    get().saveSettings();
  },

  setEditorFontFamily: (editorFontFamily) => {
    set({ editorFontFamily });
    get().saveSettings();
  },

  setAutoSaveInterval: (autoSaveInterval) => {
    set({ autoSaveInterval });
    get().saveSettings();
  },

  loadSettings: async () => {
    try {
      const configPath = await getConfigPath();
      const raw = await readTextFile(configPath);
      const saved = JSON.parse(raw) as Partial<SettingsState>;

      set({ ...DEFAULT_SETTINGS, ...saved });

      if (saved.theme) {
        document.body.className = saved.theme;
      }

      console.log('[Settings] Loaded from:', configPath);
    } catch {
      console.log('[Settings] No config found, using defaults');
    }
  },

  saveSettings: async () => {
    try {
      const appData = await appDataDir();
      const dirExists = await exists(appData);
      if (!dirExists) {
        await mkdir(appData, { recursive: true });
      }

      const configPath = await getConfigPath();
      const { theme, fontSize, editorFontFamily, autoSaveInterval, windowState } = get();
      const data = JSON.stringify(
        { theme, fontSize, editorFontFamily, autoSaveInterval, windowState },
        null,
        2,
      );

      await writeTextFile(configPath, data);
      console.log('[Settings] Saved to:', configPath);
    } catch (err) {
      console.error('[Settings] Save failed:', err);
    }
  },
}));
