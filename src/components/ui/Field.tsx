import React from "react";

const baseInput =
  "w-full rounded-sm border border-slate-400/70 bg-gradient-to-b from-white to-slate-300 px-3 py-2 text-sm font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400";

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-xs font-bold text-slate-300">{children}</label>;
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${baseInput} ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${baseInput} ${props.className ?? ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${baseInput} ${props.className ?? ""}`} />;
}

/** 라벨 + 필드 묶음 */
export function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
