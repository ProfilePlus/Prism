import { create } from 'zustand';
import {
  SettingsState,
  DEFAULT_SETTINGS,
  ContentTheme,
  AppearanceMode,
  DefaultViewMode,
  ExportDefaultFormat,
  ShortcutStyle,
  AutoSaveStrategy,
  CustomFont,
  DocxFontPolicy,
  ExportDefaultLocation,
  ExportTemplateId,
  FontSource,
  LastSessionState,
  PdfMargin,
  PdfPaper,
  RecentFileEntry,
} from './types';
import { normalizeRecentFiles, normalizeSettings } from './normalize';
import { registerCustomFonts } from './fontService';
import {
  readTextFile,
  writeTextFile,
  mkdir,
  exists,
} from '@tauri-apps/plugin-fs';
import { appDataDir } from '@tauri-apps/api/path';

const CONFIG_FILENAME = 'config.json';
const LEGACY_RECENT_FILES_KEY = 'prism_recent_files';

export const autoSaveIntervalByStrategy: Record<AutoSaveStrategy, number> = {
  instant: 500,
  balanced: 2000,
  battery: 8000,
};

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

function migrateLegacyRecentFiles(limit: number): RecentFileEntry[] {
  try {
    const stored = localStorage.getItem(LEGACY_RECENT_FILES_KEY);
    if (!stored) return [];
    return normalizeRecentFiles(JSON.parse(stored), limit);
  } catch {
    return [];
  }
}

function applyContentTheme(contentTheme: ContentTheme) {
  document.documentElement.setAttribute('data-content-theme', contentTheme);
}

function resolveFontFamily(source: FontSource, customFonts: CustomFont[], fallback: string): string {
  if (source.kind === 'theme') return fallback;
  if (source.kind === 'custom') {
    return customFonts.find((font) => font.id === source.value)?.family ?? fallback;
  }
  return source.value || fallback;
}

interface SettingsStore extends SettingsState {
  setTheme: (theme: AppearanceMode) => void;
  setContentTheme: (theme: ContentTheme) => void;
  setFontSize: (size: number) => void;
  setEditorFontFamily: (family: string) => void;
  setEditorLineHeight: (lineHeight: number) => void;
  setPreviewFontFamily: (family: string) => void;
  setPreviewFontSize: (size: number) => void;
  setEditorFontSource: (source: FontSource) => void;
  setPreviewFontSource: (source: FontSource) => void;
  addCustomFont: (font: CustomFont) => void;
  removeCustomFont: (fontId: string) => void;
  setDefaultViewMode: (viewMode: DefaultViewMode) => void;
  setExportDefaultFormat: (format: ExportDefaultFormat) => void;
  setExportPngScale: (scale: number) => void;
  setExportHtmlIncludeTheme: (includeTheme: boolean) => void;
  setExportPdfPaper: (paper: PdfPaper) => void;
  setExportPdfMargin: (margin: PdfMargin) => void;
  setExportTemplateId: (templateId: ExportTemplateId) => void;
  setExportDefaultLocation: (location: ExportDefaultLocation) => void;
  setExportCustomDirectory: (directory: string) => void;
  setExportDocxFontPolicy: (policy: DocxFontPolicy) => void;
  setExportDocxCustomFontId: (fontId: string) => void;
  setShortcutStyle: (style: ShortcutStyle) => void;
  setAutoSaveEnabled: (enabled: boolean) => void;
  setAutoSaveInterval: (interval: number) => void;
  setAutoSaveStrategy: (strategy: AutoSaveStrategy) => void;
  setShowLineNumbers: (show: boolean) => void;
  setWordWrap: (wordWrap: boolean) => void;
  addRecentFile: (path: string, name: string) => void;
  clearRecentFiles: () => void;
  setRecentFilesLimit: (limit: number) => void;
  setRestoreLastSession: (restore: boolean) => void;
  setLastSession: (session: LastSessionState | null) => void;
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
    applyContentTheme(contentTheme);
    set({ contentTheme });
    get().saveSettings();
  },

  setFontSize: (fontSize) => {
    set({ fontSize });
    get().saveSettings();
  },

  setEditorFontFamily: (editorFontFamily) => {
    set({
      editorFontFamily,
      editorFontSource: { kind: 'builtin', value: editorFontFamily },
    });
    get().saveSettings();
  },

  setEditorLineHeight: (editorLineHeight) => {
    set({ editorLineHeight });
    get().saveSettings();
  },

  setPreviewFontFamily: (previewFontFamily) => {
    set({
      previewFontFamily,
      previewFontSource: previewFontFamily === 'inherit'
        ? { kind: 'theme', value: '' }
        : { kind: 'builtin', value: previewFontFamily },
    });
    get().saveSettings();
  },

  setPreviewFontSize: (previewFontSize) => {
    set({ previewFontSize });
    get().saveSettings();
  },

  setEditorFontSource: (editorFontSource) => {
    const state = get();
    set({
      editorFontSource,
      editorFontFamily: resolveFontFamily(
        editorFontSource,
        state.customFonts,
        DEFAULT_SETTINGS.editorFontFamily,
      ),
    });
    get().saveSettings();
  },

  setPreviewFontSource: (previewFontSource) => {
    const state = get();
    set({
      previewFontSource,
      previewFontFamily: previewFontSource.kind === 'theme'
        ? 'inherit'
        : resolveFontFamily(previewFontSource, state.customFonts, DEFAULT_SETTINGS.previewFontFamily),
    });
    get().saveSettings();
  },

  addCustomFont: (font) => {
    set((state) => ({
      customFonts: [
        font,
        ...state.customFonts.filter((item) => item.id !== font.id && item.path !== font.path),
      ],
    }));
    get().saveSettings();
  },

  removeCustomFont: (fontId) => {
    set((state) => {
      const customFonts = state.customFonts.filter((font) => font.id !== fontId);
      const editorFontSource = state.editorFontSource.kind === 'custom' && state.editorFontSource.value === fontId
        ? DEFAULT_SETTINGS.editorFontSource
        : state.editorFontSource;
      const previewFontSource = state.previewFontSource.kind === 'custom' && state.previewFontSource.value === fontId
        ? DEFAULT_SETTINGS.previewFontSource
        : state.previewFontSource;
      const docxCustomFontId = state.exportDefaults.docxCustomFontId === fontId
        ? ''
        : state.exportDefaults.docxCustomFontId;

      return {
        customFonts,
        editorFontSource,
        previewFontSource,
        editorFontFamily: resolveFontFamily(editorFontSource, customFonts, DEFAULT_SETTINGS.editorFontFamily),
        previewFontFamily: previewFontSource.kind === 'theme'
          ? 'inherit'
          : resolveFontFamily(previewFontSource, customFonts, DEFAULT_SETTINGS.previewFontFamily),
        exportDefaults: { ...state.exportDefaults, docxCustomFontId },
      };
    });
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

  setExportPdfPaper: (pdfPaper) => {
    set((state) => ({ exportDefaults: { ...state.exportDefaults, pdfPaper } }));
    get().saveSettings();
  },

  setExportPdfMargin: (pdfMargin) => {
    set((state) => ({ exportDefaults: { ...state.exportDefaults, pdfMargin } }));
    get().saveSettings();
  },

  setExportTemplateId: (templateId) => {
    set((state) => ({ exportDefaults: { ...state.exportDefaults, templateId } }));
    get().saveSettings();
  },

  setExportDefaultLocation: (defaultLocation) => {
    set((state) => ({ exportDefaults: { ...state.exportDefaults, defaultLocation } }));
    get().saveSettings();
  },

  setExportCustomDirectory: (customDirectory) => {
    set((state) => ({ exportDefaults: { ...state.exportDefaults, customDirectory } }));
    get().saveSettings();
  },

  setExportDocxFontPolicy: (docxFontPolicy) => {
    set((state) => ({ exportDefaults: { ...state.exportDefaults, docxFontPolicy } }));
    get().saveSettings();
  },

  setExportDocxCustomFontId: (docxCustomFontId) => {
    set((state) => ({ exportDefaults: { ...state.exportDefaults, docxCustomFontId } }));
    get().saveSettings();
  },

  setShortcutStyle: (shortcutStyle) => {
    set({ shortcutStyle });
    get().saveSettings();
  },

  setAutoSaveEnabled: (autoSaveEnabled) => {
    set({ autoSaveEnabled });
    get().saveSettings();
  },

  setAutoSaveInterval: (autoSaveInterval) => {
    set({ autoSaveInterval });
    get().saveSettings();
  },

  setAutoSaveStrategy: (autoSaveStrategy) => {
    set({
      autoSaveStrategy,
      autoSaveInterval: autoSaveIntervalByStrategy[autoSaveStrategy],
    });
    get().saveSettings();
  },

  setShowLineNumbers: (showLineNumbers) => {
    set({ showLineNumbers });
    get().saveSettings();
  },

  setWordWrap: (wordWrap) => {
    set({ wordWrap });
    get().saveSettings();
  },

  addRecentFile: (path, name) => {
    set((state) => {
      const recentFiles = normalizeRecentFiles([
        { path, name, lastOpened: Date.now() },
        ...state.recentFiles,
      ], state.recentFilesLimit);
      try {
        localStorage.setItem(LEGACY_RECENT_FILES_KEY, JSON.stringify(recentFiles));
      } catch {
        // Settings persistence remains the primary source.
      }
      return { recentFiles };
    });
    get().saveSettings();
  },

  clearRecentFiles: () => {
    try {
      localStorage.removeItem(LEGACY_RECENT_FILES_KEY);
    } catch {
      // Ignore localStorage compatibility failures.
    }
    set({ recentFiles: [] });
    get().saveSettings();
  },

  setRecentFilesLimit: (recentFilesLimit) => {
    const limit = Math.min(20, Math.max(5, recentFilesLimit));
    set((state) => ({
      recentFilesLimit: limit,
      recentFiles: normalizeRecentFiles(state.recentFiles, limit),
    }));
    get().saveSettings();
  },

  setRestoreLastSession: (restoreLastSession) => {
    set({ restoreLastSession });
    get().saveSettings();
  },

  setLastSession: (lastSession) => {
    set({ lastSession });
    get().saveSettings();
  },

  loadSettings: async () => {
    try {
      const configPath = await getConfigPath();
      const raw = await readTextFile(configPath);
      const saved = JSON.parse(raw) as Partial<SettingsState>;
      const settings = normalizeSettings(saved);
      if (!saved.recentFiles) {
        settings.recentFiles = migrateLegacyRecentFiles(settings.recentFilesLimit);
      }

      set(settings);

      applyAppearanceTheme(settings.theme);
      applyContentTheme(settings.contentTheme);
      void registerCustomFonts(settings.customFonts);

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
      applyAppearanceTheme(DEFAULT_SETTINGS.theme);
      applyContentTheme(DEFAULT_SETTINGS.contentTheme);

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
        autoSaveEnabled,
        autoSaveInterval,
        autoSaveStrategy,
        showLineNumbers,
        wordWrap,
        customFonts,
        editorFontSource,
        previewFontSource,
        recentFiles,
        recentFilesLimit,
        restoreLastSession,
        lastSession,
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
          autoSaveEnabled,
          autoSaveInterval,
          autoSaveStrategy,
          showLineNumbers,
          wordWrap,
          customFonts,
          editorFontSource,
          previewFontSource,
          recentFiles,
          recentFilesLimit,
          restoreLastSession,
          lastSession,
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
