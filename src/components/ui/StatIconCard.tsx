import React from "react";

/** 컬러 아이콘 지표 카드 (대시보드/회원 등 공용) — 토큰 기반 */
export function StatIconCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  valueColor = "text-fg",
  sub,
  subColor = "text-fg-muted",
  className = "",
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: React.ReactNode;
  valueColor?: string;
  sub?: React.ReactNode;
  subColor?: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-line bg-surface p-4 shadow-sm dark:shadow-none ${className}`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg ${iconBg} ${iconColor}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium text-fg-muted">{label}</div>
          <div className={`whitespace-nowrap text-2xl font-bold leading-tight ${valueColor}`}>{value}</div>
          {sub && <div className={`mt-0.5 text-[11px] ${subColor}`}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}
