// ─────────────────────────────────────────────────────────────
// 경기(Match) / 출석 / 스탯 관련 타입 정의
// ─────────────────────────────────────────────────────────────
import type { FormationPlan } from "./formation";

/** 출석 상태 */
export type AttendanceStatus = "ATTEND" | "ABSENT" | "LATE" | "INJURED";

export type AttendanceRecord = {
  memberId: string;
  status: AttendanceStatus;
  memo?: string;
};

export type MatchStat = {
  memberId: string;
  goals: number;
  assists: number;
  memo?: string;
};

/** 경기 유형: 매칭(외부전) / 자체전(화이트 vs 블랙) */
export type MatchType = "MATCH" | "SCRIMMAGE";

export type Match = {
  id: string;
  /** ISO 날짜 문자열 (YYYY-MM-DD) */
  date: string;
  title?: string;
  location?: string;
  /** 경기 유형(기본 매칭) */
  matchType?: MatchType;
  /** 쿼터 수(기본 4) */
  quarterCount: number;
  attendance: AttendanceRecord[];
  stats: MatchStat[];
  /** 저장된 포메이션 결과(있으면) */
  formationPlan?: FormationPlan;
};
