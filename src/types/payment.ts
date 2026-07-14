// ─────────────────────────────────────────────────────────────
// 회비(Payment) / 추가지출 / 환불 관련 타입 정의
// ─────────────────────────────────────────────────────────────

/** 회원별·월별 실제 납부 입력 레코드 */
export type PaymentEntry = {
  memberId: string;
  /** 연도 */
  year: number;
  /** 월(1~12) */
  month: number;
  /** 실제 납부 금액(원) */
  paidAmount: number;
  /** 납부일(ISO, 선택) */
  paidDate?: string;
  memo?: string;
};

/** 추가 지출 항목 */
export type ExtraExpense = {
  id: string;
  date: string;
  item: string;
  amount: number;
  note?: string;
};

/** 환불 대상 레코드 */
export type RefundRecord = {
  id: string;
  memberId: string;
  /** 환불 개월 수(최소 2개월) */
  months: number;
  /** 환불 금액(원) */
  amount: number;
  reason: "개인사정" | "탈퇴" | "학생" | "장기부상" | "기타";
  date: string;
  /** 스텝 협의 완료 여부(장기부상 등) */
  approved: boolean;
  note?: string;
};

/** 회비 계좌 정보 */
export type AccountInfo = {
  bank: string;
  number: string;
  holder: string;
};
