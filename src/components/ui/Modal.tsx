"use client";
import React from "react";

/** 모달 다이얼로그 (레트로 다크 패널) */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={onClose} />
      <div className="retro-panel relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-md shadow-panel">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h3 className="text-base font-black tracking-tight text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
