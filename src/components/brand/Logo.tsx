import React from "react";

/**
 * H7 모노그램 — 실제 로고 이미지(public/logo-mark.png, 알파 마스크)를 CSS mask 로 그린다.
 * 색은 currentColor 를 따르므로 라이트/다크에서 자동으로 반전된다.
 */
export function H7Mark({ className = "", title }: { className?: string; title?: string }) {
  const maskStyle: React.CSSProperties = {
    backgroundColor: "currentColor",
    WebkitMaskImage: "url(/logo-mark.png)",
    maskImage: "url(/logo-mark.png)",
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
  };
  return (
    <span
      className={`inline-block ${className}`}
      style={maskStyle}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    />
  );
}

/** 로고 박스: 라이트=검정 박스/흰 마크, 다크=흰 박스/검정 마크 (로고 원본의 반전 규칙) */
export function LogoBox({ size = 44, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-brand text-brand-fg ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <H7Mark className="h-[86%] w-[86%]" />
    </span>
  );
}

/** 워드마크 (로고 원본 표기: HARPER SEVEN) */
export function Wordmark({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <span className="min-w-0">
      <span className={`block font-bold leading-tight text-fg ${size === "md" ? "text-lg" : "text-base"}`}>하퍼세븐</span>
      <span className="block text-[10px] font-semibold uppercase tracking-[.22em] text-fg-muted">Harper Seven</span>
    </span>
  );
}
