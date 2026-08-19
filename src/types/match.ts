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
  /** MOM(Man of the Match) 여부 — 경기당 1명 */
  mom?: boolean;
  memo?: string;
};

/** 경기 유형: 매칭(외부전) / 자체전(화이트 vs 블랙) */
export type MatchType = "MATCH" | "SCRIMMAGE";

/** 경기 진행 상태 (기존 데이터는 undefined — 스코어 유무로 판별) */
export type MatchStatus = "SCHEDULED" | "DONE" | "CANCELED";

/** 경기 스코어. 매칭이면 us=하퍼세븐/them=상대, 자체전이면 us=화이트/them=블랙 */
export type MatchScore = { us: number; them: number };

export type Match = {
  id: string;
  /** ISO 날짜 문자열 (YYYY-MM-DD) */
  date: string;
  /** 시작 시각 (HH:mm, 선택) */
  time?: string;
  title?: string;
  location?: string;
  /** 상대팀 이름 (매칭일 때) */
  opponent?: string;
  /** 경기 유형(기본 매칭) */
  matchType?: MatchType;
  /** 진행 상태 (선택 — 없으면 스코어/날짜로 추정) */
  status?: MatchStatus;
  /** 경기 결과 스코어 (선택) */
  score?: MatchScore;
  /** 쿼터 수(기본 4) */
  quarterCount: number;
  attendance: AttendanceRecord[];
  stats: MatchStat[];
  /** 저장된 포메이션 결과(있으면) */
  formationPlan?: FormationPlan;
};
