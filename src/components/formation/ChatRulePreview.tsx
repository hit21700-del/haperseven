"use client";
import React from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { ParsedFormationChatResult } from "@/types/chat";
import type { Member } from "@/types/member";
import { describeRule } from "@/lib/formation/ruleDescription";

/** AI 가 해석한 규칙 미리보기 + '조건 적용' 버튼 */
export function ChatRulePreview({
  result,
  members,
  onApply,
}: {
  result: ParsedFormationChatResult;
  members: Member[];
  onApply: () => void;
}) {
  const actionTone =
    result.suggestedAction === "APPLY_RULES" ? "green" : result.suggestedAction === "ASK_CLARIFICATION" ? "yellow" : "gray";
  const actionLabel = {
    APPLY_RULES: "규칙 적용 권장",
    ASK_CLARIFICATION: "추가 확인 필요",
    NO_CHANGE: "변경 없음",
  }[result.suggestedAction];

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-gray-700">AI 해석 결과</span>
        <Badge tone={actionTone as "green" | "yellow" | "gray"}>{actionLabel}</Badge>
      </div>

      <p className="mb-2 text-gray-700">{result.assistantMessage}</p>

      {result.parsedRules.length > 0 && (
        <div className="mb-2">
          <div className="mb-1 text-xs font-medium text-gray-500">적용할 규칙</div>
          <ul className="space-y-1">
            {result.parsedRules.map((r) => (
              <li key={r.id} className="rounded bg-white px-2 py-1 text-xs text-gray-700">
                • {describeRule(r, members)}
                {"reason" in r && r.reason ? <span className="text-gray-400"> ({r.reason})</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.warnings.length > 0 && (
        <div className="mb-2 text-xs text-yellow-700">
          {result.warnings.map((w, i) => (
            <div key={i}>⚠ {w}</div>
          ))}
        </div>
      )}

      {result.parsedRules.length > 0 && result.suggestedAction !== "NO_CHANGE" && (
        <Button onClick={onApply} className="mt-1 w-full">
          조건 적용
        </Button>
      )}
    </div>
  );
}
