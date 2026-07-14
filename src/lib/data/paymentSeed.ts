// ─────────────────────────────────────────────────────────────
// 회비 납부 현황 반영 (엑셀 캡처 기준, 2025년)
//   노랑/초록 셀 = 해당 월 납부(PAID), 빈 셀 = 미표시, '부상' = 면제(EXEMPT)
//   회비 금액은 만원 단위 → 원 단위로 변환해 반영.
// 이름이 명단에 없으면 자동으로 건너뛴다.
// ─────────────────────────────────────────────────────────────
import type { Member, PaymentStatus } from "@/types/member";

type SeedRow = {
  /** 회비 금액(원). 지정 시 덮어씀 */
  fee?: number;
  /** 납부 완료 월 */
  paid?: number[];
  /** 면제 월 */
  exempt?: number[];
  note?: string;
};

const H1 = [1, 2, 3, 4, 5, 6]; // 상반기
const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** 이름 → 반영 내용 */
const SEED: Record<string, SeedRow> = {
  봉진영: { fee: 320_000, paid: H1 },
  고혁준: { fee: 350_000, paid: H1 },
  양윤석: { fee: 90_000, paid: H1 },
  박찬해: { fee: 310_000, paid: H1 },
  황민성: { fee: 160_000, paid: H1 },
  황동건: { fee: 320_000, paid: H1 },
  김민수: { fee: 160_000, paid: H1 },
  황인태: { fee: 160_000, paid: H1 },
  강혁준: { fee: 350_000, paid: H1 },
  정상호: { fee: 0 },
  정영빈: { fee: 90_000, paid: H1 },
  이우섭: { fee: 270_000, paid: ALL },
  권태진: { fee: 180_000, paid: H1 },
  임윤섭: { fee: 0 },
  김장선: { fee: 0 },
  오한샘: { fee: 0 },
  윤종현: { fee: 0 },
  이양호: { fee: 180_000, paid: H1 },
  이중한: { fee: 0, exempt: ALL, note: "부상" },
  최우람: { fee: 180_000, paid: H1 },
  이창현: { fee: 0 },
  이장형: { fee: 350_000, paid: H1 },
  이수형: { fee: 0 },
  이종창: { fee: 180_000, paid: H1 },
  이지섭: { fee: 180_000, paid: H1 },
  정원형: { fee: 0 },
  전승명: { fee: 0 },
  송영오: { fee: 180_000, paid: H1 },
  임건: { fee: 350_000 },
  배현우: { fee: 180_000, note: "하반기 준회원 전환 예정" },
  봉진우: { fee: 140_000, paid: H1 },
  최성우: { fee: 180_000, paid: H1 },
  성태현: { fee: 350_000, paid: H1 },
  이영기: { fee: 0 },
  박건: { fee: 180_000, paid: H1 },
  정민영: { fee: 0 },
  박성재: { fee: 0 },
};

const norm = (s: string) => s.replace(/\s/g, "");

/** 이름 기준으로 회비 금액/월별 납부 상태를 반영(최초 1회). 없는 이름은 건너뜀 */
export function applyPaymentSeed(members: Member[]): Member[] {
  return members.map((m) => {
    const row = SEED[norm(m.name)];
    if (!row) return m;
    const monthly: Record<number, PaymentStatus> = { ...m.monthlyPaymentStatus };
    row.paid?.forEach((mo) => (monthly[mo] = "PAID"));
    row.exempt?.forEach((mo) => (monthly[mo] = "EXEMPT"));
    return {
      ...m,
      feeAmount: row.fee !== undefined ? row.fee : m.feeAmount,
      monthlyPaymentStatus: monthly,
      note: row.note ?? m.note,
    };
  });
}
