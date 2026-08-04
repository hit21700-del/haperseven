"use client";
import React, { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { MemberTypeBadge } from "@/components/ui/Badge";
import type { Member, PaymentStatus } from "@/types/member";
import { formatWon } from "@/lib/utils/format";

type Half = 1 | 2; // 1=상반기(1~6월), 2=하반기(7~12월)

const STATUS_OPTIONS: { value: PaymentStatus; label: string; cls: string }[] = [
  { value: "PAID", label: "✔ 납부", cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/50" },
  { value: "UNPAID", label: "✖ 미납", cls: "bg-rose-500/15 text-rose-300 ring-rose-400/50" },
  { value: "EXEMPT", label: "— 면제", cls: "bg-slate-500/15 text-slate-300 ring-slate-400/50" },
  { value: "UNKNOWN", label: "○ 지우기", cls: "bg-white/5 text-slate-400 ring-white/20" },
];

/** 반기의 현재 상태 요약(점 표시용) */
function halfStatus(m: Member, half: Half): PaymentStatus {
  const months = half === 1 ? [1, 2, 3, 4, 5, 6] : [7, 8, 9, 10, 11, 12];
  const sts = months.map((mo) => m.monthlyPaymentStatus[mo] ?? "UNKNOWN");
  if (sts.includes("UNPAID")) return "UNPAID";
  if (sts.includes("PAID")) return "PAID";
  if (sts.every((s) => s === "EXEMPT")) return "EXEMPT";
  return "UNKNOWN";
}

const DOT: Record<PaymentStatus, string> = {
  PAID: "bg-emerald-400",
  UNPAID: "bg-rose-400",
  EXEMPT: "bg-slate-500",
  UNKNOWN: "bg-slate-600",
};

/**
 * 회비 납부 일괄 등록 모달.
 * 회원 여러 명을 선택해 반기(6개월) 납부 상태를 한 번에 변경한다.
 */
export function BulkPaymentModal({
  open,
  members,
  onClose,
  onApply,
}: {
  open: boolean;
  members: Member[];
  onClose: () => void;
  onApply: (memberIds: string[], half: Half, status: PaymentStatus) => void;
}) {
  const [half, setHalf] = useState<Half>(1);
  const [status, setStatus] = useState<PaymentStatus>("PAID");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const active = useMemo(() => members.filter((m) => m.isActive), [members]);
  const list = active.filter((m) => !search || m.name.includes(search));

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allChecked = list.length > 0 && list.every((m) => picked.has(m.id));
  const toggleAll = () =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (allChecked) list.forEach((m) => next.delete(m.id));
      else list.forEach((m) => next.add(m.id));
      return next;
    });

  /** 회비가 있는 회원만 빠르게 선택 */
  const pickFeeOnly = () => setPicked(new Set(active.filter((m) => m.feeAmount > 0).map((m) => m.id)));

  const handleApply = () => {
    if (picked.size === 0) {
      alert("회원을 1명 이상 선택하세요.");
      return;
    }
    onApply([...picked], half, status);
    setPicked(new Set());
    onClose();
  };

  const statusLabel = STATUS_OPTIONS.find((s) => s.value === status)?.label ?? "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="회비 납부 일괄 등록"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleApply}>
            {picked.size}명 · {half === 1 ? "상반기" : "하반기"} {statusLabel} 적용
          </Button>
        </>
      }
    >
      {/* 반기 + 상태 선택 */}
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-300">기간 (반기)</div>
          <div className="flex gap-2">
            {(
              [
                [1, "상반기 (1~6월)"],
                [2, "하반기 (7~12월)"],
              ] as [Half, string][]
            ).map(([h, label]) => (
              <button
                key={h}
                onClick={() => setHalf(h)}
                className={`flex-1 rounded-sm border px-3 py-2 text-sm ${
                  half === h
                    ? "border-blue-400/60 bg-blue-500/15 font-semibold text-blue-300"
                    : "border-slate-500/50 text-slate-400 hover:bg-white/5"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-300">등록할 상태</div>
          <div className="flex gap-1.5">
            {STATUS_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setStatus(o.value)}
                className={`flex-1 rounded-sm px-2 py-2 text-xs font-semibold ring-1 ${
                  status === o.value ? o.cls + " ring-2" : "bg-black/25 text-slate-500 ring-white/10 hover:bg-white/5"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 회원 선택 */}
      <div className="mb-2 flex items-center gap-2">
        <TextInput placeholder="이름 검색" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
        <button onClick={toggleAll} className="whitespace-nowrap text-xs font-medium text-blue-300 hover:text-blue-200 hover:underline">
          {allChecked ? "전체 해제" : "전체 선택"}
        </button>
        <button onClick={pickFeeOnly} className="whitespace-nowrap text-xs font-medium text-blue-300 hover:text-blue-200 hover:underline">
          회비 대상만
        </button>
      </div>

      <div className="max-h-72 overflow-y-auto rounded-sm border border-white/10">
        {list.map((m) => {
          const cur = halfStatus(m, half);
          return (
            <label
              key={m.id}
              className="flex cursor-pointer items-center gap-2 border-b border-white/5 px-3 py-2 text-sm last:border-b-0 hover:bg-white/5"
            >
              <input type="checkbox" checked={picked.has(m.id)} onChange={() => toggle(m.id)} />
              <span className="w-16 font-semibold text-slate-200">{m.name}</span>
              <MemberTypeBadge type={m.memberType} />
              <span className="ml-auto flex items-center gap-2 text-xs text-slate-500">
                {m.feeAmount > 0 ? formatWon(m.feeAmount) : "회비 없음"}
                <span title="현재 상태" className={`h-2.5 w-2.5 rounded-full ${DOT[cur]}`} />
              </span>
            </label>
          );
        })}
        {list.length === 0 && <div className="px-3 py-6 text-center text-sm text-slate-500">검색 결과가 없습니다.</div>}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        ※ 선택한 회원의 {half === 1 ? "1~6월" : "7~12월"} 전체가 한 번에 변경됩니다. 오른쪽 점은 현재 상태(
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" /> 납부{" "}
        <span className="inline-block h-2 w-2 rounded-full bg-rose-400" /> 미납)입니다.
      </p>
    </Modal>
  );
}
