"use client";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; message: string };

const ToastContext = createContext<(message: string, kind?: ToastKind) => void>(() => {});

/** 비차단 알림 — window.alert 대체. 성공/오류/정보, 4초 후 자동 소멸 */
export function useToast() {
  return useContext(ToastContext);
}

const ICON: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 size={18} className="text-emerald-600" aria-hidden="true" />,
  error: <AlertCircle size={18} className="text-red-600" aria-hidden="true" />,
  info: <Info size={18} className="text-brand-600" aria-hidden="true" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const push = useCallback((message: string, kind: ToastKind = "success") => {
    const id = ++seq.current;
    setToasts((prev) => [...prev.slice(-2), { id, kind, message }]);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDone={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, toast.kind === "error" ? 6000 : 4000);
    return () => clearTimeout(timer);
  }, [onDone, toast.kind]);
  return (
    <div className="pointer-events-auto flex max-w-md animate-toast-in items-start gap-2.5 rounded-xl border border-line bg-white px-4 py-3 text-sm text-gray-800 shadow-lg">
      {ICON[toast.kind]}
      <span className="whitespace-pre-line">{toast.message}</span>
    </div>
  );
}
