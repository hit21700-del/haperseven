// ─────────────────────────────────────────────────────────────
// 관리자가 셀렉트박스로 수동 수정한 뒤 선수별 출전 요약을 다시 계산
// ─────────────────────────────────────────────────────────────
import type { QuarterLineup, PlayerQuarterSummary } from "@/types/formation";

/** 쿼터 라인업들로부터 선수별 출전 요약을 재계산 */
export function summarizeQuarters(quarters: QuarterLineup[], attendeeIds: string[]): PlayerQuarterSummary[] {
  const map = new Map<string, PlayerQuarterSummary>();
  attendeeIds.forEach((id) =>
    map.set(id, { memberId: id, totalQuarters: 0, fieldQuarters: 0, gkQuarters: 0, restQuarters: 0 }),
  );
  const ensure = (id: string) => {
    let s = map.get(id);
    if (!s) {
      s = { memberId: id, totalQuarters: 0, fieldQuarters: 0, gkQuarters: 0, restQuarters: 0 };
      map.set(id, s);
    }
    return s;
  };
  for (const q of quarters) {
    for (const p of q.players) {
      const s = ensure(p.memberId);
      if (p.isGK) s.gkQuarters++;
      else s.fieldQuarters++;
      s.totalQuarters++;
    }
    for (const rid of q.rests) ensure(rid).restQuarters++;
  }
  return [...map.values()];
}
