import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EXPORT_WORKER_PROGRESS_EVENT,
  EXPORT_WORKER_READY_EVENT,
  EXPORT_WORKER_RESULT_EVENT,
  EXPORT_WORKER_RUN_EVENT,
} from './workerProtocol';
import type { ExportDocumentInput } from './types';

const tauriEventMock = vi.hoisted(() => {
  const listeners = new Map<string, Array<(event: { payload: any }) => void>>();
  return {
    listeners,
    emitTo: vi.fn(async (_label: string, _event: string, _payload: any) => undefined),
    listen: vi.fn(async (event: string, callback: (event: { payload: any }) => void) => {
      const callbacks = listeners.get(event) ?? [];
      callbacks.push(callback);
      listeners.set(event, callbacks);
      return vi.fn();
    }),
    dispatch(event: string, payload: any) {
      for (const callback of listeners.get(event) ?? []) {
        callback({ payload });
      }
    },
    reset() {
      listeners.clear();
      this.emitTo.mockClear();
      this.listen.mockClear();
    },
  };
});

const webviewMock = vi.hoisted(() => {
  const close = vi.fn(async () => undefined);
  const once = vi.fn(async () => vi.fn());
  const outerPosition = vi.fn(async () => ({ x: 100, y: 200 }));
  const WebviewWindow = vi.fn(function MockWebviewWindow(this: any, label: string, options: any) {
    this.label = label;
    this.options = options;
    this.close = close;
    this.once = once;
  });
  return {
    close,
    once,
    outerPosition,
    WebviewWindow,
    getCurrentWebviewWindow: vi.fn(() => ({ label: 'main', outerPosition })),
    reset() {
      close.mockClear();
      once.mockClear();
      outerPosition.mockClear();
      WebviewWindow.mockClear();
      this.getCurrentWebviewWindow.mockClear();
      this.getCurrentWebviewWindow.mockReturnValue({ label: 'main', outerPosition });
    },
  };
});

vi.mock('@tauri-apps/api/event', () => ({
  emitTo: tauriEventMock.emitTo,
  listen: tauriEventMock.listen,
}));

vi.mock('@tauri-apps/api/webviewWindow', () => ({
  getCurrentWebviewWindow: webviewMock.getCurrentWebviewWindow,
  WebviewWindow: webviewMock.WebviewWindow,
}));

vi.mock('@tauri-apps/api/window', () => ({
  BackgroundThrottlingPolicy: {
    Disabled: 'disabled',
    Throttle: 'throttle',
    Suspend: 'suspend',
  },
}));

import { exportDocumentInIsolatedWebview } from './isolatedWebviewExport';

function createInput(overrides: Partial<ExportDocumentInput> = {}): ExportDocumentInput {
  return {
    content: '# Export',
    filename: 'export.md',
    contentTheme: 'miaoyan',
    ...overrides,
  };
}

function getCreatedWorker() {
  const call = webviewMock.WebviewWindow.mock.calls[0];
  if (!call) throw new Error('worker was not created');
  return {
    label: call[0] as string,
    options: call[1] as Record<string, unknown>,
  };
}

describe('exportDocumentInIsolatedWebview', () => {
  beforeEach(() => {
    tauriEventMock.reset();
    webviewMock.reset();
  });

  it('parks the worker behind the main window instead of an offscreen hidden position', async () => {
    const exportPromise = exportDocumentInIsolatedWebview(createInput(), 'html', '/tmp/export.html');

    await vi.waitFor(() => expect(webviewMock.WebviewWindow).toHaveBeenCalled());
    const worker = getCreatedWorker();
    tauriEventMock.dispatch(EXPORT_WORKER_READY_EVENT, { label: worker.label });

    await vi.waitFor(() => expect(tauriEventMock.emitTo).toHaveBeenCalledWith(
      worker.label,
      EXPORT_WORKER_RUN_EVENT,
      expect.objectContaining({ outputPath: '/tmp/export.html' }),
    ));
    const runPayload = tauriEventMock.emitTo.mock.calls[0][2] as { taskId: string };
    tauriEventMock.dispatch(EXPORT_WORKER_RESULT_EVENT, {
      taskId: runPayload.taskId,
      ok: true,
      exported: true,
    });

    await expect(exportPromise).resolves.toBe(true);
    expect(worker.options).toEqual(expect.objectContaining({
      x: 112,
      y: 212,
      width: 24,
      height: 24,
      visible: true,
      alwaysOnBottom: true,
      backgroundThrottling: 'disabled',
    }));
  });

  it('rejects when the worker stops reporting progress', async () => {
    vi.useFakeTimers();
    const onProgress = vi.fn();

    try {
      const exportPromise = exportDocumentInIsolatedWebview(
        createInput({ onProgress }),
        'html',
        '/tmp/stalled.html',
      );

      await vi.waitFor(() => expect(webviewMock.WebviewWindow).toHaveBeenCalled());
      const worker = getCreatedWorker();
      tauriEventMock.dispatch(EXPORT_WORKER_READY_EVENT, { label: worker.label });
      await vi.waitFor(() => expect(tauriEventMock.emitTo).toHaveBeenCalled());
      const runPayload = tauriEventMock.emitTo.mock.calls[0][2] as { taskId: string };
      tauriEventMock.dispatch(EXPORT_WORKER_PROGRESS_EVENT, {
        taskId: runPayload.taskId,
        message: '正在渲染图表 1 / 20',
      });

      const assertion = expect(exportPromise).rejects.toThrow('超过 90 秒没有进度');
      await vi.advanceTimersByTimeAsync(90_000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }

    expect(onProgress).toHaveBeenCalledWith('正在渲染图表 1 / 20');
    expect(webviewMock.close).toHaveBeenCalled();
  });
});
