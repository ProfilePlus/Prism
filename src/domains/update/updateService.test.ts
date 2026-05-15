import { beforeEach, describe, expect, it, vi } from 'vitest';
import { check } from '@tauri-apps/plugin-updater';
import { checkForAppUpdate } from './updateService';

vi.mock('@tauri-apps/plugin-updater', () => ({
  check: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('checkForAppUpdate', () => {
  it('returns none when updater has no update', async () => {
    (check as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(checkForAppUpdate()).resolves.toEqual({ status: 'none' });
    expect(check).toHaveBeenCalledWith({ timeout: 15000 });
  });

  it('normalizes available update metadata', async () => {
    (check as ReturnType<typeof vi.fn>).mockResolvedValue({
      currentVersion: '1.4.0',
      version: '1.4.1',
      date: '2026-05-14T00:00:00Z',
      body: 'Bug fixes',
    });

    await expect(checkForAppUpdate()).resolves.toEqual({
      status: 'available',
      currentVersion: '1.4.0',
      version: '1.4.1',
      date: '2026-05-14T00:00:00Z',
      body: 'Bug fixes',
    });
  });
});
