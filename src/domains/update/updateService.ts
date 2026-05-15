import { check } from '@tauri-apps/plugin-updater';

export interface AvailableUpdate {
  status: 'available';
  currentVersion: string;
  version: string;
  date?: string;
  body?: string;
}

export interface NoUpdate {
  status: 'none';
}

export type UpdateCheckResult = AvailableUpdate | NoUpdate;

export async function checkForAppUpdate(): Promise<UpdateCheckResult> {
  const update = await check({ timeout: 15000 });
  if (!update) return { status: 'none' };

  return {
    status: 'available',
    currentVersion: update.currentVersion,
    version: update.version,
    date: update.date,
    body: update.body,
  };
}
