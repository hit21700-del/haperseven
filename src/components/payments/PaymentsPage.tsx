"use client";
import React, { useMemo, useState, useEffect } from "react";
import { useAppStore } from "@/lib/store/AppStore";
import { Card, StatCard, SectionTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, THead, TH, TD, TR } from "@/components/ui/Table";
import { PaymentStatusBadge, MemberTypeBadge } from "@/components/ui/Badge";
import { PeriodFilter } from "@/components/common/PeriodFilter";
import type { Period } from "@/lib/stats/period";
import { monthsInPeriod, periodLabel } from "@/lib/stats/period";
import { summarizeAll, totals } from "@/lib/payments/paymentService";
import { ACCOUNT_INFO, REFUND_POLICY, FEE_DEADLINE_NOTICE, calcRefundAmount } from "@/lib/constants/feePolicy";
import { exportPaymentsToExcel } from "@/lib/excel/excelExporter";
import { formatWon, currentYear } from "@/lib/utils/format";
import type { PaymentStatus } from "@/types/member";
import type { RefundRecord } from "@/types/payment";
import { RefundModal } from "./RefundModal";
import { BulkPaymentModal } from "./BulkPaymentModal";
import { readJSON, writeJSON, STORAGE_KEYS } from "@/lib/repository/storage";

const STATUS_CYCLE: PaymentStatus[] = ["UNKNOWN", "PAID", "UNPAID", "EXEMPT"];
// 월별 납부 상태 점(dot) 색상: 미표시=연회색, 납부=초록, 미납=빨강, 면제=회색
const DOT: Record<PaymentStatus, string> = {
  UNKNOWN: "bg-gray-200",
  PAID: "bg-green-500",
  UNPAID: "bg-red-500",
  EXEMPT: "bg-gray-300",
};

export function PaymentsPage() {
  const { members, matches, paymentEntries, setPaymentEntries, upsertMember, refunds, setRefunds } = useAppStore();
  const [period, setPeriod] = useState<Period>({ type: "year", year: 2025 });
  const [onlyUnpaid, setOnlyUnpaid] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  // 현재 팀 잔고(총 회비) — localStorage 에 저장, 직접 수정 가능
  const DEFAULT_BALANCE = 8_825_526;
  const [balanceInput, setBalanceInput] = useState(String(DEFAULT_BALANCE));
  useEffect(() => {
    setBalanceInput(readJSON<number>(STORAGE_KEYS.teamBalance, DEFAULT_BALANCE).toLocaleString("ko-KR") + "원");
  }, []);
  const commitBalance = () => {
    const n = Number(balanceInput.replace(/[, 원]/g, ""));
    if (!Number.isNaN(n) && n >= 0) {
      writeJSON(STORAGE_KEYS.teamBalance, Math.round(n));
      setBalanceInput(Math.round(n).toLocaleString("ko-KR") + "원");
    } else {
      setBalanceInput(readJSON<number>(STORAGE_KEYS.teamBalance, DEFAULT_BALANCE).toLocaleString("ko-KR") + "원");
    }
  };

  const summaries = useMemo(
    () => summarizeAll(members, paymentEntries, matches, period),
    [members, paymentEntries, matches, period],
  );
  const t = useMemo(() => totals(summaries), [summaries]);
  const visible = onlyUnpaid ? summaries.filter((s) => s.status === "미납" || s.status === "일부") : summaries;

  // 일괄 등록: 선택한 회원들의 반기 상태를 한 번에 변경
  const applyBulk = (memberIds: string[], half: 1 | 2, status: PaymentStatus) => {
    const halfMonths = half === 1 ? [1, 2, 3, 4, 5, 6] : [7, 8, 9, 10, 11, 12];
    for (const id of memberIds) {
      const m = members.find((x) => x.id === id);
      if (!m) continue;
      const monthly = { ...m.monthlyPaymentStatus };
      halfMonths.forEach((mo) => (monthly[mo] = status));
      upsertMember({ ...m, monthlyPaymentStatus: monthly });
    }
  };

  // 반기(6개월) 단위 납부 상태 토글 — 회비가 6개월 단위이므로 한 번에 반기 전체 변경
  const cycleStatus = (memberId: string, month: number) => {
    const m = members.find((x) => x.id === memberId);
    if (!m) return;
    const half = month <= 6 ? [1, 2, 3, 4, 5, 6] : [7, 8, 9, 10, 11, 12];
    const cur = m.monthlyPaymentStatus[month] ?? "UNKNOWN";
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % STATUS_CYCLE.length];
    const monthly = { ...m.monthlyPaymentStatus };
    half.forEach((mo) => (monthly[mo] = next));
    upsertMember({ ...m, monthlyPaymentStatus: monthly });
  };

  // 실제 납부 금액 직접 입력 — 이 기간의 기존 납부 입력을 대체하는 단일 항목으로 저장
  const setPaidAmount = (memberId: string, amount: number) => {
    const months = monthsInPeriod(period);
    const others = paymentEntries.filter(
      (e) => !(e.memberId === memberId && (period.type === "range" || e.year === period.year) && months.includes(e.month)),
    );
    const rep =
      period.type === "month"
        ? period.month ?? 1
        : period.type === "quarter"
          ? ((period.quarter ?? 1) - 1) * 3 + 1
          : months[0] ?? 1;
    setPaymentEntries(
      amount > 0 ? [...others, { memberId, year: period.year, month: rep, paidAmount: amount }] : others,
    );
  };

  const addRefund = (r: RefundRecord) => setRefunds([...refunds, r]);
  const removeRefund = (id: string) => setRefunds(refunds.filter((x) => x.id !== id));

  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? id;

  const handleExport = () => {
    exportPaymentsToExcel(
      summaries.map((s) => ({
        name: s.member.name,
        memberType: s.member.memberType,
        expected: s.expected,
        paid: s.paid,
        unpaid: s.unpaid,
        status: s.status,
      })),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">회비 관리</h1>
          <p className="mt-0.5 text-sm text-gray-400">{periodLabel(period)} 기준 · {FEE_DEADLINE_NOTICE}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PeriodFilter value={period} onChange={setPeriod} />
          <Button variant="secondary" onClick={handleExport}>
            엑셀 내보내기
          </Button>
        </div>
      </div>

      {/* 계좌 정보 + 합계 */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FEE500] text-lg font-extrabold text-[#3A1D1D]">
              B
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-500">입금 계좌</div>
              <div className="text-sm font-bold text-gray-800">{ACCOUNT_INFO.bank}</div>
              <div className="truncate text-lg font-extrabold text-brand-600">{ACCOUNT_INFO.number}</div>
              <div className="text-xs text-gray-500">예금주: {ACCOUNT_INFO.holder}</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="text-[13px] text-gray-500">현재 총 회비 (잔고)</div>
          <input
            type="text"
            inputMode="numeric"
            value={balanceInput}
            onChange={(e) => setBalanceInput(e.target.value)}
            onBlur={commitBalance}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            title="현재 팀 잔고 직접 입력 (엔터로 저장)"
            className="mt-1 w-full rounded-lg border border-transparent bg-transparent text-[24px] font-extrabold leading-none text-brand-600 hover:border-gray-200 focus:border-brand-500 focus:outline-none"
          />
          <div className="mt-1 text-xs text-gray-400">클릭해서 수정 가능</div>
        </Card>
        <StatCard label="회비 합계 (청구 기준)" value={formatWon(t.totalExpected)} />
        <StatCard label="총 납부" value={formatWon(t.totalPaid)} tone="green" sub={`납부율 ${t.paymentRate}%`} />
        <StatCard label="미납 합계" value={formatWon(t.totalUnpaid)} tone="red" sub={`미납자 ${t.unpaidCount}명`} />
      </div>

      <Card>
        <SectionTitle
          action={
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={onlyUnpaid} onChange={(e) => setOnlyUnpaid(e.target.checked)} />
                미납자만 보기
              </label>
              <Button onClick={() => setBulkOpen(true)}>☑ 일괄 등록</Button>
            </div>
          }
        >
          회원별 납부 현황
        </SectionTitle>
        <Table>
          <THead>
            <TR>
              <TH>이름</TH>
              <TH>구분</TH>
              <TH>회비</TH>
              <TH>납부</TH>
              <TH>미납</TH>
              <TH>상태</TH>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((mo) => (
                <TH key={mo} className={`px-1 text-center ${mo === 7 ? "border-l border-gray-200" : ""}`}>
                  {mo}
                </TH>
              ))}
            </TR>
          </THead>
          <tbody>
            {visible.map((s) => (
              <TR key={s.member.id}>
                <TD className="font-medium">{s.member.name}</TD>
                <TD>
                  <MemberTypeBadge type={s.member.memberType} />
                </TD>
                <TD>{formatWon(s.expected)}</TD>
                <TD>
                  <EditablePaid value={s.paid} onCommit={(v) => setPaidAmount(s.member.id, v)} />
                </TD>
                <TD className={s.unpaid > 0 ? "font-semibold text-red-600" : ""}>{formatWon(s.unpaid)}</TD>
                <TD>
                  <PaymentStatusBadge status={s.status} />
                </TD>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((mo) => {
                  const st = s.member.monthlyPaymentStatus[mo] ?? "UNKNOWN";
                  return (
                    <TD key={mo} className={`px-1 text-center ${mo === 7 ? "border-l border-gray-100" : ""}`}>
                      <button
                        title={`${mo <= 6 ? "상반기" : "하반기"} 일괄 변경 (납부/미납/면제)`}
                        onClick={() => cycleStatus(s.member.id, mo)}
                        className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-gray-100"
                      >
                        <span className={`h-2.5 w-2.5 rounded-full ${DOT[st]}`} />
                      </button>
                    </TD>
                  );
                })}
              </TR>
            ))}
          </tbody>
        </Table>
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
          ※ 회비는 <b className="text-gray-500">6개월(반기) 단위</b> — 점을 클릭하면 해당 반기(1~6월/7~12월) 전체가 함께 바뀝니다.
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" /> 납부
          <span className="ml-1 inline-block h-2.5 w-2.5 rounded-full bg-red-500" /> 미납
          <span className="ml-1 inline-block h-2.5 w-2.5 rounded-full bg-gray-300" /> 면제.
          <b className="text-gray-500">납부 금액</b> 칸은 직접 입력(엔터로 저장)도 가능합니다.
        </p>
      </Card>

      {/* 환불 관리 */}
      <Card>
        <SectionTitle action={<Button onClick={() => setRefundOpen(true)}>환불 추가</Button>}>환불 관리</SectionTitle>
        <p className="mb-2 text-xs text-gray-500">{REFUND_POLICY.description}</p>
        {refunds.length === 0 ? (
          <p className="text-sm text-gray-400">환불 내역이 없습니다.</p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>이름</TH>
                <TH>개월</TH>
                <TH>금액</TH>
                <TH>사유</TH>
                <TH>날짜</TH>
                <TH>승인</TH>
                <TH>관리</TH>
              </TR>
            </THead>
            <tbody>
              {refunds.map((r) => (
                <TR key={r.id}>
                  <TD>{nameOf(r.memberId)}</TD>
                  <TD>{r.months}개월</TD>
                  <TD>{formatWon(r.amount)}</TD>
                  <TD>{r.reason}</TD>
                  <TD>{r.date}</TD>
                  <TD>{r.approved ? "✅" : "대기"}</TD>
                  <TD>
                    <Button variant="ghost" className="px-2 py-1 text-red-500" onClick={() => removeRefund(r.id)}>
                      삭제
                    </Button>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <RefundModal open={refundOpen} onClose={() => setRefundOpen(false)} members={members} onSave={addRefund} />
      <BulkPaymentModal open={bulkOpen} members={members} onClose={() => setBulkOpen(false)} onApply={applyBulk} />
    </div>
  );
}

/** 실제 납부 금액 인라인 편집 셀 (엔터/포커스 아웃 시 저장) */
function EditablePaid({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  const commit = () => {
    const n = Number(v.replace(/[, 원]/g, ""));
    if (!Number.isNaN(n)) {
      const rounded = Math.max(0, Math.round(n));
      if (rounded !== value) onCommit(rounded);
    } else {
      setV(String(value));
    }
  };
  return (
    <input
      type="text"
      inputMode="numeric"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      title="실제 납부 금액 입력 (엔터로 저장)"
      className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-right text-sm font-medium text-green-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
    />
  );
}
