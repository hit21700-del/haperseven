"use client";
import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormRow, TextInput, Select, Textarea } from "@/components/ui/Field";
import type { Member, MemberType, Position } from "@/types/member";
import { ALL_MEMBER_TYPES } from "@/types/member";
import { getFeeRule } from "@/lib/constants/feePolicy";
import { newMemberId } from "@/lib/repository/memberRepository";
import { currentYear } from "@/lib/utils/format";

const FIELD_POS: Position[] = ["GK", "DF", "MF", "FW"];

function emptyMember(): Member {
  return {
    id: newMemberId(),
    name: "",
    memberType: "정회원",
    feeAmount: getFeeRule("정회원").amount,
    feePeriod: getFeeRule("정회원").period,
    positions: ["MF"],
    preferredPosition: "MF",
    canPlayGK: false,
    fixedGK: false,
    isActive: true,
    monthlyPaymentStatus: {},
  };
}

export function MemberFormModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial?: Member;
  onClose: () => void;
  onSave: (m: Member) => void;
}) {
  const [draft, setDraft] = useState<Member>(initial ?? emptyMember());

  // 모달이 열릴 때 initial 로 리셋
  React.useEffect(() => {
    if (open) setDraft(initial ?? emptyMember());
  }, [open, initial]);

  const set = <K extends keyof Member>(key: K, value: Member[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const togglePosition = (p: Position) => {
    setDraft((d) => {
      const has = d.positions.includes(p);
      const positions = has ? d.positions.filter((x) => x !== p) : [...d.positions, p];
      return { ...d, positions: positions.length ? positions : ["ANY"] };
    });
  };

  const onTypeChange = (mt: MemberType) => {
    const rule = getFeeRule(mt);
    setDraft((d) => ({
      ...d,
      memberType: mt,
      feeAmount: rule.amount,
      feePeriod: rule.period,
      isActive: mt !== "탈퇴" && mt !== "휴식",
    }));
  };

  const handleSave = () => {
    if (!draft.name.trim()) {
      alert("이름을 입력해주세요.");
      return;
    }
    const age = draft.birthYear ? currentYear() - draft.birthYear + 1 : draft.age;
    onSave({ ...draft, age });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "회원 수정" : "회원 추가"}
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
        <FormRow label="이름 *">
          <TextInput value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="홍길동" />
        </FormRow>
        <FormRow label="회원 구분">
          <Select value={draft.memberType} onChange={(e) => onTypeChange(e.target.value as MemberType)}>
            {ALL_MEMBER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="회비 금액(원)">
          <TextInput
            type="number"
            value={draft.feeAmount}
            onChange={(e) => set("feeAmount", Number(e.target.value))}
          />
        </FormRow>
        <FormRow label="회비 납부 구분">
          <Select value={draft.feePeriod} onChange={(e) => set("feePeriod", e.target.value as Member["feePeriod"])}>
            {["1개월", "3개월", "6개월", "참석시", "기타"].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="출생연도">
          <TextInput
            type="number"
            value={draft.birthYear ?? ""}
            onChange={(e) => set("birthYear", e.target.value ? Number(e.target.value) : undefined)}
            placeholder="예: 1990"
          />
        </FormRow>
        <FormRow label="나이(직접 입력 시)">
          <TextInput
            type="number"
            value={draft.age ?? ""}
            onChange={(e) => set("age", e.target.value ? Number(e.target.value) : undefined)}
          />
        </FormRow>

        <div className="sm:col-span-2">
          <FormRow label="가능 포지션 (복수 선택)">
            <div className="flex flex-wrap gap-2">
              {FIELD_POS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePosition(p)}
                  className={`rounded-lg border px-3 py-1 text-sm ${
                    draft.positions.includes(p)
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-gray-300 text-gray-600"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </FormRow>
        </div>

        <FormRow label="선호 포지션">
          <Select
            value={draft.preferredPosition ?? ""}
            onChange={(e) => set("preferredPosition", (e.target.value || undefined) as Position)}
          >
            <option value="">선택 안함</option>
            {FIELD_POS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="활동 여부">
          <Select value={draft.isActive ? "1" : "0"} onChange={(e) => set("isActive", e.target.value === "1")}>
            <option value="1">활동</option>
            <option value="0">비활동(휴식/탈퇴)</option>
          </Select>
        </FormRow>

        <FormRow label="자체전 팀">
          <Select
            value={draft.team ?? ""}
            onChange={(e) => set("team", (e.target.value || undefined) as Member["team"])}
          >
            <option value="">미지정</option>
            <option value="WHITE">화이트</option>
            <option value="BLACK">블랙</option>
          </Select>
        </FormRow>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!draft.isCoach} onChange={(e) => set("isCoach", e.target.checked)} />
            ⭐ 감독
          </label>
        </div>

        <div className="flex items-center gap-4 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.canPlayGK} onChange={(e) => set("canPlayGK", e.target.checked)} />
            GK 가능
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.fixedGK} onChange={(e) => set("fixedGK", e.target.checked)} />
            고정 GK
          </label>
        </div>

        <div className="sm:col-span-2">
          <FormRow label="비고">
            <Textarea value={draft.note ?? ""} onChange={(e) => set("note", e.target.value)} rows={2} />
          </FormRow>
        </div>
      </div>
    </Modal>
  );
}
