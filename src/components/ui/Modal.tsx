"use client";
import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/** 모달 다이얼로그 — ESC 닫기, 포커스 트랩/복귀, 배경 inert + 스크롤 잠금, 진입 모션 */
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
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    // 배경 콘텐츠 비활성화 + 스크롤 잠금
    const roots = [...document.querySelectorAll<HTMLElement>("body > *:not([data-modal-root])")];
    roots.forEach((el) => el.setAttribute("inert", ""));
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      roots.forEach((el) => el.removeAttribute("inert"));
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  // body 직속으로 렌더해야 배경(inert) 처리에서 모달 자신이 제외된다
  return createPortal(
    <div
      data-modal-root=""
      className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="absolute inset-0 animate-fade-in bg-gray-900/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl animate-modal-in flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-xl outline-none overscroll-contain"
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 py-2 pl-5 pr-2">
          <h3 id={titleId} className="min-w-0 text-base font-bold text-gray-900">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="닫기"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
