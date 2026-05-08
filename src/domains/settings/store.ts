import { create } from 'zustand';
import { SettingsState, DEFAULT_SETTINGS, ContentTheme, AppearanceMode } from './types';
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
  setTheme: (theme: AppearanceMode) => void;
  setContentTheme: (theme: ContentTheme) => void;
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
    // 更新 body class，主要影响 UI 外壳
    const classes = Array.from(document.body.classList).filter(c => c !== 'light' && c !== 'dark');
    document.body.className = [...classes, theme].join(' ');
    get().saveSettings();
  },

  setContentTheme: (contentTheme) => {
    set({ contentTheme });
    
    // 设置 data-theme 属性，主要影响内容预览区
    document.documentElement.setAttribute('data-content-theme', contentTheme);
    
    // 如果设置了 Night 主题，自动切换 UI 到深色模式，反之切换到浅色模式
    if (contentTheme === 'night') {
      get().setTheme('dark');
    } else {
      get().setTheme('light');
    }
    
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

      // 应用保存的主题
      if (saved.theme) {
        document.body.classList.add(saved.theme);
      }
      if (saved.contentTheme) {
        document.documentElement.setAttribute('data-content-theme', saved.contentTheme);
      }

      console.log('[Settings] Loaded from:', configPath);
    } catch {
      console.log('[Settings] No config found, using defaults');
      // 默认应用
      document.body.classList.add(DEFAULT_SETTINGS.theme);
      document.documentElement.setAttribute('data-content-theme', DEFAULT_SETTINGS.contentTheme);
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
      const { theme, contentTheme, fontSize, editorFontFamily, autoSaveInterval, windowState } = get();
      const data = JSON.stringify(
        { theme, contentTheme, fontSize, editorFontFamily, autoSaveInterval, windowState },
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
