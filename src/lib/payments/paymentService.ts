// ─────────────────────────────────────────────────────────────
// 회비 계산 서비스 (예상 회비 / 납부 / 미납 / 미납자 추출)
// ─────────────────────────────────────────────────────────────
import type { Member } from "@/types/member";
import type { PaymentEntry } from "@/types/payment";
import type { Match } from "@/types/match";
import { getFeeRule } from "@/lib/constants/feePolicy";
import { monthsInPeriod, type Period } from "@/lib/stats/period";

/** 회원의 '월 환산 기준 회비' (정책 주기로 나눈 값) */
export function monthlyExpected(member: Member): number {
  const rule = getFeeRule(member.memberType);
  const div =
    rule.period === "6개월" ? 6 : rule.period === "3개월" ? 3 : rule.period === "1개월" ? 1 : 0;
  if (div === 0) return 0; // 참석시/기타: 기본 회비 없음
  // 회원 본인의 feeAmount 를 우선 사용(엑셀 기준). 0원이면 0(면제)으로 존중.
  // feeAmount 가 비정상(음수/NaN)일 때만 정책 기본값으로 폴백.
  const base = Number.isFinite(member.feeAmount) && member.feeAmount >= 0 ? member.feeAmount : rule.amount;
  return Math.round(base / div);
}

export type MemberPaymentSummary = {
  member: Member;
  expected: number;
  paid: number;
  unpaid: number;
  perAttendanceFee: number; // 준회원/용병 참석비 합계
  status: "완료" | "일부" | "미납" | "면제";
};

/** 기간 내 회원의 참석 횟수 (참석비 계산용) */
function attendanceCountInPeriod(memberId: string, matches: Match[], period: Period): number {
  return matches.filter((m) => {
    const d = new Date(m.date);
    if (d.getFullYear() !== period.year && period.type !== "range") return false;
    const months = monthsInPeriod(period);
    const inMonth = period.type === "range" ? true : months.includes(d.getMonth() + 1);
    if (!inMonth) return false;
    const att = m.attendance.find((a) => a.memberId === memberId);
    return att?.status === "ATTEND" || att?.status === "LATE";
  }).length;
}

/** 한 회원의 기간 회비 요약 계산 */
export function summarizeMember(
  member: Member,
  entries: PaymentEntry[],
  matches: Match[],
  period: Period,
): MemberPaymentSummary {
  const months = monthsInPeriod(period);
  const rule = getFeeRule(member.memberType);

  // 면제 대상: 비활동(휴식/탈퇴) 또는 회장/스텝이 면제로 처리된 경우는 아님 → 비활동만 면제 취급
  if (!member.isActive) {
    return { member, expected: 0, paid: 0, unpaid: 0, perAttendanceFee: 0, status: "면제" };
  }

  // 정기 회비 예상액: 월 환산 * 기간 월수. 단, 면제(EXEMPT)인 월은 제외
  const monthly = monthlyExpected(member);
  const billableMonths = months.filter((m) => member.monthlyPaymentStatus[m] !== "EXEMPT");
  let expected = monthly * billableMonths.length;

  // 참석비(준회원/용병): 참석 횟수 * perAttendance
  const attendCount = attendanceCountInPeriod(member.id, matches, period);
  const perAttendanceFee = (rule.perAttendance ?? 0) * attendCount;
  expected += perAttendanceFee;

  // 실제 납부액: PaymentEntry 합산(기간 내). 없으면 PAID 월 수 * 월환산으로 추정
  const entrySum = entries
    .filter((e) => e.memberId === member.id && (period.type === "range" || e.year === period.year) && months.includes(e.month))
    .reduce((s, e) => s + e.paidAmount, 0);

  let paid = entrySum;
  if (entrySum === 0) {
    const paidMonths = months.filter((m) => member.monthlyPaymentStatus[m] === "PAID").length;
    paid = monthly * paidMonths;
  }

  const unpaid = Math.max(0, expected - paid);
  const status: MemberPaymentSummary["status"] =
    expected === 0 ? "면제" : paid >= expected ? "완료" : paid > 0 ? "일부" : "미납";

  return { member, expected, paid, unpaid, perAttendanceFee, status };
}

/** 전체 회원 회비 요약 */
export function summarizeAll(
  members: Member[],
  entries: PaymentEntry[],
  matches: Match[],
  period: Period,
): MemberPaymentSummary[] {
  return members.map((m) => summarizeMember(m, entries, matches, period));
}

/** 미납자 목록 (unpaid > 0) */
export function unpaidMembers(summaries: MemberPaymentSummary[]): MemberPaymentSummary[] {
  return summaries.filter((s) => s.status === "미납" || s.status === "일부");
}

/** 합계 통계 (대시보드 카드용) */
export function totals(summaries: MemberPaymentSummary[]): {
  totalExpected: number;
  totalPaid: number;
  totalUnpaid: number;
  paymentRate: number; // 0~100
  unpaidCount: number;
} {
  const totalExpected = summaries.reduce((s, x) => s + x.expected, 0);
  const totalPaid = summaries.reduce((s, x) => s + x.paid, 0);
  const totalUnpaid = summaries.reduce((s, x) => s + x.unpaid, 0);
  const unpaidCount = summaries.filter((s) => s.status === "미납" || s.status === "일부").length;
  const paymentRate = totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0;
  return { totalExpected, totalPaid, totalUnpaid, paymentRate, unpaidCount };
}
