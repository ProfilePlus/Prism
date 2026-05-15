import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from './types';
import { useSettingsStore } from './store';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/path', () => ({
  appDataDir: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  exists: vi.fn(),
  mkdir: vi.fn(),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
}));

describe('citation settings store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({
      ...DEFAULT_SETTINGS,
      saveSettings: vi.fn(),
    });
  });

  it('stores bibliography and CSL paths independently', () => {
    useSettingsStore.getState().setCitationBibliographyPath(' /tmp/library.bib ');
    useSettingsStore.getState().setCitationCslStylePath(' /tmp/chinese-gb7714.csl ');

    expect(useSettingsStore.getState().citation).toEqual({
      bibliographyPath: '/tmp/library.bib',
      cslStylePath: '/tmp/chinese-gb7714.csl',
    });
    expect(useSettingsStore.getState().saveSettings).toHaveBeenCalledTimes(2);
  });

  it('normalizes bulk citation settings before saving', () => {
    useSettingsStore.getState().setCitationSettings({
      bibliographyPath: ' /tmp/zotero.json ',
      cslStylePath: ' /tmp/apa.csl ',
    });

    expect(useSettingsStore.getState().citation).toEqual({
      bibliographyPath: '/tmp/zotero.json',
      cslStylePath: '/tmp/apa.csl',
    });
    expect(useSettingsStore.getState().saveSettings).toHaveBeenCalledTimes(1);
  });
});
