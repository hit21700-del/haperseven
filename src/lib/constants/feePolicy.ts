// ─────────────────────────────────────────────────────────────
// 회비 정책 상수
// 정책이 바뀌면 이 파일만 수정하면 전체에 반영됩니다.
// ─────────────────────────────────────────────────────────────
import type { MemberType, FeePeriod } from "@/types/member";
import type { AccountInfo } from "@/types/payment";

/** 회원 구분별 회비 정책 정의 */
export type FeeRule = {
  memberType: MemberType;
  /** 기준 회비 금액(원) */
  amount: number;
  /** 납부 주기 */
  period: FeePeriod;
  /** 참석 시마다 추가로 내는 금액(원). 준회원/용병 등 */
  perAttendance?: number;
  /** 정기 회비 없이 회당 참가비만 내는지 여부(용병) */
  payPerGame?: boolean;
  description: string;
};

export const FEE_POLICY: Record<string, FeeRule> = {
  스텝: {
    memberType: "스텝",
    amount: 160_000,
    period: "6개월",
    description: "6개월 160,000원 (정회원이자 팀 운영을 돕는 사람)",
  },
  정회원: {
    memberType: "정회원",
    amount: 170_000,
    period: "6개월",
    description: "6개월 170,000원",
  },
  "정회원(월2회)": {
    memberType: "정회원(월2회)",
    amount: 90_000,
    period: "6개월",
    description: "월 2회 참석 / 6개월 90,000원",
  },
  준회원: {
    memberType: "준회원",
    amount: 20_000,
    period: "6개월",
    perAttendance: 5_000,
    description: "6개월 20,000원 + 참석 시마다 5,000원",
  },
  학생: {
    memberType: "학생",
    amount: 70_000,
    period: "3개월",
    description: "3개월 70,000원 (학생 회비)",
  },
  용병: {
    memberType: "용병",
    amount: 0,
    period: "참석시",
    perAttendance: 5_000,
    payPerGame: true,
    description: "정기회비 없이 회당 5,000원",
  },
};

/** 정책에 명시되지 않은 구분(회장/휴식/탈퇴/기타)의 기본값 */
export const DEFAULT_FEE_RULE: FeeRule = {
  memberType: "기타",
  amount: 0,
  period: "기타",
  description: "정기 회비 없음",
};

/** 회원 구분으로 회비 정책을 조회 */
export function getFeeRule(memberType: MemberType): FeeRule {
  return FEE_POLICY[memberType] ?? DEFAULT_FEE_RULE;
}

// 환불 정책
export const REFUND_POLICY = {
  /** 최소 환불 단위(개월) */
  minMonths: 2,
  /** 1개월당 환불 금액(원) */
  amountPerMonth: 20_000,
  description:
    "최소 2개월 이상부터 환불 가능. 1개월당 20,000원 환불. 개인사정/탈퇴/학생 동일 적용. 장기부상은 스텝 협의 후 결정.",
};

/** 하반기 회비 납부 마감 안내 */
export const FEE_DEADLINE_NOTICE = "하반기 회비는 7월 말까지 납부";

/** 회비 입금 계좌 정보 */
export const ACCOUNT_INFO: AccountInfo = {
  bank: "카카오뱅크",
  number: "79422626899",
  holder: "황동건",
};

/** 환불 금액 계산 (개월 수 기준) */
export function calcRefundAmount(months: number): number {
  if (months < REFUND_POLICY.minMonths) return 0;
  return months * REFUND_POLICY.amountPerMonth;
}
