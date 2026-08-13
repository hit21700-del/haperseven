"use client";
import React from "react";
import type { FormationPlan } from "@/types/formation";

/** 규칙 위반/경고/배정 사유 표시 */
export function FormationWarnings({ plan }: { plan: FormationPlan }) {
  const hasWarnings = plan.warnings.length > 0;
  const hasViolations = plan.ruleViolations.length > 0;

  return (
    <div className="space-y-3">
      {hasViolations && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-4 text-rose-300">
          <h3 className="mb-1 text-sm font-semibold text-rose-300">⚠ 규칙 위반</h3>
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-rose-300">
            {plan.ruleViolations.map((v, i) => (
              <li key={i}>{v.message}</li>
            ))}
          </ul>
        </div>
      )}

      {hasWarnings && (
        <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-amber-300">
          <h3 className="mb-1 text-sm font-semibold text-amber-300">경고 / 충돌</h3>
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-amber-300">
            {plan.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {plan.reasons.length > 0 && (
        <div className="rounded-xl border border-sky-400/20 bg-sky-500/10 p-4 text-sky-300">
          <h3 className="mb-1 text-sm font-semibold text-sky-300">자동 배정 사유</h3>
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-sky-300">
            {plan.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {!hasWarnings && !hasViolations && (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-emerald-300">
          <p className="text-sm text-emerald-300">✅ 규칙 위반이나 경고가 없습니다.</p>
        </div>
      )}
    </div>
  );
}
