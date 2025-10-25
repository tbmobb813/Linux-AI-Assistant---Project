import { create } from "zustand";

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type Toast = {
  id: string;
  message: string;
  type?: "info" | "success" | "error";
  ttl?: number; // ms
  action?: ToastAction;
};

interface UiState {
  toasts: Toast[];
  addToast: (t: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  addToast: (t) => {
    const id = `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const toast: Toast = { id, ...t };
    set((s) => ({ toasts: [...s.toasts, toast] }));
    if (toast.ttl && toast.ttl > 0) {
      setTimeout(
        () => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
        toast.ttl,
      );
    }
    return id;
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
