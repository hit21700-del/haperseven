"use client";
import React, { useMemo, useState, useEffect } from "react";
import { ChevronDown, Copy, Download, Landmark, ListChecks, Plus, Receipt, RotateCcw } from "lucide-react";
import { useAppStore } from "@/lib/store/AppStore";
import { Card, StatCard, SectionTitle } from "@/components/ui/Card";
import { Button, IconButton } from "@/components/ui/Button";
import { Table, THead, TH, TD, TR } from "@/components/ui/Table";
import { Badge, PaymentStatusBadge, MemberTypeBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { PeriodFilter } from "@/components/common/PeriodFilter";
import type { Period } from "@/lib/stats/period";
import { monthsInPeriod, periodLabel } from "@/lib/stats/period";
import { summarizeAll, totals } from "@/lib/payments/paymentService";
import { ACCOUNT_INFO, REFUND_POLICY, FEE_DEADLINE_NOTICE } from "@/lib/constants/feePolicy";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatWon, currentYear } from "@/lib/utils/format";
import type { PaymentStatus } from "@/types/member";
import type { RefundRecord } from "@/types/payment";
import { RefundModal } from "./RefundModal";
import { BulkPaymentModal } from "./BulkPaymentModal";

const STATUS_CYCLE: PaymentStatus[] = ["UNKNOWN", "PAID", "UNPAID", "EXEMPT"];

// 반기(6개월) 상태 표시 배지 스타일/라벨 — 12px 텍스트 AA 대비(-700) + 클릭 어포던스용 ring/hover
const HALF_BADGE: Record<PaymentStatus, { label: string; cls: string }> = {
  PAID: { label: "납부", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/25" },
  UNPAID: { label: "미납", cls: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300 ring-red-200 dark:ring-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/25" },
  EXEMPT: { label: "면제", cls: "bg-surface-3 text-fg-2 ring-line hover:bg-surface-3" },
  UNKNOWN: { label: "－", cls: "bg-surface-2 text-fg-muted ring-line hover:bg-surface-3" },
};

const HALF_LABEL: Record<1 | 2, string> = { 1: "상반기", 2: "하반기" };

/** 반기의 대표 상태: 미납 표시가 하나라도 있으면 미납, 납부 표시가 있으면 납부, 전부 면제면 면제 */
function halfStatusOf(monthly: Record<number, PaymentStatus>, half: 1 | 2): PaymentStatus {
  const months = half === 1 ? [1, 2, 3, 4, 5, 6] : [7, 8, 9, 10, 11, 12];
  const sts = months.map((mo) => monthly[mo] ?? "UNKNOWN");
  if (sts.includes("UNPAID")) return "UNPAID";
  if (sts.includes("PAID")) return "PAID";
  if (sts.every((s) => s === "EXEMPT")) return "EXEMPT";
  return "UNKNOWN";
}

export function PaymentsPage() {
  const { members, matches, paymentEntries, setPaymentEntries, upsertMember, refunds, setRefunds, teamBalance, setTeamBalance } =
    useAppStore();
  const toast = useToast();
  const [period, setPeriod] = useState<Period>({ type: "year", year: currentYear() });
  const [onlyUnpaid, setOnlyUnpaid] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  // 현재 팀 잔고(총 회비) — 스토어(local: localStorage / cloud: DB)에 저장, 직접 수정 가능
  const [balanceInput, setBalanceInput] = useState(teamBalance.toLocaleString("ko-KR") + "원");
  useEffect(() => {
    setBalanceInput(teamBalance.toLocaleString("ko-KR") + "원");
  }, [teamBalance]);
  const commitBalance = () => {
    const n = Number(balanceInput.replace(/[, 원]/g, ""));
    if (!Number.isNaN(n) && n >= 0) {
      setTeamBalance(Math.round(n));
      setBalanceInput(Math.round(n).toLocaleString("ko-KR") + "원");
    } else {
      setBalanceInput(teamBalance.toLocaleString("ko-KR") + "원");
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

  const addRefund = (r: RefundRecord) => {
    setRefunds([...refunds, r]);
    toast("환불 내역을 추가했습니다.");
  };
  const removeRefund = (id: string) => {
    setRefunds(refunds.filter((x) => x.id !== id));
    toast("환불 내역을 삭제했습니다.", "info");
  };

  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? id;

  const copyAccount = async () => {
    try {
      await navigator.clipboard.writeText(ACCOUNT_INFO.number);
      toast("계좌번호를 복사했습니다.");
    } catch {
      toast("복사에 실패했습니다. 계좌번호를 직접 선택해 복사해 주세요.", "error");
    }
  };

  const handleExport = async () => {
    const { exportPaymentsToExcel } = await import("@/lib/excel/excelExporter"); // 클릭 시점에만 xlsx 로드
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
    toast("엑셀 파일을 내보냈습니다.");
  };

  /** 상/하반기 상태 버튼 — 표와 모바일 카드에서 동일하게 사용 */
  const renderHalfButton = (memberId: string, monthly: Record<number, PaymentStatus>, half: 1 | 2) => {
    const st = halfStatusOf(monthly, half);
    const badge = HALF_BADGE[st];
    const current = st === "UNKNOWN" ? "미정" : badge.label;
    return (
      <button
        type="button"
        title={`${HALF_LABEL[half]} 상태 변경 (클릭: 납부→미납→면제→해제)`}
        aria-label={`${HALF_LABEL[half]} 납부 상태 변경 (현재: ${current})`}
        onClick={() => cycleStatus(memberId, half === 1 ? 1 : 7)}
        className={`inline-flex min-h-8 min-w-16 items-center justify-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition-colors ${badge.cls}`}
      >
        {badge.label}
        <ChevronDown size={12} aria-hidden="true" />
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="회비 관리"
        description={`${periodLabel(period)} 기준 · ${FEE_DEADLINE_NOTICE}`}
        action={
          <div className="flex flex-wrap gap-2">
            <PeriodFilter value={period} onChange={setPeriod} />
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} aria-hidden="true" />
              엑셀 내보내기
            </Button>
          </div>
        }
      />

      {/* 계좌 정보 + 합계 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Card className="col-span-2 md:col-span-1">
          <div className="flex items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-yellow-300 text-gray-900"
              aria-hidden="true"
            >
              <Landmark size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-fg-muted">입금 계좌</div>
              <div className="text-sm font-bold text-fg">{ACCOUNT_INFO.bank}</div>
              <div className="mt-1 flex items-center gap-1">
                <div className="whitespace-nowrap text-lg font-bold leading-none tracking-tight tabular-nums text-brand sm:text-xl">
                  {ACCOUNT_INFO.number}
                </div>
                <IconButton aria-label="계좌번호 복사" title="계좌번호 복사" onClick={copyAccount} className="shrink-0">
                  <Copy size={16} aria-hidden="true" />
                </IconButton>
              </div>
              <div className="text-xs text-fg-muted">예금주: {ACCOUNT_INFO.holder}</div>
            </div>
          </div>
        </Card>
        <Card>
          <label className="block">
            <span className="block text-xs font-medium text-fg-muted">현재 총 회비 (잔고)</span>
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
              className="mt-2 w-full whitespace-nowrap rounded-sm border border-transparent bg-transparent text-2xl font-bold leading-none tabular-nums text-brand hover:border-line focus:border-brand focus:outline-none"
            />
          </label>
          <div className="mt-2 text-xs text-fg-muted">클릭해서 수정 가능</div>
        </Card>
        <StatCard label="회비 합계 (청구 기준)" value={formatWon(t.totalExpected)} />
        <StatCard label="총 납부" value={formatWon(t.totalPaid)} tone="green" sub={`납부율 ${t.paymentRate}%`} />
        <StatCard label="미납 합계" value={formatWon(t.totalUnpaid)} tone="red" sub={`미납자 ${t.unpaidCount}명`} />
      </div>

      <Card>
        <SectionTitle
          icon={<Receipt size={16} />}
          action={
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-fg-2">
                <input type="checkbox" checked={onlyUnpaid} onChange={(e) => setOnlyUnpaid(e.target.checked)} />
                미납자만 보기
              </label>
              <Button onClick={() => setBulkOpen(true)}>
                <ListChecks size={16} aria-hidden="true" />
                일괄 등록
              </Button>
            </div>
          }
        >
          회원별 납부 현황
        </SectionTitle>

        {visible.length === 0 ? (
          <EmptyState
            compact
            icon={<Receipt size={18} />}
            title={onlyUnpaid ? "미납자가 없습니다." : "표시할 회원이 없습니다."}
            description={onlyUnpaid ? "모든 회원이 회비를 납부했습니다." : "회원을 먼저 등록해 주세요."}
          />
        ) : (
          <>
            {/* 데스크톱: 표 */}
            <div className="hidden md:block">
              <Table>
                <THead>
                  <TR>
                    <TH>이름</TH>
                    <TH>구분</TH>
                    <TH>회비</TH>
                    <TH>납부</TH>
                    <TH>미납</TH>
                    <TH>상태</TH>
                    <TH className="text-center">상반기 (1~6월)</TH>
                    <TH className="text-center">하반기 (7~12월)</TH>
                  </TR>
                </THead>
                <tbody>
                  {visible.map((s) => (
                    <TR key={s.member.id}>
                      <TD className="font-medium">{s.member.name}</TD>
                      <TD>
                        <MemberTypeBadge type={s.member.memberType} />
                      </TD>
                      <TD className="tabular-nums">{formatWon(s.expected)}</TD>
                      <TD>
                        <EditablePaid value={s.paid} onCommit={(v) => setPaidAmount(s.member.id, v)} />
                      </TD>
                      <TD className={`tabular-nums ${s.unpaid > 0 ? "font-semibold text-red-600 dark:text-red-400" : ""}`}>
                        {formatWon(s.unpaid)}
                      </TD>
                      <TD>
                        <PaymentStatusBadge status={s.status} />
                      </TD>
                      {([1, 2] as const).map((half) => (
                        <TD key={half} className="text-center">
                          {renderHalfButton(s.member.id, s.member.monthlyPaymentStatus, half)}
                        </TD>
                      ))}
                    </TR>
                  ))}
                </tbody>
              </Table>
            </div>

            {/* 모바일: 카드 리스트 */}
            <div className="space-y-2 md:hidden">
              {visible.map((s) => (
                <div key={s.member.id} className="rounded-xl border border-line bg-surface p-3 shadow-sm dark:shadow-none">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-fg">{s.member.name}</span>
                    <MemberTypeBadge type={s.member.memberType} />
                    <span className="ml-auto">
                      <PaymentStatusBadge status={s.status} />
                    </span>
                  </div>
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-fg-muted">회비</dt>
                      <dd className="mt-0.5 font-semibold tabular-nums text-fg-2">{formatWon(s.expected)}</dd>
                    </div>
                    <div>
                      <dt className="text-fg-muted">납부</dt>
                      <dd className="mt-0.5 font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{formatWon(s.paid)}</dd>
                    </div>
                    <div>
                      <dt className="text-fg-muted">미납</dt>
                      <dd className={`mt-0.5 font-semibold tabular-nums ${s.unpaid > 0 ? "text-red-600 dark:text-red-400" : "text-fg-2"}`}>
                        {formatWon(s.unpaid)}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                    {([1, 2] as const).map((half) => (
                      <div key={half} className="flex items-center gap-1.5">
                        <span className="text-xs text-fg-muted">{HALF_LABEL[half]}</span>
                        {renderHalfButton(s.member.id, s.member.monthlyPaymentStatus, half)}
                      </div>
                    ))}
                    <label className="ml-auto flex items-center gap-1.5 text-xs text-fg-muted">
                      납부액
                      <EditablePaid value={s.paid} onCommit={(v) => setPaidAmount(s.member.id, v)} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="mt-2 text-xs text-fg-muted">
          ※ 회비는 <b className="text-fg-2">6개월(반기) 단위</b>입니다. 상반기/하반기 배지를 클릭하면{" "}
          <b className="text-emerald-700 dark:text-emerald-400">납부</b> → <b className="text-red-600 dark:text-red-400">미납</b> →{" "}
          <b className="text-fg-2">면제</b> → 해제 순으로 바뀌고, <b className="text-fg-2">납부 금액</b> 칸은 직접
          입력(엔터로 저장)도 가능합니다.
        </p>
      </Card>

      {/* 환불 관리 */}
      <Card>
        <SectionTitle
          icon={<RotateCcw size={16} />}
          action={
            <Button onClick={() => setRefundOpen(true)}>
              <Plus size={16} aria-hidden="true" />
              환불 추가
            </Button>
          }
        >
          환불 관리
        </SectionTitle>
        <p className="mb-2 text-xs text-fg-muted">{REFUND_POLICY.description}</p>
        {refunds.length === 0 ? (
          <EmptyState
            compact
            icon={<RotateCcw size={18} />}
            title="환불 내역이 없습니다."
            description="환불 추가 버튼으로 새 환불을 등록할 수 있습니다."
          />
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
                  <TD className="tabular-nums">{formatWon(r.amount)}</TD>
                  <TD>{r.reason}</TD>
                  <TD>{r.date}</TD>
                  <TD>{r.approved ? <Badge tone="green">승인</Badge> : <Badge tone="yellow">대기</Badge>}</TD>
                  <TD>
                    <Button variant="ghost" className="min-h-8 px-2 py-1 text-red-600 dark:text-red-400" onClick={() => removeRefund(r.id)}>
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
      aria-label="실제 납부 금액"
      className="w-24 rounded-lg border border-line bg-surface px-2 py-1 text-right text-sm font-bold tabular-nums text-fg focus:border-brand focus:outline-none"
    />
  );
}
