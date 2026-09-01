"use client";
import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormRow, TextInput, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import type { Member } from "@/types/member";
import { buildGuestMember, GUEST_POS_OPTIONS as POS_OPTIONS } from "@/lib/formation/guestMember";

/**
 * 일회용 용병(게스트) 추가 모달.
 * 회원 명단에는 저장하지 않고, 이번 포메이션 참여 인원으로만 사용한다.
 */
export function GuestAddModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (m: Member) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [primary, setPrimary] = useState("CM");
  const [secondary, setSecondary] = useState("");

  const reset = () => {
    setName("");
    setAge("");
    setPrimary("CM");
    setSecondary("");
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast("이름을 입력하세요.", "error");
      return;
    }
    const guest: Member = buildGuestMember({
      name,
      detailPositions: [primary, secondary].filter((p) => p && p !== ""),
      age: age ? Number(age) : undefined,
    });
    onAdd(guest);
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="용병 추가"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSave}>용병 추가</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormRow label="이름 *">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="용병 이름을 입력하세요" />
        </FormRow>
        <FormRow label="나이">
          <TextInput type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="예: 28" />
        </FormRow>
        <FormRow label="주 포지션">
          <Select value={primary} onChange={(e) => setPrimary(e.target.value)}>
            {POS_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="부 포지션 (선택)">
          <Select value={secondary} onChange={(e) => setSecondary(e.target.value)}>
            <option value="">없음</option>
            {POS_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </FormRow>
      </div>
      <p className="mt-3 text-xs text-fg-muted">
        ※ 일회용 용병은 <b>회원 명단에 저장되지 않고</b> 이번 포메이션 참여 인원으로만 추가됩니다. (회비 0원 / 참석시)
      </p>
    </Modal>
  );
}
