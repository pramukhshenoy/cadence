export type ToastType = 'error' | 'info';
export type Toast = { id: string; message: string; type: ToastType };
type Listener = (toast: Toast) => void;

let nextId = 0;
let listeners: Listener[] = [];

export function showToast(message: string, type: ToastType = 'error'): void {
  const toast: Toast = { id: String(nextId++), message, type };
  listeners.forEach((fn) => fn(toast));
}

export function subscribeToToasts(listener: Listener): () => void {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((fn) => fn !== listener);
  };
}
