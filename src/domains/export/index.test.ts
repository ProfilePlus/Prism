import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportDocument } from './index';
import type { ExportDocumentInput } from './types';

const exportMocks = vi.hoisted(() => ({
  local: vi.fn(),
  isolated: vi.fn(),
}));

vi.mock('./localExport', () => ({
  exportDocumentLocal: exportMocks.local,
}));

vi.mock('./isolatedWebviewExport', () => ({
  exportDocumentInIsolatedWebview: exportMocks.isolated,
}));

type PrismExportWindow = Window & {
  __TAURI_INTERNALS__?: unknown;
  __PRISM_EXPORT_WORKER__?: boolean;
};

function createInput(): ExportDocumentInput {
  return {
    content: '# Export',
    filename: 'export.md',
    contentTheme: 'miaoyan',
  };
}

describe('exportDocument', () => {
  beforeEach(() => {
    exportMocks.local.mockReset().mockResolvedValue(true);
    exportMocks.isolated.mockReset().mockResolvedValue(true);
    delete (window as PrismExportWindow).__TAURI_INTERNALS__;
    delete (window as PrismExportWindow).__PRISM_EXPORT_WORKER__;
  });

  it('uses the local export pipeline outside the Tauri runtime', async () => {
    const input = createInput();

    await expect(exportDocument(input, 'html', '/tmp/export.html')).resolves.toBe(true);

    expect(exportMocks.local).toHaveBeenCalledWith(input, 'html', '/tmp/export.html');
    expect(exportMocks.isolated).not.toHaveBeenCalled();
  });

  it('uses an isolated WebView for Tauri main-window exports with an output path', async () => {
    const input = createInput();
    (window as PrismExportWindow).__TAURI_INTERNALS__ = {};

    await expect(exportDocument(input, 'pdf', '/tmp/export.pdf')).resolves.toBe(true);

    expect(exportMocks.isolated).toHaveBeenCalledWith(input, 'pdf', '/tmp/export.pdf');
    expect(exportMocks.local).not.toHaveBeenCalled();
  });

  it('keeps export worker windows on the local pipeline to avoid recursive workers', async () => {
    const input = createInput();
    (window as PrismExportWindow).__TAURI_INTERNALS__ = {};
    (window as PrismExportWindow).__PRISM_EXPORT_WORKER__ = true;

    await expect(exportDocument(input, 'png', '/tmp/export.png')).resolves.toBe(true);

    expect(exportMocks.local).toHaveBeenCalledWith(input, 'png', '/tmp/export.png');
    expect(exportMocks.isolated).not.toHaveBeenCalled();
  });

  it('keeps dialog-driven local exports on the local pipeline until a path exists', async () => {
    const input = createInput();
    (window as PrismExportWindow).__TAURI_INTERNALS__ = {};

    await expect(exportDocument(input, 'docx')).resolves.toBe(true);

    expect(exportMocks.local).toHaveBeenCalledWith(input, 'docx', undefined);
    expect(exportMocks.isolated).not.toHaveBeenCalled();
  });
});
