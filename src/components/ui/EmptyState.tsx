import React from "react";

/** 공용 빈 상태 — 아이콘 + 제목 + 다음 행동 안내 (+ CTA) */
export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? "py-6" : "py-10"}`}>
      {icon && (
        <span
          className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500"
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
