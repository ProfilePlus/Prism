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
  setShowLineNumbers: (show: boolean) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULT_SETTINGS,

  setTheme: (theme) => {
    set({ theme });

    // 计算实际应用的主题
    let actualTheme: 'light' | 'dark' = 'light';
    if (theme === 'auto') {
      actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      actualTheme = theme;
    }

    // 更新 body class，主要影响 UI 外壳
    const classes = Array.from(document.body.classList).filter(c => c !== 'light' && c !== 'dark');
    document.body.className = [...classes, actualTheme].join(' ');
    get().saveSettings();
  },

  setContentTheme: (contentTheme) => {
    set({ contentTheme });
    document.documentElement.setAttribute('data-content-theme', contentTheme);
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

  setShowLineNumbers: (showLineNumbers) => {
    set({ showLineNumbers });
    get().saveSettings();
  },

  loadSettings: async () => {
    try {
      const configPath = await getConfigPath();
      const raw = await readTextFile(configPath);
      const saved = JSON.parse(raw) as Partial<SettingsState>;

      set({ ...DEFAULT_SETTINGS, ...saved });

      // 应用保存的主题
      const theme = saved.theme || DEFAULT_SETTINGS.theme;
      let actualTheme: 'light' | 'dark' = 'light';
      if (theme === 'auto') {
        actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        actualTheme = theme as 'light' | 'dark';
      }
      document.body.classList.add(actualTheme);

      if (saved.contentTheme) {
        document.documentElement.setAttribute('data-content-theme', saved.contentTheme);
      }

      // 监听系统主题变化
      if (theme === 'auto') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => {
          const newTheme = e.matches ? 'dark' : 'light';
          const classes = Array.from(document.body.classList).filter(c => c !== 'light' && c !== 'dark');
          document.body.className = [...classes, newTheme].join(' ');
        };
        mediaQuery.addEventListener('change', handleChange);
      }

      console.log('[Settings] Loaded from:', configPath);
    } catch {
      console.log('[Settings] No config found, using defaults');
      // 默认应用
      const actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.body.classList.add(actualTheme);
      document.documentElement.setAttribute('data-content-theme', DEFAULT_SETTINGS.contentTheme);

      // 监听系统主题变化
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        const newTheme = e.matches ? 'dark' : 'light';
        const classes = Array.from(document.body.classList).filter(c => c !== 'light' && c !== 'dark');
        document.body.className = [...classes, newTheme].join(' ');
      };
      mediaQuery.addEventListener('change', handleChange);
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
      const { theme, contentTheme, fontSize, editorFontFamily, autoSaveInterval, showLineNumbers, windowState } = get();
      const data = JSON.stringify(
        { theme, contentTheme, fontSize, editorFontFamily, autoSaveInterval, showLineNumbers, windowState },
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
