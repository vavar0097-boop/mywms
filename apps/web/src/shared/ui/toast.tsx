import { X } from "lucide-react";
import { create } from "zustand";

import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastState = {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, "id">) => void;
  remove: (id: string) => void;
};

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = crypto.randomUUID();

    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          ...toast,
          id,
        },
      ],
    }));

    window.setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((item) => item.id !== id),
      }));
    }, 4200);
  },
  remove: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((item) => item.id !== id),
    }));
  },
}));

export const toast = {
  success(title: string, description?: string) {
    useToastStore.getState().push({
      title,
      description,
      variant: "success",
    });
  },
  error(title: string, description?: string) {
    useToastStore.getState().push({
      title,
      description,
      variant: "error",
    });
  },
  info(title: string, description?: string) {
    useToastStore.getState().push({
      title,
      description,
      variant: "info",
    });
  },
};

export function Toaster() {
  const { toasts, remove } = useToastStore();

  return (
    <div className="fixed right-4 top-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3">
      {toasts.map((item) => (
        <div
          key={item.id}
          className={cn(
            "rounded-2xl border bg-white p-4 shadow-soft",
            item.variant === "success" &&
              "border-green-200 ring-1 ring-green-100",
            item.variant === "error" &&
              "border-red-200 ring-1 ring-red-100",
            item.variant === "info" &&
              "border-slate-200 ring-1 ring-slate-100",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-950">
                {item.title}
              </p>

              {item.description ? (
                <p className="mt-1 text-sm text-slate-500">
                  {item.description}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => remove(item.id)}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close toast"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}