import React from "react";

/** 카드 컨테이너 (2008/09 브로드캐스트 레트로 패널) */
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`retro-panel rounded-md p-5 ${className}`}>{children}</div>;
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
    default: "text-blue-300",
    green: "text-emerald-400",
    red: "text-rose-400",
    yellow: "text-amber-400",
    blue: "text-sky-400",
  }[tone];
  return (
    <Card>
      <div className="text-[13px] font-bold text-slate-400">{label}</div>
      <div className={`mt-2 text-[32px] font-black leading-none ${toneClass}`}>{value}</div>
      {sub && <div className="mt-2 text-xs text-slate-400">{sub}</div>}
    </Card>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-black tracking-tight text-blue-300">{children}</h2>
      {action}
    </div>
  );
}
