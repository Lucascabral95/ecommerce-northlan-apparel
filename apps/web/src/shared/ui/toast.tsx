'use client';

import { create } from 'zustand';
import { createStableId } from '../lib/id';

type ToastTone = 'error' | 'success';
type ToastMessage = Readonly<{
  id: string;
  message: string;
  tone: ToastTone;
}>;

type ToastState = {
  messages: ToastMessage[];
  push: (message: string, tone?: ToastTone) => void;
  remove: (id: string) => void;
};

export const useToastStore = create<ToastState>((set) => ({
  messages: [],
  push: (message, tone = 'success') => {
    const id = createStableId('toast');
    set((state) => ({
      messages: [...state.messages, { id, message, tone }],
    }));
    window.setTimeout(() => {
      set((state) => ({
        messages: state.messages.filter((toast) => toast.id !== id),
      }));
    }, 3_800);
  },
  remove: (id) =>
    set((state) => ({
      messages: state.messages.filter((toast) => toast.id !== id),
    })),
}));

export function ToastViewport() {
  const messages = useToastStore((state) => state.messages);
  const remove = useToastStore((state) => state.remove);

  return (
    <aside className="pointer-events-none fixed right-4 top-20 z-50 grid w-[min(24rem,calc(100vw-2rem))] gap-2">
      {messages.map((toast) => (
        <button
          className={`pointer-events-auto rounded-2xl border px-4 py-3 text-left text-sm shadow-2xl backdrop-blur ${
            toast.tone === 'error'
              ? 'border-red-950/20 bg-red-100/90 text-red-950'
              : 'border-emerald-950/15 bg-[#e8ead8]/92 text-emerald-950'
          }`}
          key={toast.id}
          onClick={() => remove(toast.id)}
          type="button"
        >
          {toast.message}
        </button>
      ))}
    </aside>
  );
}
