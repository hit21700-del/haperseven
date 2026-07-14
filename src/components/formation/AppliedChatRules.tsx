"use client";
import React from "react";
import { Badge } from "@/components/ui/Badge";
import type { ChatFormationRule } from "@/types/chat";
import type { Member } from "@/types/member";
import { describeRule } from "@/lib/formation/ruleDescription";

/** 현재 적용 중인 채팅 규칙 목록 */
export function AppliedChatRules({
  rules,
  members,
  onRemove,
  onClear,
}: {
  rules: ChatFormationRule[];
  members: Member[];
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  if (rules.length === 0) {
    return <p className="text-xs text-gray-400">적용 중인 채팅 규칙이 없습니다.</p>;
  }
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">적용 중인 규칙 ({rules.length})</span>
        <button onClick={onClear} className="text-xs text-red-400 hover:text-red-600">
          전체 초기화
        </button>
      </div>
      <ul className="flex flex-wrap gap-1">
        {rules.map((r) => (
          <li key={r.id} className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
            {describeRule(r, members)}
            <button onClick={() => onRemove(r.id)} className="text-brand-400 hover:text-red-500" aria-label="삭제">
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
