import React from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "bg-brand text-brand-fg hover:bg-brand-hover",
  secondary: "border border-line bg-surface text-fg-2 hover:bg-surface-2",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "bg-transparent text-fg-2 hover:bg-surface-3 hover:text-fg",
};

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={props.type ?? "button"}
      className={`inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition-[background-color,color,border-color,transform] duration-150 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${VARIANT_CLASS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/** 아이콘 전용 버튼 — 최소 40px 히트 영역, aria-label 필수 */
export function IconButton({
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { "aria-label": string }) {
  return (
    <button
      type={props.type ?? "button"}
      className={`inline-grid h-10 w-10 place-items-center rounded-lg text-fg-muted transition-colors duration-150 hover:bg-surface-3 hover:text-fg active:scale-[0.97] ${className}`}
      {...props}
    />
  );
}
