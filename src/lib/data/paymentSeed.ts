// ─────────────────────────────────────────────────────────────
// 회비 납부 현황 반영 (v2 — 2026-07-15 운영자 지시 기준)
//   미납자(황민성·박성재·이창현·이양호·이수형·이지섭·봉진우·최성우·박건)
//   제외 전원 상반기(1~6월) 납부 처리.
// 버전(SEED_VERSION_PAYMENT)이 바뀌면 앱이 자동으로 다시 반영한다.
// 이름이 명단에 없으면 자동으로 건너뛴다.
// ─────────────────────────────────────────────────────────────
import type { Member, PaymentStatus } from "@/types/member";

/** 회비 반영 버전 — 값을 바꾸면 접속 시 1회 재적용 */
export const SEED_VERSION_PAYMENT = "v3-20260715";

type SeedRow = {
  /** 회비 금액(원). 지정 시 덮어씀 */
  fee?: number;
  /** 납부 완료 월 */
  paid?: number[];
  /** 미납 월(기존 납부 표시를 지울 때 사용) */
  unpaid?: number[];
  /** 면제 월 */
  exempt?: number[];
  note?: string;
};

const H1 = [1, 2, 3, 4, 5, 6]; // 상반기
const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** 이름 → 반영 내용 */
const SEED: Record<string, SeedRow> = {
  // ── 납부 완료 ──
  봉진영: { fee: 320_000, paid: H1 },
  고혁준: { fee: 350_000, paid: H1 },
  양윤석: { fee: 90_000, paid: H1 },
  박찬해: { fee: 310_000, paid: H1 },
  황동건: { fee: 320_000, paid: H1 },
  김민수: { fee: 160_000, paid: H1 },
  황인태: { fee: 160_000, paid: H1 },
  강혁준: { fee: 350_000, paid: H1 },
  정영빈: { fee: 90_000, paid: H1 },
  이우섭: { fee: 270_000, paid: ALL },
  권태진: { fee: 180_000, paid: H1 },
  최우람: { fee: 180_000, paid: H1 },
  이장형: { fee: 350_000, paid: H1 },
  이종창: { fee: 180_000, paid: H1 },
  송영오: { fee: 180_000, paid: H1 },
  임건: { fee: 350_000, paid: H1 },
  배현우: { fee: 180_000, paid: H1, note: "하반기 준회원 전환 예정" },
  성태현: { fee: 350_000, paid: H1 },
  황민성: { fee: 160_000, paid: H1 },
  이양호: { fee: 180_000, paid: H1 },
  최성우: { fee: 180_000, paid: H1 },
  박건: { fee: 180_000, paid: H1 },
  봉진우: { fee: 140_000, paid: ALL }, // 전체 기간(연간) 납부 완료
  // ── 미납 ──
  박성재: { fee: 0, unpaid: H1 },
  이창현: { fee: 0, unpaid: H1 },
  이수형: { fee: 0, unpaid: H1 },
  이지섭: { fee: 180_000, unpaid: H1 },
  // ── 특수 ──
  이중한: { fee: 0, exempt: ALL, note: "부상" },
  // ── 회비 없음(준회원/탈퇴/휴식 등) ──
  정상호: { fee: 0 },
  임윤섭: { fee: 0 },
  김장선: { fee: 0 },
  오한샘: { fee: 0 },
  윤종현: { fee: 0 },
  정원형: { fee: 0 },
  전승명: { fee: 0 },
  이영기: { fee: 0 },
  정민영: { fee: 0 },
};

const norm = (s: string) => s.replace(/\s/g, "");

/** 이름 기준으로 회비 금액/월별 납부 상태를 반영. 없는 이름은 건너뜀 */
export function applyPaymentSeed(members: Member[]): Member[] {
  return members.map((m) => {
    const row = SEED[norm(m.name)];
    if (!row) return m;
    const monthly: Record<number, PaymentStatus> = { ...m.monthlyPaymentStatus };
    row.paid?.forEach((mo) => (monthly[mo] = "PAID"));
    row.unpaid?.forEach((mo) => (monthly[mo] = "UNPAID"));
    row.exempt?.forEach((mo) => (monthly[mo] = "EXEMPT"));
    return {
      ...m,
      feeAmount: row.fee !== undefined ? row.fee : m.feeAmount,
      monthlyPaymentStatus: monthly,
      note: row.note ?? m.note,
    };
  });
}
