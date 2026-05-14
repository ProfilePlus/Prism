import { create } from 'zustand';
import {
  SettingsState,
  DEFAULT_SETTINGS,
  ContentTheme,
  AppearanceMode,
  DefaultViewMode,
  ExportDefaultFormat,
  ShortcutStyle,
} from './types';
import { normalizeSettings } from './normalize';
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

function applyAppearanceTheme(theme: AppearanceMode) {
  let actualTheme: 'light' | 'dark' = 'light';
  if (theme === 'auto') {
    actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } else {
    actualTheme = theme;
  }

  const classes = Array.from(document.body.classList).filter(c => c !== 'light' && c !== 'dark');
  document.body.className = [...classes, actualTheme].join(' ');
}

interface SettingsStore extends SettingsState {
  setTheme: (theme: AppearanceMode) => void;
  setContentTheme: (theme: ContentTheme) => void;
  setFontSize: (size: number) => void;
  setEditorFontFamily: (family: string) => void;
  setEditorLineHeight: (lineHeight: number) => void;
  setPreviewFontFamily: (family: string) => void;
  setPreviewFontSize: (size: number) => void;
  setDefaultViewMode: (viewMode: DefaultViewMode) => void;
  setExportDefaultFormat: (format: ExportDefaultFormat) => void;
  setExportPngScale: (scale: number) => void;
  setExportHtmlIncludeTheme: (includeTheme: boolean) => void;
  setShortcutStyle: (style: ShortcutStyle) => void;
  setAutoSaveInterval: (interval: number) => void;
  setShowLineNumbers: (show: boolean) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULT_SETTINGS,

  setTheme: (theme) => {
    set({ theme });
    applyAppearanceTheme(theme);
    get().saveSettings();
  },

  setContentTheme: (contentTheme) => {
    document.documentElement.setAttribute('data-content-theme', contentTheme);
    set({ contentTheme });
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

  setEditorLineHeight: (editorLineHeight) => {
    set({ editorLineHeight });
    get().saveSettings();
  },

  setPreviewFontFamily: (previewFontFamily) => {
    set({ previewFontFamily });
    get().saveSettings();
  },

  setPreviewFontSize: (previewFontSize) => {
    set({ previewFontSize });
    get().saveSettings();
  },

  setDefaultViewMode: (defaultViewMode) => {
    set({ defaultViewMode });
    get().saveSettings();
  },

  setExportDefaultFormat: (format) => {
    set((state) => ({ exportDefaults: { ...state.exportDefaults, format } }));
    get().saveSettings();
  },

  setExportPngScale: (pngScale) => {
    set((state) => ({ exportDefaults: { ...state.exportDefaults, pngScale } }));
    get().saveSettings();
  },

  setExportHtmlIncludeTheme: (htmlIncludeTheme) => {
    set((state) => ({ exportDefaults: { ...state.exportDefaults, htmlIncludeTheme } }));
    get().saveSettings();
  },

  setShortcutStyle: (shortcutStyle) => {
    set({ shortcutStyle });
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
      const settings = normalizeSettings(saved);

      set(settings);

      // 应用保存的主题
      applyAppearanceTheme(settings.theme);

      document.documentElement.setAttribute('data-content-theme', settings.contentTheme);

      // 监听系统主题变化
      if (settings.theme === 'auto') {
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
      applyAppearanceTheme(DEFAULT_SETTINGS.theme);
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
      const {
        theme,
        contentTheme,
        fontSize,
        editorFontFamily,
        editorLineHeight,
        previewFontFamily,
        previewFontSize,
        defaultViewMode,
        exportDefaults,
        shortcutStyle,
        autoSaveInterval,
        showLineNumbers,
        windowState,
      } = get();
      const data = JSON.stringify(
        {
          theme,
          contentTheme,
          fontSize,
          editorFontFamily,
          editorLineHeight,
          previewFontFamily,
          previewFontSize,
          defaultViewMode,
          exportDefaults,
          shortcutStyle,
          autoSaveInterval,
          showLineNumbers,
          windowState,
        },
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
