"use client";
import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
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
      onClick={() => setTeam(m, team)}
      className={`rounded-md px-2 py-1 text-xs font-medium transition ${
        m.team === team ? cls : "bg-white/10 text-slate-500 hover:bg-white/20"
      }`}
    >
      {label}
    </button>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="자체전 팀 편집"
      footer={
        <button onClick={onClose} className="chrome-button rounded-sm px-4 py-2 text-sm font-black text-white">
          닫기
        </button>
      }
    >
      <div className="mb-3 flex items-center gap-3 text-sm">
        <span className="rounded-full bg-white/90 px-3 py-1 font-semibold text-slate-900">🤍 화이트 {whiteCount}명</span>
        <span className="rounded-full border border-white/30 bg-black px-3 py-1 font-semibold text-white">🖤 블랙 {blackCount}명</span>
        <span className="text-xs text-slate-400">⭐ = 감독</span>
      </div>
      <TextInput placeholder="이름 검색" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-2" />

      <div className="max-h-96 overflow-y-auto rounded-lg border border-white/10">
        {list.map((m) => (
          <div key={m.id} className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-sm last:border-b-0">
            <button
              onClick={() => toggleCoach(m)}
              title="감독 지정/해제"
              className={`text-base ${m.isCoach ? "text-amber-400" : "text-slate-500 hover:text-amber-300"}`}
            >
              ★
            </button>
            <span className="w-16 font-semibold text-white">{m.name}</span>
            <MemberTypeBadge type={m.memberType} />
            <div className="ml-auto flex gap-1">
              <TeamBtn m={m} team="WHITE" label="화이트" cls="bg-white/90 text-slate-900 ring-1 ring-white/60" />
              <TeamBtn m={m} team="BLACK" label="블랙" cls="bg-black text-white ring-1 ring-white/40" />
              <TeamBtn m={m} team={undefined} label="미지정" cls="bg-slate-500/30 text-slate-200 ring-1 ring-slate-400/50" />
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="px-3 py-6 text-center text-sm text-slate-500">검색 결과가 없습니다.</div>}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        ※ 변경은 즉시 저장됩니다. 명단에 없던 <b>박성재</b> 등은 자동 추가돼 있습니다(회원 관리에서 구분·포지션 보완).
      </p>
    </Modal>
  );
}
