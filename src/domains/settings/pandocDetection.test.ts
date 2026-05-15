import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
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

describe('pandoc detection settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({
      ...DEFAULT_SETTINGS,
      saveSettings: vi.fn(),
    });
  });

  it('invokes the controlled Tauri command and stores a successful detection', async () => {
    (invoke as ReturnType<typeof vi.fn>).mockResolvedValue({
      path: '/opt/homebrew/bin/pandoc',
      detected: true,
      version: 'pandoc 3.2.1',
      lastCheckedAt: 123,
      lastError: '',
    });
    useSettingsStore.setState({
      pandoc: {
        ...DEFAULT_SETTINGS.pandoc,
        path: '/opt/homebrew/bin/pandoc',
      },
    });

    const result = await useSettingsStore.getState().detectPandoc();

    expect(invoke).toHaveBeenCalledWith('detect_pandoc', {
      path: '/opt/homebrew/bin/pandoc',
    });
    expect(result).toMatchObject({
      path: '/opt/homebrew/bin/pandoc',
      detected: true,
      version: 'pandoc 3.2.1',
      lastError: '',
    });
    expect(useSettingsStore.getState().pandoc).toEqual(result);
    expect(useSettingsStore.getState().saveSettings).toHaveBeenCalled();
  });

  it('records a failed detection when the Tauri command rejects', async () => {
    (invoke as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('command not found'));

    const result = await useSettingsStore.getState().detectPandoc();

    expect(invoke).toHaveBeenCalledWith('detect_pandoc', { path: null });
    expect(result.detected).toBe(false);
    expect(result.version).toBe('');
    expect(result.lastCheckedAt).toEqual(expect.any(Number));
    expect(result.lastError).toContain('command not found');
    expect(useSettingsStore.getState().saveSettings).toHaveBeenCalled();
  });
});
