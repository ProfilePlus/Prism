export interface SettingsState {
  theme: 'light' | 'dark';
  fontSize: number;
  editorFontFamily: string;
  autoSaveInterval: number;
  windowState: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
}

export const DEFAULT_SETTINGS: SettingsState = {
  theme: 'light',
  fontSize: 16,
  editorFontFamily: 'Cascadia Code, Consolas, monospace',
  autoSaveInterval: 2000,
  windowState: {
    width: 1200,
    height: 800,
    x: 100,
    y: 100,
  },
};
