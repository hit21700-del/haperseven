import React from "react";

/** 반응형 테이블 래퍼 (가로 스크롤 지원) — 아카브릿지 스타일 */
export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <table className="w-full min-w-[600px] border-collapse overflow-hidden bg-white text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-gray-200 bg-gradient-to-b from-[#f4f5fb] to-[#eaecf6] text-left text-[13px] font-semibold text-gray-600">
      {children}
    </thead>
  );
}

export function TH({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <th className={`whitespace-nowrap px-4 py-3 font-semibold ${className}`}>{children}</th>;
}

export function TD({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`whitespace-nowrap px-4 py-3 text-[#333] ${className}`}>{children}</td>;
}

export function TR({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <tr className={`border-b border-[#f0f0f0] last:border-b-0 ${className}`}>{children}</tr>;
}
