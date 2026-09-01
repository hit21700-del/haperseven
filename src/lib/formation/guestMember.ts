// ─────────────────────────────────────────────────────────────
// 일회용 용병(게스트) Member 객체 생성 — 포메이션 모달과 투표 페이지에서 공용
// ─────────────────────────────────────────────────────────────
import type { Member, Position } from "@/types/member";
import { detailToGroup } from "@/lib/formation/positions";

/** 선택 가능한 세부 포지션(좌우중 포함) */
export const GUEST_POS_OPTIONS = ["GK", "CB", "LB", "RB", "DM", "CM", "LM", "RM", "LW", "RW", "ST"];

export function buildGuestMember(input: {
  name: string;
  /** 세부 포지션 목록 (첫 번째 = 주 포지션) 예: ["CM","ST"] */
  detailPositions: string[];
  age?: number;
  /** 고정 id (투표에서 온 용병은 voter_key 기반으로 고정해 중복 방지) */
  id?: string;
}): Member {
  const detail = input.detailPositions.map((p) => p.trim().toUpperCase()).filter(Boolean);
  const primary = detail[0] ?? "CM";
  const canPlayGK = detail.includes("GK");
  const fieldDetail = detail.filter((d) => d !== "GK");
  const groups = Array.from(new Set(fieldDetail.map((d) => detailToGroup(d)).filter((g): g is Position => Boolean(g))));
  return {
    id: input.id ?? `guest-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`,
    name: input.name.trim(),
    memberType: "용병",
    feeAmount: 0,
    feePeriod: "참석시",
    age: input.age,
    positions: groups.length > 0 ? groups : (["ANY"] as Position[]),
    preferredDetail: fieldDetail.length > 0 ? fieldDetail : undefined,
    preferredPosition: groups[0],
    canPlayGK,
    // 주 포지션이 GK 면 전담 키퍼(매 쿼터 GK 고정)
    fixedGK: primary === "GK",
    isActive: true,
    note: "일회용 용병",
    monthlyPaymentStatus: {},
  };
}
