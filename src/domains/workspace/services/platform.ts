export type RuntimePlatform = 'mac' | 'windows' | 'linux';

export function getRuntimePlatform(
  nav: Pick<Navigator, 'platform' | 'userAgent'> | undefined =
    typeof navigator === 'undefined' ? undefined : navigator,
): RuntimePlatform {
  if (!nav) return 'mac';

  const platform = nav.platform.toLowerCase();
  const userAgent = nav.userAgent.toLowerCase();

  if (platform.includes('mac') || userAgent.includes('mac os')) return 'mac';
  if (platform.includes('win') || userAgent.includes('windows')) return 'windows';
  return 'linux';
}

export function getFileManagerName(platform: RuntimePlatform = getRuntimePlatform()): string {
  if (platform === 'mac') return '访达';
  if (platform === 'windows') return '资源管理器';
  return '文件管理器';
}

export function getShowInFileManagerLabel(platform: RuntimePlatform = getRuntimePlatform()): string {
  return `在${getFileManagerName(platform)}中显示`;
}
