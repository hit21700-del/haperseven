import React from "react";

/** 컬러 아이콘 지표 카드 (대시보드/회원 등 공용) — 라이트 */
export function StatIconCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  valueColor = "text-gray-900",
  sub,
  subColor = "text-gray-400",
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
    <div className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg ${iconBg} ${iconColor}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium text-gray-500">{label}</div>
          <div className={`text-2xl font-bold leading-tight ${valueColor}`}>{value}</div>
          {sub && <div className={`mt-0.5 text-[11px] ${subColor}`}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}
