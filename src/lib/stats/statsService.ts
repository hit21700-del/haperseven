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
  momCount: number;
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
      a = {
        memberId: id,
        name: members.find((m) => m.id === id)?.name ?? id,
        attendCount: 0,
        goals: 0,
        assists: 0,
        momCount: 0,
      };
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
      if (s.mom) a.momCount++;
    }
  }
  return [...map.values()];
}

/** 매칭 경기의 결과 (스코어가 있어야 판정, 취소 경기는 제외) */
export function matchResult(m: Match): "W" | "D" | "L" | null {
  if (!m.score || m.status === "CANCELED") return null;
  if (m.score.us > m.score.them) return "W";
  if (m.score.us < m.score.them) return "L";
  return "D";
}

export type TeamRecord = {
  games: number; // 스코어가 입력된 매칭 경기 수
  win: number;
  draw: number;
  loss: number;
  goalsFor: number;
  goalsAgainst: number;
  /** 최근 경기 결과 (오래된 → 최신 순, 최대 5) */
  recent: ("W" | "D" | "L")[];
};

/** 기간 내 매칭(외부전) 팀 기록 집계. 자체전은 승패 개념이 없어 제외 */
export function teamRecord(matches: Match[], period: Period): TeamRecord {
  const rec: TeamRecord = { games: 0, win: 0, draw: 0, loss: 0, goalsFor: 0, goalsAgainst: 0, recent: [] };
  const played = filterMatches(matches, period)
    .filter((m) => (m.matchType ?? "MATCH") === "MATCH" && m.score && m.status !== "CANCELED")
    .sort((a, b) => a.date.localeCompare(b.date));
  for (const m of played) {
    const r = matchResult(m);
    if (!r) continue;
    rec.games++;
    rec.goalsFor += m.score!.us;
    rec.goalsAgainst += m.score!.them;
    if (r === "W") rec.win++;
    else if (r === "D") rec.draw++;
    else rec.loss++;
    rec.recent.push(r);
  }
  rec.recent = rec.recent.slice(-5);
  return rec;
}

/** 오늘 이후(오늘 포함) 가장 가까운 예정 경기 */
export function upcomingMatch(matches: Match[], todayIso: string): Match | null {
  const upcoming = matches
    .filter((m) => m.date >= todayIso && m.status !== "CANCELED" && !m.score)
    .sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0] ?? null;
}

/** 정렬된 상위 N 명 (key 기준) */
export function topN(
  aggs: PlayerAggregate[],
  key: "attendCount" | "goals" | "assists" | "momCount",
  n = 5,
): PlayerAggregate[] {
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
