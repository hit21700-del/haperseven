// ─────────────────────────────────────────────────────────────
// 포메이션(Formation) 관련 타입 정의
// ─────────────────────────────────────────────────────────────
import type { Position, MemberType } from "./member";

/** 포메이션 템플릿 (포지션별 인원 수 정의) */
export type FormationTemplate = {
  id: string;
  /** 예: 4-4-2, 4-3-3, 풋살 2-2 등 */
  name: string;
  /** 한 쿼터에 뛰는 총 인원 수 */
  playerCount: number;
  positions: {
    GK: number;
    DF: number;
    MF: number;
    FW: number;
  };
};

/** 한 쿼터의 라인업 */
export type QuarterLineup = {
  quarter: number;
  players: {
    memberId: string;
    position: Position;
    isGK: boolean;
    /** 세부 슬롯 라벨(예: CB, RB, LM, ST). 없으면 그룹 라벨로 표시 */
    slot?: string;
  }[];
  /** 휴식자 memberId 목록 */
  rests: string[];
};

/** 선수별 쿼터 출전 요약 */
export type PlayerQuarterSummary = {
  memberId: string;
  /** 총 출전 쿼터(필드 + GK) */
  totalQuarters: number;
  /** 필드 출전 쿼터 */
  fieldQuarters: number;
  /** GK 쿼터 */
  gkQuarters: number;
  /** 휴식 쿼터 */
  restQuarters: number;
};

/** 규칙 위반 정보 */
export type RuleViolation = {
  /** 위반 유형 코드 */
  code:
    | "MIN_QUARTERS_NOT_MET"
    | "GK_SHORTAGE"
    | "CHAT_RULE_CONFLICT"
    | "POSITION_IMBALANCE"
    | "NOT_ENOUGH_PLAYERS";
  message: string;
  memberId?: string;
  quarter?: number;
};

/** 자동 배정 결과 */
export type FormationPlan = {
  quarters: QuarterLineup[];
  summary: PlayerQuarterSummary[];
  warnings: string[];
  ruleViolations: RuleViolation[];
  /** 배정 사유 설명(선수/규칙 단위) */
  reasons: string[];
};

/** generateFormationPlan 에 넘기는 기본 운영 규칙 */
export type FormationBaseRules = {
  /** 인당 최소 보장 출전 쿼터 (기본 3) */
  minGuaranteedQuarters: number;
  /** 이 인원을 초과하면 우선순위 차등 배정 (기본 13) */
  priorityThreshold: number;
  /** GK 순환 배정 강제 (고정 GK 없을 때 기본 true) */
  gkRotation: boolean;
};

export const DEFAULT_BASE_RULES: FormationBaseRules = {
  minGuaranteedQuarters: 3,
  priorityThreshold: 13,
  gkRotation: true,
};

// 기본 포메이션 템플릿들 (11인제만). 자동 배정 후 필드뷰에서 자유 편집 가능.
export const DEFAULT_FORMATION_TEMPLATES: FormationTemplate[] = [
  { id: "f-11-4231", name: "11인제 4-2-3-1", playerCount: 11, positions: { GK: 1, DF: 4, MF: 5, FW: 1 } },
  { id: "f-11-442", name: "11인제 4-4-2", playerCount: 11, positions: { GK: 1, DF: 4, MF: 4, FW: 2 } },
  { id: "f-11-433", name: "11인제 4-3-3", playerCount: 11, positions: { GK: 1, DF: 4, MF: 3, FW: 3 } },
  { id: "f-11-352", name: "11인제 3-5-2", playerCount: 11, positions: { GK: 1, DF: 3, MF: 5, FW: 2 } },
];

/** memberType 을 참조하기 위한 re-export 편의 타입 */
export type { MemberType };
