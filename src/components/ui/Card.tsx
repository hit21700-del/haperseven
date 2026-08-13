import React from "react";

/** 카드 컨테이너 (라이트 SaaS) */
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
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
    green: "text-emerald-600",
    red: "text-red-500",
    yellow: "text-amber-600",
    blue: "text-sky-600",
  }[tone];
  return (
    <Card>
      <div className="text-[13px] font-medium text-gray-500">{label}</div>
      <div className={`mt-2 text-[30px] font-bold leading-none ${toneClass}`}>{value}</div>
      {sub && <div className="mt-2 text-xs text-gray-400">{sub}</div>}
    </Card>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-bold text-gray-900">{children}</h2>
      {action}
    </div>
  );
}
