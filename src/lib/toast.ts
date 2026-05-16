export type ToastTone = 'neutral' | 'success' | 'warning' | 'error';

export interface ToastAction {
  label: string;
  onClick?: () => void | Promise<void>;
  dismissOnClick?: boolean;
}

export type ToastInput = string | {
  tone?: ToastTone;
  title: string;
  message?: string;
  actions?: ToastAction[];
  durationMs?: number | null;
};

export interface ToastState {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
  actions: ToastAction[];
  durationMs: number | null;
}

let nextToastId = 1;

export function createToastState(input: ToastInput): ToastState {
  if (typeof input === 'string') {
    return {
      id: nextToastId++,
      tone: 'neutral',
      title: input,
      actions: [],
      durationMs: 2800,
    };
  }

  const hasAction = (input.actions?.length ?? 0) > 0;
  return {
    id: nextToastId++,
    tone: input.tone ?? 'neutral',
    title: input.title,
    message: input.message,
    actions: input.actions ?? [],
    durationMs: input.durationMs === undefined
      ? hasAction ? 6200 : 3600
      : input.durationMs,
  };
}
