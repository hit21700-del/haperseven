// ─────────────────────────────────────────────────────────────
// 포메이션 배정에 쓰이는 순수 헬퍼/규칙 함수 모음 (UI 와 분리)
// ─────────────────────────────────────────────────────────────
import type { Member, Position } from "@/types/member";
import type { FormationTemplate, FormationBaseRules } from "@/types/formation";
import type { AttendanceRecord } from "@/types/match";

/** 필드 포지션 그룹 키 */
export type FieldGroup = "DF" | "MF" | "FW";

/**
 * 배정 대상 참석자만 필터링한다.
 * - 출석 상태가 ATTEND 또는 LATE 인 회원
 * - isActive=false(탈퇴/휴식) 또는 출석상태 ABSENT/INJURED 는 제외
 */
export function getEligibleAttendees(members: Member[], attendance: AttendanceRecord[]): Member[] {
  const statusById = new Map(attendance.map((a) => [a.memberId, a.status]));
  return members.filter((m) => {
    if (!m.isActive) return false;
    const st = statusById.get(m.id);
    return st === "ATTEND" || st === "LATE";
  });
}

/**
 * 전원 minGuaranteed 쿼터 보장이 물리적으로 가능한지 판단.
 * 총 슬롯 = playerCount * quarterCount (GK 포함).
 */
export function checkCapacity(
  attendeeCount: number,
  template: FormationTemplate,
  quarterCount: number,
  rules: FormationBaseRules,
): { feasible: boolean; totalSlots: number; required: number } {
  const totalSlots = template.playerCount * quarterCount;
  const required = attendeeCount * rules.minGuaranteedQuarters;
  return { feasible: required <= totalSlots, totalSlots, required };
}

/** 선수가 특정 쿼터에 해당 포지션을 못 맡는지(BAN 또는 능력 부족) 판단용 */
export function canPlayPosition(member: Member, position: Position): boolean {
  if (position === "GK") return member.canPlayGK || member.fixedGK;
  if (member.positions.includes("ANY")) return true;
  return member.positions.includes(position);
}

/** 선호 포지션이 속한 필드 그룹을 반환(없으면 MF 기본) */
export function preferredGroup(member: Member): FieldGroup {
  const p = member.preferredPosition ?? member.positions.find((x) => x !== "GK" && x !== "ANY");
  if (p === "DF" || p === "MF" || p === "FW") return p;
  return "MF";
}

/** 템플릿의 필드 그룹별 슬롯 수 */
export function fieldSlotsOf(template: FormationTemplate): Record<FieldGroup, number> {
  return { DF: template.positions.DF, MF: template.positions.MF, FW: template.positions.FW };
}
