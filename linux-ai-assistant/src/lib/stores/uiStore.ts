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
  // Run output modal
  runModal: {
    open: boolean;
    stdout: string;
    stderr: string;
    exit_code?: number | null;
    timed_out?: boolean;
  };
  showRunResult: (r: {
    stdout: string;
    stderr: string;
    exit_code?: number | null;
    timed_out?: boolean;
  }) => void;
  closeRunResult: () => void;
  // Execution audit modal
  auditModal: {
    open: boolean;
    content: string;
    loading: boolean;
  };
  showAudit: (content: string) => void;
  closeAudit: () => void;
  // Command suggestions modal
  suggestionsModal: {
    open: boolean;
    items: string[];
  };
  showSuggestions: (items: string[]) => void;
  closeSuggestions: () => void;
  // Code execution confirmation dialog
  codeExecutionDialog: {
    open: boolean;
    code: string;
    language: string;
    onConfirm: (() => void) | null;
  };
  showCodeExecutionDialog: (
    code: string,
    language: string,
    onConfirm: () => void,
  ) => void;
  closeCodeExecutionDialog: () => void;
  confirmCodeExecution: () => void;
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
  runModal: {
    open: false,
    stdout: "",
    stderr: "",
    exit_code: null,
    timed_out: false,
  },
  // Execution audit modal
  auditModal: {
    open: false,
    content: "",
    loading: false,
  },
  showAudit: (content: string) =>
    set(() => ({
      auditModal: { open: true, content, loading: false },
    })),
  closeAudit: () =>
    set(() => ({ auditModal: { open: false, content: "", loading: false } })),
  suggestionsModal: {
    open: false,
    items: [],
  },
  showSuggestions: (items: string[]) =>
    set(() => ({ suggestionsModal: { open: true, items } })),
  closeSuggestions: () =>
    set(() => ({ suggestionsModal: { open: false, items: [] } })),
  showRunResult: (r) =>
    set(() => ({
      runModal: {
        open: true,
        stdout: r.stdout || "",
        stderr: r.stderr || "",
        exit_code: r.exit_code ?? null,
        timed_out: r.timed_out ?? false,
      },
    })),
  closeRunResult: () =>
    set(() => ({
      runModal: {
        open: false,
        stdout: "",
        stderr: "",
        exit_code: null,
        timed_out: false,
      },
    })),
  codeExecutionDialog: {
    open: false,
    code: "",
    language: "",
    onConfirm: null,
  },
  showCodeExecutionDialog: (
    code: string,
    language: string,
    onConfirm: () => void,
  ) =>
    set(() => ({
      codeExecutionDialog: {
        open: true,
        code,
        language,
        onConfirm,
      },
    })),
  closeCodeExecutionDialog: () =>
    set(() => ({
      codeExecutionDialog: {
        open: false,
        code: "",
        language: "",
        onConfirm: null,
      },
    })),
  confirmCodeExecution: () => {
    const { codeExecutionDialog } = useUiStore.getState();
    if (codeExecutionDialog.onConfirm) {
      codeExecutionDialog.onConfirm();
    }
    set(() => ({
      codeExecutionDialog: {
        open: false,
        code: "",
        language: "",
        onConfirm: null,
      },
    }));
  },
}));
