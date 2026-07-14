// ─────────────────────────────────────────────────────────────
// 회원(Member) 관련 타입 정의
// ─────────────────────────────────────────────────────────────

/** 포지션. ANY 는 아무 포지션이나 가능 */
export type Position = "GK" | "DF" | "MF" | "FW" | "ANY";

/** 월별 회비 납부 상태 */
export type PaymentStatus = "PAID" | "UNPAID" | "EXEMPT" | "UNKNOWN";

/** 회원 구분 */
export type MemberType =
  | "스텝"
  | "정회원"
  | "정회원(월2회)"
  | "준회원"
  | "학생"
  | "용병"
  | "회장"
  | "휴식"
  | "탈퇴"
  | "기타";

/** 회비 납부 주기 */
export type FeePeriod = "1개월" | "3개월" | "6개월" | "참석시" | "기타";

export type Member = {
  id: string;
  /** 엑셀상의 회원 번호 */
  no?: number;
  name: string;
  memberType: MemberType;
  /** 납부해야 할 회비 금액(원) */
  feeAmount: number;
  feePeriod: FeePeriod;
  birthYear?: number;
  age?: number;
  /** 가능한 포지션 그룹 목록 (DF/MF/FW 등) */
  positions: Position[];
  /** 선호 세부 포지션(순서 유지: 첫=주, 둘째=부). 예: ["CB","ST"] */
  preferredDetail?: string[];
  /** 선호 포지션(그룹) */
  preferredPosition?: Position;
  /** GK 가능 여부 */
  canPlayGK: boolean;
  /** 고정 GK 여부 */
  fixedGK: boolean;
  /** 활동중 여부(탈퇴/휴식이면 false) */
  isActive: boolean;
  note?: string;
  /** 월(1~12) 별 납부 상태 */
  monthlyPaymentStatus: Record<number, PaymentStatus>;
  /** 자체전 팀 (화이트/블랙). 미지정이면 undefined */
  team?: TeamColor;
  /** 감독(팀 코치) 여부 — 팀에 소속되어 함께 뜀 */
  isCoach?: boolean;
};

/** 자체전 팀 색 */
export type TeamColor = "WHITE" | "BLACK";
export const TEAM_LABEL: Record<TeamColor, string> = { WHITE: "화이트", BLACK: "블랙" };

/** 필드 포지션(GK 제외)만 필요한 곳에서 사용 */
export const FIELD_POSITIONS: Exclude<Position, "GK" | "ANY">[] = ["DF", "MF", "FW"];

export const ALL_MEMBER_TYPES: MemberType[] = [
  "스텝",
  "정회원",
  "정회원(월2회)",
  "준회원",
  "학생",
  "용병",
  "회장",
  "휴식",
  "탈퇴",
  "기타",
];

export const ALL_POSITIONS: Position[] = ["GK", "DF", "MF", "FW", "ANY"];
