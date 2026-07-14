"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { MemberTypeBadge } from "@/components/ui/Badge";
import type { Member } from "@/types/member";

/**
 * 참여 인원 선택 모달 (좌: 전체 명단 체크 / 우: 선택된 인원 칩)
 * 선택된 memberId 목록을 onConfirm 으로 반환한다.
 */
export function ParticipantPickerModal({
  open,
  members,
  selectedIds,
  onClose,
  onConfirm,
}: {
  open: boolean;
  members: Member[];
  selectedIds: string[];
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>(selectedIds);
  const [search, setSearch] = useState("");

  // 모달이 열릴 때 현재 선택값으로 동기화
  useEffect(() => {
    if (open) {
      setPicked(selectedIds);
      setSearch("");
    }
  }, [open, selectedIds]);

  const toggle = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const filtered = useMemo(
    () => members.filter((m) => !search || m.name.includes(search)),
    [members, search],
  );
  const pickedMembers = picked
    .map((id) => members.find((m) => m.id === id))
    .filter((m): m is Member => Boolean(m));

  const allFilteredChecked = filtered.length > 0 && filtered.every((m) => picked.includes(m.id));
  const toggleAllFiltered = () => {
    if (allFilteredChecked) {
      const remove = new Set(filtered.map((m) => m.id));
      setPicked((prev) => prev.filter((id) => !remove.has(id)));
    } else {
      setPicked((prev) => Array.from(new Set([...prev, ...filtered.map((m) => m.id)])));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="참여 인원 선택"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button onClick={() => onConfirm(picked)}>확인 ({picked.length}명)</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* 좌: 전체 명단 + 검색 */}
        <div className="flex flex-col">
          <div className="mb-2 flex items-center gap-2">
            <TextInput placeholder="이름 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
            <button onClick={toggleAllFiltered} className="whitespace-nowrap text-xs text-brand-600 hover:underline">
              {allFilteredChecked ? "전체 해제" : "전체 선택"}
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200">
            {filtered.map((m) => (
              <label
                key={m.id}
                className="flex cursor-pointer items-center gap-2 border-b border-gray-100 px-3 py-2 text-sm last:border-b-0 hover:bg-gray-50"
              >
                <input type="checkbox" checked={picked.includes(m.id)} onChange={() => toggle(m.id)} />
                <span className="flex-1">{m.name}</span>
                <MemberTypeBadge type={m.memberType} />
              </label>
            ))}
            {filtered.length === 0 && <div className="px-3 py-4 text-sm text-gray-400">검색 결과가 없습니다.</div>}
          </div>
        </div>

        {/* 우: 선택된 인원 칩 */}
        <div className="flex flex-col">
          <div className="mb-2 text-sm font-medium text-gray-600">선택 {pickedMembers.length}</div>
          <div className="max-h-72 min-h-[6rem] flex-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
            {pickedMembers.length === 0 ? (
              <div className="px-1 py-2 text-sm text-gray-400">왼쪽에서 참여 인원을 선택하세요.</div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {pickedMembers.map((m) => (
                  <span
                    key={m.id}
                    className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-1 text-xs text-brand-700"
                  >
                    {m.name}
                    <button onClick={() => toggle(m.id)} className="text-brand-400 hover:text-red-500" aria-label="제외">
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
