import React from "react";

/**
 * 공용 입력 스타일. 폭은 호출부가 결정한다(w-*, flex-1). 폭 클래스가 없으면 w-full.
 * - 모바일에서 16px(iOS 포커스 줌 방지), sm 이상 14px
 * - 포커스 링은 globals.css 의 :focus-visible 규칙(브랜드색 2px)을 그대로 사용
 */
const baseInput =
  "rounded-lg border border-line bg-white px-3 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:border-brand-500 sm:text-sm";

const hasWidth = (cls: string) => /(^|\s)(w-|min-w-|max-w-|flex-1|flex-auto)/.test(cls);
const cx = (cls = "") => `${baseInput} ${hasWidth(cls) ? "" : "w-full"} ${cls}`;

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-gray-600">
      {children}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(props.className)} />;
}

/** 라벨 + 필드 묶음 — <label> 로 감싸 접근 가능한 이름과 라벨 클릭 포커스를 보장 */
export function FormRow({
  label,
  children,
  hint,
  error,
}: {
  label: string;
  children: React.ReactNode;
  /** 필드 아래 보조 설명 */
  hint?: React.ReactNode;
  /** 인라인 오류 문구 (있으면 빨간 텍스트로 표시) */
  error?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>
      {children}
      {error ? (
        <span role="alert" className="mt-1 block text-xs text-red-600">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-gray-500">{hint}</span>
      ) : null}
    </label>
  );
}
