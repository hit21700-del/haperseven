// ─────────────────────────────────────────────────────────────
// 내부 데이터 → 엑셀 내보내기 (회원/회비/경기 스탯/포메이션)
// ─────────────────────────────────────────────────────────────
import * as XLSX from "xlsx";
import type { Member, PaymentStatus } from "@/types/member";
import type { Match } from "@/types/match";
import type { FormationPlan } from "@/types/formation";

function statusLabel(s: PaymentStatus): string {
  return { PAID: "납부", UNPAID: "미납", EXEMPT: "면제", UNKNOWN: "" }[s];
}

/** 브라우저에서 워크북을 다운로드 */
function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

/** 회원 + 월별 납부 현황 엑셀 export */
export function exportMembersToExcel(members: Member[], filename = "하퍼세븐_회원명단.xlsx") {
  const rows = members.map((m) => {
    const row: Record<string, unknown> = {
      번호: m.no ?? "",
      이름: m.name,
      구분: m.memberType,
      "회비 금액": m.feeAmount,
      "회비 납부 구분": m.feePeriod,
      나이: m.age ?? "",
      "가능 포지션": m.positions.join("/"),
      "선호 포지션": m.preferredPosition ?? "",
      "GK 가능": m.canPlayGK ? "O" : "",
      "고정 GK": m.fixedGK ? "O" : "",
      활동: m.isActive ? "활동" : "비활동",
      비고: m.note ?? "",
    };
    for (let mth = 1; mth <= 12; mth++) {
      row[`${mth}`] = statusLabel(m.monthlyPaymentStatus[mth] ?? "UNKNOWN");
    }
    return row;
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "회원명단");
  downloadWorkbook(wb, filename);
}

/** 회비 납부 현황(미납 계산 포함) export */
export function exportPaymentsToExcel(
  rows: {
    name: string;
    memberType: string;
    expected: number;
    paid: number;
    unpaid: number;
    status: string;
  }[],
  filename = "하퍼세븐_회비현황.xlsx",
) {
  const sheetRows = rows.map((r) => ({
    이름: r.name,
    구분: r.memberType,
    "예상 회비": r.expected,
    "납부 금액": r.paid,
    "미납 금액": r.unpaid,
    상태: r.status,
  }));
  const ws = XLSX.utils.json_to_sheet(sheetRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "회비현황");
  downloadWorkbook(wb, filename);
}

/** 경기 스탯(출석/득점/어시스트) export */
export function exportMatchStatsToExcel(matches: Match[], members: Member[], filename = "하퍼세븐_경기스탯.xlsx") {
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? id;
  const rows: Record<string, unknown>[] = [];
  for (const match of matches) {
    for (const stat of match.stats) {
      rows.push({
        날짜: match.date,
        경기: match.title ?? "",
        이름: nameOf(stat.memberId),
        득점: stat.goals,
        어시스트: stat.assists,
        메모: stat.memo ?? "",
      });
    }
  }
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "경기스탯");
  downloadWorkbook(wb, filename);
}

/** 포메이션 결과 export (쿼터별 라인업) */
export function exportFormationToExcel(plan: FormationPlan, members: Member[], filename = "하퍼세븐_포메이션.xlsx") {
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? id;
  const rows: Record<string, unknown>[] = [];
  for (const q of plan.quarters) {
    for (const p of q.players) {
      rows.push({ 쿼터: q.quarter, 이름: nameOf(p.memberId), 포지션: p.isGK ? "GK" : p.position });
    }
    for (const rid of q.rests) {
      rows.push({ 쿼터: q.quarter, 이름: nameOf(rid), 포지션: "휴식" });
    }
  }
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "포메이션");

  // 선수별 요약 시트
  const summaryRows = plan.summary.map((s) => ({
    이름: nameOf(s.memberId),
    "총 출전": s.totalQuarters,
    "필드 쿼터": s.fieldQuarters,
    "GK 쿼터": s.gkQuarters,
    "휴식 쿼터": s.restQuarters,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "출전요약");
  downloadWorkbook(wb, filename);
}
