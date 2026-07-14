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
        <Card className="border-red-200 bg-red-50">
          <h3 className="mb-1 text-sm font-semibold text-red-700">⚠ 규칙 위반</h3>
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-red-700">
            {plan.ruleViolations.map((v, i) => (
              <li key={i}>{v.message}</li>
            ))}
          </ul>
        </Card>
      )}

      {hasWarnings && (
        <Card className="border-yellow-200 bg-yellow-50">
          <h3 className="mb-1 text-sm font-semibold text-yellow-700">경고 / 충돌</h3>
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-yellow-700">
            {plan.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </Card>
      )}

      {plan.reasons.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <h3 className="mb-1 text-sm font-semibold text-blue-700">자동 배정 사유</h3>
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-blue-700">
            {plan.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </Card>
      )}

      {!hasWarnings && !hasViolations && (
        <Card className="border-green-200 bg-green-50">
          <p className="text-sm text-green-700">✅ 규칙 위반이나 경고가 없습니다.</p>
        </Card>
      )}
    </div>
  );
}
