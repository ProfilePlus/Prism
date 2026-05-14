import type { AppPlatform, ShortcutBinding } from './types';

const keyLabelByCode: Record<string, string> = {
  Backquote: '`',
  Backslash: '\\',
  BracketLeft: '[',
  BracketRight: ']',
  Comma: ',',
  Digit0: '0',
  Digit1: '1',
  Digit2: '2',
  Digit3: '3',
  Digit4: '4',
  Digit5: '5',
  Digit6: '6',
  Digit7: '7',
  Digit8: '8',
  Digit9: '9',
  Equal: '=',
  Minus: '-',
  Period: '.',
  Slash: '/',
  Space: 'Space',
};

export function getCurrentPlatform(): AppPlatform {
  if (typeof navigator === 'undefined') return 'mac';

  const platform = navigator.platform.toLowerCase();
  const userAgent = navigator.userAgent.toLowerCase();

  if (platform.includes('mac') || userAgent.includes('mac os')) return 'mac';
  if (platform.includes('win') || userAgent.includes('windows')) return 'windows';
  return 'linux';
}

function getKeyLabel(code: string): string {
  if (keyLabelByCode[code]) return keyLabelByCode[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^F\d{1,2}$/.test(code)) return code;
  return code;
}

export function getShortcutLabel(
  shortcut: ShortcutBinding | undefined,
  platform: AppPlatform = getCurrentPlatform(),
): string | undefined {
  if (!shortcut) return undefined;

  if (typeof shortcut.label === 'string') return shortcut.label;
  const platformLabel = shortcut.label?.[platform];
  if (platformLabel) return platformLabel;

  const key = getKeyLabel(shortcut.code);

  if (platform === 'mac') {
    const parts: string[] = [];
    if (shortcut.ctrl) parts.push('⌃');
    if (shortcut.alt) parts.push('⌥');
    if (shortcut.shift) parts.push('⇧');
    if (shortcut.mod || shortcut.meta) parts.push('⌘');
    return `${parts.join('')}${key}`;
  }

  const parts: string[] = [];
  if (shortcut.mod || shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.alt) parts.push('Alt');
  if (shortcut.shift) parts.push('Shift');
  parts.push(key);
  return parts.join('+');
}

export function shortcutMatchesEvent(
  shortcut: ShortcutBinding,
  event: KeyboardEvent,
  platform: AppPlatform = getCurrentPlatform(),
): boolean {
  if (event.code !== shortcut.code) return false;

  const expectedCtrl = shortcut.ctrl ?? (shortcut.mod ? platform !== 'mac' : false);
  const expectedMeta = shortcut.meta ?? (shortcut.mod ? platform === 'mac' : false);
  const expectedShift = Boolean(shortcut.shift);
  const expectedAlt = Boolean(shortcut.alt);

  return event.ctrlKey === expectedCtrl
    && event.metaKey === expectedMeta
    && event.shiftKey === expectedShift
    && event.altKey === expectedAlt;
}
