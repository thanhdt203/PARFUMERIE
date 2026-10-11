import { create } from 'zustand';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastState {
  toasts: ToastItem[];
  push: (tone: ToastTone, message: string) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;
const AUTO_DISMISS_MS: Record<ToastTone, number> = { success: 4000, info: 4000, error: 7000 };

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (tone, message) => {
    const id = nextId;
    nextId += 1;
    set({ toasts: [...get().toasts, { id, tone, message }] });
    setTimeout(() => get().dismiss(id), AUTO_DISMISS_MS[tone]);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((item) => item.id !== id) }),
}));

/** Dùng ở bất kỳ đâu (kể cả ngoài component): toast.success('Đã lưu') */
export const toast = {
  success: (message: string) => useToastStore.getState().push('success', message),
  error: (message: string) => useToastStore.getState().push('error', message),
  info: (message: string) => useToastStore.getState().push('info', message),
};
