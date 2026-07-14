// ─────────────────────────────────────────────────────────────
// 채팅 규칙(ChatFormationRule[]) 을 포메이션 알고리즘이 쓰는
// "정규화된 제약(ResolvedConstraints)" 으로 변환한다.
// - 선수 이름 -> memberId 매핑
// - 규칙 간 충돌 감지(자동으로 덮어쓰지 않고 warning 으로 보고)
// ─────────────────────────────────────────────────────────────
import type { Member, Position, MemberType } from "@/types/member";
import type { ChatFormationRule } from "@/types/chat";

/** 정규화된 제약 집합 */
export type ResolvedConstraints = {
  /** `${memberId}@${quarter}` 형태로 휴식 강제 */
  forcedRest: Set<string>;
  /** memberId -> 강제 포지션 목록 */
  forcedPosition: Map<string, { position: Position; quarter?: number }[]>;
  /** 금지 포지션 목록 */
  banPosition: { memberId: string; position: Position; quarter?: number }[];
  /** memberId -> 최대 출전 쿼터 */
  maxQuarters: Map<string, number>;
  /** memberId -> 최소 출전 쿼터 */
  minQuarters: Map<string, number>;
  /** 회원구분 -> 최대 출전 쿼터 */
  maxQuartersByType: Map<MemberType, number>;
  /** 회원구분 -> 우선순위 override(작을수록 우선) */
  priorityOverride: Map<MemberType, number>;
  /** memberId -> 최대 연속 출전 쿼터 */
  avoidConsecutive: Map<string, number>;
  /** GK 순환 강제 여부(미지정이면 undefined) */
  gkRotation?: boolean;
  /** 단순 메모 */
  notes: string[];
  /** 충돌/해석 실패 경고 */
  conflicts: string[];
};

/** 이름으로 회원을 찾는다(공백 무시, 대소문자 무시). 모호하면 null */
function findMemberByName(members: Member[], name?: string): { member: Member | null; ambiguous: boolean } {
  if (!name) return { member: null, ambiguous: false };
  const norm = name.replace(/\s/g, "").toLowerCase();
  const matches = members.filter((m) => m.name.replace(/\s/g, "").toLowerCase() === norm);
  if (matches.length === 1) return { member: matches[0], ambiguous: false };
  if (matches.length > 1) return { member: null, ambiguous: true };
  // 부분 일치 시도
  const partial = members.filter((m) => m.name.replace(/\s/g, "").toLowerCase().includes(norm));
  if (partial.length === 1) return { member: partial[0], ambiguous: false };
  if (partial.length > 1) return { member: null, ambiguous: true };
  return { member: null, ambiguous: false };
}

/**
 * 규칙에서 memberId 를 확정한다.
 * memberId 가 이미 있으면 그대로, 없으면 memberName 으로 조회.
 */
function resolveMemberId(
  members: Member[],
  rule: { memberId?: string; memberName?: string },
  conflicts: string[],
): string | null {
  if (rule.memberId && members.some((m) => m.id === rule.memberId)) return rule.memberId;
  const { member, ambiguous } = findMemberByName(members, rule.memberName);
  if (member) return member.id;
  if (ambiguous) {
    conflicts.push(`'${rule.memberName}' 와(과) 일치하는 선수가 여러 명이라 규칙을 적용하지 못했습니다.`);
  } else if (rule.memberName) {
    conflicts.push(`'${rule.memberName}' 선수를 찾을 수 없어 규칙을 적용하지 못했습니다.`);
  }
  return null;
}

/**
 * 채팅 규칙들을 정규화된 제약으로 변환한다.
 * 충돌이 감지되면 conflicts 에 기록하되, 명시 조건 우선 원칙에 따라
 * "준회원 최대 2쿼터" 같은 상한은 최소 보장보다 우선 적용되도록 둔다.
 */
export function applyChatFormationRules(members: Member[], chatRules: ChatFormationRule[]): ResolvedConstraints {
  const c: ResolvedConstraints = {
    forcedRest: new Set(),
    forcedPosition: new Map(),
    banPosition: [],
    maxQuarters: new Map(),
    minQuarters: new Map(),
    maxQuartersByType: new Map(),
    priorityOverride: new Map(),
    avoidConsecutive: new Map(),
    notes: [],
    conflicts: [],
  };

  for (const rule of chatRules) {
    switch (rule.type) {
      case "FORCE_REST": {
        const id = resolveMemberId(members, rule, c.conflicts);
        if (id) c.forcedRest.add(`${id}@${rule.quarter}`);
        break;
      }
      case "FORCE_POSITION": {
        const id = resolveMemberId(members, rule, c.conflicts);
        if (id) {
          const arr = c.forcedPosition.get(id) ?? [];
          arr.push({ position: rule.position, quarter: rule.quarter });
          c.forcedPosition.set(id, arr);
        }
        break;
      }
      case "BAN_POSITION": {
        const id = resolveMemberId(members, rule, c.conflicts);
        if (id) c.banPosition.push({ memberId: id, position: rule.position, quarter: rule.quarter });
        break;
      }
      case "MAX_QUARTERS": {
        const id = resolveMemberId(members, rule, c.conflicts);
        if (id) c.maxQuarters.set(id, Math.min(c.maxQuarters.get(id) ?? Infinity, rule.maxQuarters));
        break;
      }
      case "MIN_QUARTERS": {
        const id = resolveMemberId(members, rule, c.conflicts);
        if (id) c.minQuarters.set(id, Math.max(c.minQuarters.get(id) ?? 0, rule.minQuarters));
        break;
      }
      case "MAX_QUARTERS_BY_MEMBER_TYPE": {
        c.maxQuartersByType.set(
          rule.memberType,
          Math.min(c.maxQuartersByType.get(rule.memberType) ?? Infinity, rule.maxQuarters),
        );
        break;
      }
      case "PRIORITIZE_MEMBER_TYPE": {
        c.priorityOverride.set(rule.memberType, rule.priority);
        break;
      }
      case "AVOID_CONSECUTIVE_QUARTERS": {
        const id = resolveMemberId(members, rule, c.conflicts);
        if (id) c.avoidConsecutive.set(id, rule.maxConsecutiveQuarters);
        break;
      }
      case "GK_ROTATION": {
        c.gkRotation = rule.enabled;
        break;
      }
      case "CUSTOM_NOTE": {
        c.notes.push(rule.note);
        break;
      }
    }
  }

  // 충돌 감지: 같은 선수 같은 쿼터에 FORCE_REST 와 FORCE_POSITION 이 동시에 존재
  for (const [id, positions] of c.forcedPosition) {
    for (const p of positions) {
      if (p.quarter && c.forcedRest.has(`${id}@${p.quarter}`)) {
        const name = members.find((m) => m.id === id)?.name ?? id;
        c.conflicts.push(
          `${name}: ${p.quarter}쿼터 휴식과 ${p.quarter}쿼터 ${p.position} 고정이 충돌합니다. 휴식을 우선 적용합니다.`,
        );
      }
    }
  }

  // 충돌 감지: minQuarters 와 maxQuarters 가 역전
  for (const [id, min] of c.minQuarters) {
    const max = c.maxQuarters.get(id);
    if (max !== undefined && min > max) {
      const name = members.find((m) => m.id === id)?.name ?? id;
      c.conflicts.push(`${name}: 최소 ${min}쿼터 / 최대 ${max}쿼터 조건이 충돌합니다. 최대값을 우선합니다.`);
    }
  }

  return c;
}
