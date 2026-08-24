"use client";
import React, { useState } from "react";
import { Star } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { MemberTypeBadge } from "@/components/ui/Badge";
import type { Member, TeamColor } from "@/types/member";

/**
 * 자체전 팀 편집 모달.
 * 각 회원을 화이트/블랙/미지정으로 배정하고 감독을 지정한다(즉시 저장).
 * 상/하반기마다 여기서 팀을 바꾸면 된다.
 */
export function TeamEditModal({
  open,
  members,
  onClose,
  onUpdate,
}: {
  open: boolean;
  members: Member[];
  onClose: () => void;
  onUpdate: (m: Member) => void;
}) {
  const [search, setSearch] = useState("");

  const active = members.filter((m) => m.isActive);
  const list = active.filter((m) => !search || m.name.includes(search));
  const whiteCount = active.filter((m) => m.team === "WHITE").length;
  const blackCount = active.filter((m) => m.team === "BLACK").length;

  const setTeam = (m: Member, team?: TeamColor) => onUpdate({ ...m, team });
  const toggleCoach = (m: Member) => onUpdate({ ...m, isCoach: !m.isCoach });

  const TeamBtn = ({ m, team, label, cls }: { m: Member; team?: TeamColor; label: string; cls: string }) => (
    <button
      type="button"
      onClick={() => setTeam(m, team)}
      aria-pressed={m.team === team}
      className={`rounded-md px-2 py-1 text-xs font-medium transition ${
        m.team === team ? cls : "bg-surface-2 text-fg-muted hover:bg-surface-3"
      }`}
    >
      {label}
    </button>
  );

  return (
    <Modal open={open} onClose={onClose} title="자체전 팀 편집" footer={<Button onClick={onClose}>닫기</Button>}>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full border border-gray-300 bg-white px-3 py-1 font-semibold text-gray-900">화이트 {whiteCount}명</span>
        <span className="rounded-full border border-white/20 bg-black px-3 py-1 font-semibold text-white">블랙 {blackCount}명</span>
        <span className="flex items-center gap-1 text-xs text-fg-muted">
          <Star size={12} className="fill-amber-300 text-amber-600 dark:fill-amber-500/40 dark:text-amber-400" aria-hidden="true" /> = 감독
        </span>
      </div>
      <TextInput placeholder="이름을 검색하세요" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-2" aria-label="이름 검색" />

      <div className="max-h-96 overflow-y-auto rounded-lg border border-line-soft">
        {list.map((m) => (
          <div key={m.id} className="flex items-center gap-2 border-b border-line-soft px-3 py-2 text-sm last:border-b-0">
            <button
              type="button"
              onClick={() => toggleCoach(m)}
              aria-pressed={m.isCoach}
              aria-label="감독 지정"
              title="감독 지정/해제"
              className="inline-grid h-8 w-8 place-items-center rounded-md hover:bg-surface-3"
            >
              <Star size={16} className={m.isCoach ? "fill-amber-300 text-amber-600 dark:fill-amber-500/40 dark:text-amber-400" : "text-fg-muted"} aria-hidden="true" />
            </button>
            <span className="w-16 font-semibold text-fg">{m.name}</span>
            <MemberTypeBadge type={m.memberType} />
            <div className="ml-auto flex gap-1">
              <TeamBtn m={m} team="WHITE" label="화이트" cls="border border-gray-300 bg-white text-gray-900" />
              <TeamBtn m={m} team="BLACK" label="블랙" cls="border border-white/20 bg-black text-white" />
              <TeamBtn m={m} team={undefined} label="미지정" cls="bg-surface-3 text-fg-2 ring-1 ring-line" />
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="px-3 py-6 text-center text-sm text-fg-muted">검색 결과가 없습니다.</div>}
      </div>
      <p className="mt-2 text-xs text-fg-muted">
        ※ 변경은 즉시 저장됩니다. 명단에 없던 <b>박성재</b> 등은 자동 추가돼 있습니다. (회원 관리에서 구분·포지션 보완)
      </p>
    </Modal>
  );
}
