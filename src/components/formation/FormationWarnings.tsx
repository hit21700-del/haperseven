"use client";
import React from "react";
import { Card } from "@/components/ui/Card";
import type { FormationPlan } from "@/types/formation";

/** 규칙 위반/경고/배정 사유 표시 */
export function FormationWarnings({ plan }: { plan: FormationPlan }) {
  const hasWarnings = plan.warnings.length > 0;
  const hasViolations = plan.ruleViolations.length > 0;

  return (
    <div className="space-y-3">
      {hasViolations && (
        <Card className="border-rose-400/40 bg-rose-500/10">
          <h3 className="mb-1 text-sm font-semibold text-rose-300">⚠ 규칙 위반</h3>
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-rose-300">
            {plan.ruleViolations.map((v, i) => (
              <li key={i}>{v.message}</li>
            ))}
          </ul>
        </Card>
      )}

      {hasWarnings && (
        <Card className="border-amber-400/40 bg-amber-500/10">
          <h3 className="mb-1 text-sm font-semibold text-amber-300">경고 / 충돌</h3>
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-amber-300">
            {plan.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </Card>
      )}

      {plan.reasons.length > 0 && (
        <Card className="border-sky-400/40 bg-sky-500/10">
          <h3 className="mb-1 text-sm font-semibold text-sky-300">자동 배정 사유</h3>
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-sky-300">
            {plan.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </Card>
      )}

      {!hasWarnings && !hasViolations && (
        <Card className="border-emerald-400/40 bg-emerald-500/10">
          <p className="text-sm text-emerald-300">✅ 규칙 위반이나 경고가 없습니다.</p>
        </Card>
      )}
    </div>
  );
}
