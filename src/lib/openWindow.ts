import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

let windowCounter = 0;

export async function openPrismWindow(params: {
  filePath?: string;
  folderPath?: string;
}): Promise<void> {
  const label = `prism-${Date.now()}-${windowCounter++}`;
  const searchParams = new URLSearchParams();

  if (params.filePath) {
    searchParams.set('file', params.filePath);
  }
  if (params.folderPath) {
    searchParams.set('folder', params.folderPath);
  }

  const url = `/?${searchParams.toString()}`;

  console.log('[openPrismWindow] Creating window:', { label, url });

  const isMacOS = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);

  const webview = new WebviewWindow(label, {
    url,
    title: 'Prism',
    width: 1100,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    decorations: isMacOS,
    transparent: !isMacOS,
    titleBarStyle: isMacOS ? 'overlay' : undefined,
    hiddenTitle: isMacOS,
  });

  await webview.once('tauri://created', () => {
    console.log('[openPrismWindow] Window created:', label);
  });

  await webview.once('tauri://error', (e) => {
    console.error('[openPrismWindow] Window creation failed:', e);
  });
}
