import type { ExportDocumentInput, ExportFormat } from './types';

export const EXPORT_WORKER_READY_EVENT = 'prism-export-worker-ready';
export const EXPORT_WORKER_RUN_EVENT = 'prism-export-worker-run';
export const EXPORT_WORKER_PROGRESS_EVENT = 'prism-export-worker-progress';
export const EXPORT_WORKER_WARNING_EVENT = 'prism-export-worker-warning';
export const EXPORT_WORKER_RESULT_EVENT = 'prism-export-worker-result';

export type SerializableExportDocumentInput = Omit<ExportDocumentInput, 'onProgress' | 'onWarning'>;

export interface ExportWorkerReadyPayload {
  label: string;
}

export interface ExportWorkerRunPayload {
  taskId: string;
  replyTarget: string;
  input: SerializableExportDocumentInput;
  format: ExportFormat;
  outputPath?: string;
}

export interface ExportWorkerProgressPayload {
  taskId: string;
  message: string;
}

export interface ExportWorkerWarningPayload {
  taskId: string;
  message: string;
}

export type ExportWorkerResultPayload =
  | {
      taskId: string;
      ok: true;
      exported: boolean;
    }
  | {
      taskId: string;
      ok: false;
      message: string;
      stack?: string;
    };
