// ─────────────────────────────────────────────────────────────
// 경기 스탯 집계 서비스 (출석/득점/어시스트)
// ─────────────────────────────────────────────────────────────
import type { Member } from "@/types/member";
import type { Match } from "@/types/match";
import { dateInPeriod, type Period } from "./period";

export type PlayerAggregate = {
  memberId: string;
  name: string;
  attendCount: number; // ATTEND + LATE
  goals: number;
  assists: number;
};

/** 기간 내 경기만 필터 */
export function filterMatches(matches: Match[], period: Period): Match[] {
  return matches.filter((m) => dateInPeriod(m.date, period));
}

/** 회원별 출석/득점/어시스트 집계 */
export function aggregate(members: Member[], matches: Match[], period: Period): PlayerAggregate[] {
  const inPeriod = filterMatches(matches, period);
  const map = new Map<string, PlayerAggregate>();
  const ensure = (id: string): PlayerAggregate => {
    let a = map.get(id);
    if (!a) {
      a = { memberId: id, name: members.find((m) => m.id === id)?.name ?? id, attendCount: 0, goals: 0, assists: 0 };
      map.set(id, a);
    }
    return a;
  };

  for (const match of inPeriod) {
    for (const att of match.attendance) {
      if (att.status === "ATTEND" || att.status === "LATE") ensure(att.memberId).attendCount++;
    }
    for (const s of match.stats) {
      const a = ensure(s.memberId);
      a.goals += s.goals;
      a.assists += s.assists;
    }
  }
  return [...map.values()];
}

/** 정렬된 상위 N 명 (key 기준) */
export function topN(aggs: PlayerAggregate[], key: "attendCount" | "goals" | "assists", n = 5): PlayerAggregate[] {
  return [...aggs]
    .filter((a) => a[key] > 0)
    .sort((x, y) => y[key] - x[key])
    .slice(0, n);
}

/** 가장 최근 경기 요약 */
export function recentMatchSummary(
  matches: Match[],
): { match: Match | null; attendCount: number; totalGoals: number; totalAssists: number } {
  const sorted = [...matches].sort((a, b) => b.date.localeCompare(a.date));
  const match = sorted[0] ?? null;
  if (!match) return { match: null, attendCount: 0, totalGoals: 0, totalAssists: 0 };
  const attendCount = match.attendance.filter((a) => a.status === "ATTEND" || a.status === "LATE").length;
  const totalGoals = match.stats.reduce((s, x) => s + x.goals, 0);
  const totalAssists = match.stats.reduce((s, x) => s + x.assists, 0);
  return { match, attendCount, totalGoals, totalAssists };
}
