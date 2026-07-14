import React from "react";

/** 카드 컨테이너 (ilgoli/FEDA 스타일) */
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-gray-100 bg-white p-5 shadow-[0_2px_8px_rgba(17,17,40,0.06)] ${className}`}>
      {children}
    </div>
  );
}

/** 지표 카드 (대시보드용) — 큰 숫자 강조 */
export function StatCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "default" | "green" | "red" | "yellow" | "blue";
}) {
  const toneClass = {
    default: "text-brand-600",
    green: "text-[#27ae60]",
    red: "text-[#e74c3c]",
    yellow: "text-[#e1a100]",
    blue: "text-[#2f6fed]",
  }[tone];
  return (
    <Card>
      <div className="text-[13px] text-gray-500">{label}</div>
      <div className={`mt-2 text-[32px] font-bold leading-none ${toneClass}`}>{value}</div>
      {sub && <div className="mt-2 text-xs text-gray-400">{sub}</div>}
    </Card>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-bold text-brand-600">{children}</h2>
      {action}
    </div>
  );
}
