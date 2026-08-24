import React from "react";

/** 카드 컨테이너 — 앱의 유일한 카드 셸 (radius 12px, 토큰 기반 라이트/다크) */
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5 dark:shadow-none ${className}`}>
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
    default: "text-fg",
    green: "text-emerald-700 dark:text-emerald-400",
    red: "text-red-600 dark:text-red-400",
    yellow: "text-amber-700 dark:text-amber-400",
    blue: "text-sky-700 dark:text-sky-400",
  }[tone];
  return (
    <Card>
      <div className="text-xs font-medium text-fg-muted">{label}</div>
      <div className={`mt-2 whitespace-nowrap text-2xl font-bold leading-none ${toneClass}`}>{value}</div>
      {sub && <div className="mt-2 text-xs text-fg-muted">{sub}</div>}
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
      <h2 className="flex min-w-0 items-center gap-2 text-base font-bold text-fg">
        {icon && (
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand"
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
