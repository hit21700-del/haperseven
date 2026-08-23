"use client";
import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { FormationPlan } from "@/types/formation";

/** 규칙 위반/경고/배정 사유 표시 (라이트 카드) */
export function FormationWarnings({ plan }: { plan: FormationPlan }) {
  const hasWarnings = plan.warnings.length > 0;
  const hasViolations = plan.ruleViolations.length > 0;

  return (
    <div className="space-y-3">
      {hasViolations && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700" role="alert">
          <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
            <AlertTriangle size={16} aria-hidden="true" />
            규칙 위반
          </h3>
          <ul className="list-disc space-y-0.5 pl-5 text-sm">
            {plan.ruleViolations.map((v, i) => (
              <li key={i}>{v.message}</li>
            ))}
          </ul>
        </div>
      )}

      {hasWarnings && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
          <h3 className="mb-1 text-sm font-semibold">경고 / 충돌</h3>
          <ul className="list-disc space-y-0.5 pl-5 text-sm">
            {plan.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {plan.reasons.length > 0 && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sky-700">
          <h3 className="mb-1 text-sm font-semibold">자동 배정 사유</h3>
          <ul className="list-disc space-y-0.5 pl-5 text-sm">
            {plan.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {!hasWarnings && !hasViolations && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircle2 size={16} aria-hidden="true" />
            규칙 위반이나 경고가 없습니다.
          </p>
        </div>
      )}
    </div>
  );
}
