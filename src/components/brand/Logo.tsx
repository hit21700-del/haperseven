import React from "react";

/**
 * H7 모노그램 — 로고 원본(검정 바탕 + 흰 H/7, 사선 컷)을 SVG로 재구성.
 * 글리프는 currentColor, 사선 컷은 `cut`(바탕색)으로 그린다.
 */
export function H7Mark({
  className = "",
  cut = "var(--logo-bg, #000)",
  title,
}: {
  className?: string;
  cut?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {/* H 왼쪽 기둥 */}
      <rect x="6" y="11" width="11" height="42" fill="currentColor" />
      {/* H 가로대 → 7로 연결 */}
      <rect x="17" y="29" width="14" height="9" fill="currentColor" />
      {/* 7 */}
      <polygon points="26,11 59,11 59,20 41,53 29,53 45,20 26,20" fill="currentColor" />
      {/* 사선 컷 (스피드 라인) */}
      <polygon points="21,46 37,18 40,18 24,46" fill={cut} />
      <polygon points="28,50 44,22 47,22 31,50" fill={cut} />
    </svg>
  );
}

/** 로고 박스: 라이트=검정 박스/흰 마크, 다크=흰 박스/검정 마크 */
export function LogoBox({ size = 44, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-brand text-brand-fg ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <H7Mark className="h-[72%] w-[72%]" cut="rgb(var(--c-brand))" />
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
