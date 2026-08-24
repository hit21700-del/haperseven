import React from "react";

/** 반응형 테이블 래퍼 (가로 스크롤 지원) — 토큰 기반 라이트/다크 */
export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[600px] border-collapse overflow-hidden bg-surface text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-line bg-surface-2 text-left text-[13px] font-semibold text-fg-muted">{children}</thead>
  );
}

export function TH({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={`whitespace-nowrap px-4 py-3 font-semibold ${className}`}>
      {children}
    </th>
  );
}

export function TD({
  children,
  className = "",
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={`whitespace-nowrap px-4 py-3 text-fg-2 ${className}`}>
      {children}
    </td>
  );
}

export function TR({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <tr className={`border-b border-line-soft last:border-b-0 hover:bg-surface-2 ${className}`}>{children}</tr>;
}
