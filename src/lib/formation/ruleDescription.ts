// ─────────────────────────────────────────────────────────────
// ChatFormationRule 을 사람이 읽을 수 있는 한국어 문장으로 변환
// ─────────────────────────────────────────────────────────────
import type { ChatFormationRule } from "@/types/chat";
import type { Member } from "@/types/member";

export function describeRule(rule: ChatFormationRule, members: Member[]): string {
  const nameOf = (id?: string, name?: string) => {
    if (id) return members.find((m) => m.id === id)?.name ?? name ?? id;
    return name ?? "?";
  };
  switch (rule.type) {
    case "FORCE_REST":
      return `${nameOf(rule.memberId, rule.memberName)} → ${rule.quarter}쿼터 휴식`;
    case "FORCE_POSITION":
      return `${nameOf(rule.memberId, rule.memberName)} → ${rule.quarter ? `${rule.quarter}쿼터 ` : ""}${rule.position} 고정`;
    case "BAN_POSITION":
      return `${nameOf(rule.memberId, rule.memberName)} → ${rule.position} 금지`;
    case "MAX_QUARTERS":
      return `${nameOf(rule.memberId, rule.memberName)} → 최대 ${rule.maxQuarters}쿼터`;
    case "MIN_QUARTERS":
      return `${nameOf(rule.memberId, rule.memberName)} → 최소 ${rule.minQuarters}쿼터`;
    case "MAX_QUARTERS_BY_MEMBER_TYPE":
      return `${rule.memberType} → 최대 ${rule.maxQuarters}쿼터`;
    case "PRIORITIZE_MEMBER_TYPE":
      return `${rule.memberType} → 우선순위 ${rule.priority}`;
    case "AVOID_CONSECUTIVE_QUARTERS":
      return `${nameOf(rule.memberId, rule.memberName)} → 연속 최대 ${rule.maxConsecutiveQuarters}쿼터`;
    case "GK_ROTATION":
      return `GK 순환 배정 ${rule.enabled ? "켜기" : "끄기"}`;
    case "CUSTOM_NOTE":
      return `메모: ${rule.note}`;
  }
}
