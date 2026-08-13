"use client";
import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormRow, Select, TextInput, Textarea } from "@/components/ui/Field";
import type { Member } from "@/types/member";
import type { RefundRecord } from "@/types/payment";
import { calcRefundAmount, REFUND_POLICY } from "@/lib/constants/feePolicy";
import { newId } from "@/lib/repository/paymentRepository";
import { todayISO } from "@/lib/utils/format";

const REASONS: RefundRecord["reason"][] = ["개인사정", "탈퇴", "학생", "장기부상", "기타"];

export function RefundModal({
  open,
  onClose,
  members,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  members: Member[];
  onSave: (r: RefundRecord) => void;
}) {
  const [memberId, setMemberId] = useState("");
  const [months, setMonths] = useState(REFUND_POLICY.minMonths);
  const [reason, setReason] = useState<RefundRecord["reason"]>("개인사정");
  const [approved, setApproved] = useState(true);
  const [note, setNote] = useState("");

  const amount = calcRefundAmount(months);

  const handleSave = () => {
    if (!memberId) {
      alert("회원을 선택하세요.");
      return;
    }
    if (months < REFUND_POLICY.minMonths) {
      alert(`환불은 최소 ${REFUND_POLICY.minMonths}개월부터 가능합니다.`);
      return;
    }
    onSave({ id: newId("refund"), memberId, months, amount, reason, date: todayISO(), approved, note: note || undefined });
    onClose();
    setMemberId("");
    setMonths(REFUND_POLICY.minMonths);
    setNote("");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="환불 추가"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSave}>저장</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormRow label="회원">
          <Select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="">선택</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.memberType})
              </option>
            ))}
          </Select>
        </FormRow>
        <FormRow label={`환불 개월 (최소 ${REFUND_POLICY.minMonths})`}>
          <TextInput type="number" min={REFUND_POLICY.minMonths} value={months} onChange={(e) => setMonths(Number(e.target.value))} />
        </FormRow>
        <FormRow label="환불 금액(자동 계산)">
          <TextInput value={`${amount.toLocaleString()}원`} readOnly />
        </FormRow>
        <FormRow label="사유">
          <Select value={reason} onChange={(e) => setReason(e.target.value as RefundRecord["reason"])}>
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="스텝 협의 승인">
          <Select value={approved ? "1" : "0"} onChange={(e) => setApproved(e.target.value === "1")}>
            <option value="1">승인</option>
            <option value="0">대기(협의 필요)</option>
          </Select>
        </FormRow>
        <div className="sm:col-span-2">
          <FormRow label="비고">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </FormRow>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-400">※ 1개월당 {REFUND_POLICY.amountPerMonth.toLocaleString()}원. 장기부상은 스텝 협의 후 승인 처리하세요.</p>
    </Modal>
  );
}
