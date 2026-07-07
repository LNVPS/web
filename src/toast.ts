import { ExternalStore } from "@snort/shared";

export type ToastType = "error" | "success" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

const EMPTY: Array<Toast> = [];

class ToastStore extends ExternalStore<Array<Toast>> {
  #toasts: Array<Toast> = [];

  takeSnapshot() {
    return this.#toasts.length === 0 ? EMPTY : [...this.#toasts];
  }

  push(message: string, type: ToastType = "error", timeoutMs = 6000) {
    const id =
      globalThis.crypto?.randomUUID?.() ??
      Math.random().toString(36).slice(2);
    this.#toasts = [...this.#toasts, { id, message, type }];
    this.notifyChange();
    if (timeoutMs > 0 && typeof window !== "undefined") {
      window.setTimeout(() => this.dismiss(id), timeoutMs);
    }
    return id;
  }

  dismiss(id: string) {
    this.#toasts = this.#toasts.filter((t) => t.id !== id);
    this.notifyChange();
  }
}

export const ToastState = new ToastStore();

/** Show an arbitrary toast message. */
export function showToast(message: string, type: ToastType = "info") {
  return ToastState.push(message, type);
}

/** Surface an error (from a rejected API call or thrown value) as a toast. */
export function showError(e: unknown, fallback = "Something went wrong") {
  const message =
    e instanceof Error
      ? e.message
      : typeof e === "string" && e.length > 0
        ? e
        : fallback;
  return ToastState.push(message, "error");
}
