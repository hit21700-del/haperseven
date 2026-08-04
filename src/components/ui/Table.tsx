import React from "react";

/** 반응형 테이블 래퍼 (가로 스크롤 지원) — 레트로 다크 */
export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full overflow-x-auto rounded-md border border-slate-400/40 shadow-panel">
      <table className="w-full min-w-[600px] border-collapse overflow-hidden bg-black/25 text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-slate-400/40 bg-gradient-to-b from-[#18254b] to-[#0a1430] text-left text-[13px] font-black text-slate-300">
      {children}
    </thead>
  );
}

export function TH({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <th className={`whitespace-nowrap px-4 py-3 font-black ${className}`}>{children}</th>;
}

export function TD({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`whitespace-nowrap px-4 py-3 text-slate-200 ${className}`}>{children}</td>;
}

export function TR({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <tr className={`border-b border-white/10 last:border-b-0 hover:bg-white/5 ${className}`}>{children}</tr>;
}
