import React from "react";

/** 카드 컨테이너 — 앱의 유일한 카드 셸 (radius 12px, 보더 line, 그림자 sm) */
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-white p-4 shadow-sm sm:p-5 ${className}`}>{children}</div>;
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
    green: "text-emerald-700",
    red: "text-red-600",
    yellow: "text-amber-700",
    blue: "text-sky-700",
  }[tone];
  return (
    <Card>
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className={`mt-2 whitespace-nowrap text-2xl font-bold leading-none ${toneClass}`}>{value}</div>
      {sub && <div className="mt-2 text-xs text-gray-500">{sub}</div>}
    </Card>
  );
}

/** 섹션 제목 + 우측 액션 — 좁은 화면에서 액션이 아래로 내려가도록 wrap */
export function SectionTitle({
  children,
  action,
  icon,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex min-w-0 items-center gap-2 text-base font-bold text-gray-900">
        {icon && (
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <span className="min-w-0">{children}</span>
      </h2>
      {action}
    </div>
  );
}
