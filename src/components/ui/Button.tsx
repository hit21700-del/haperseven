import React from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "chrome-button text-white",
  secondary: "silver-button text-slate-900",
  danger:
    "border border-rose-300/70 text-white bg-gradient-to-b from-rose-600 via-rose-800 to-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,.6),0_0_0_2px_rgba(0,0,0,.5)] hover:brightness-110",
  ghost: "bg-transparent text-slate-300 hover:bg-white/5 hover:text-white",
};

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1 rounded-sm px-3 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
