"use client";
import React, { useState } from "react";
import { Users, UserPlus, X } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextInput, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { GUEST_POS_OPTIONS } from "@/lib/formation/guestMember";
import type { Match, MatchGuest } from "@/types/match";
import type { Member, TeamColor } from "@/types/member";

const TEAMS: { key: TeamColor; label: string; active: string; idle: string }[] = [
  {
    key: "WHITE",
    label: "화이트",
    active: "border-gray-400 bg-white text-gray-900 shadow-sm dark:border-gray-300 dark:bg-gray-100",
    idle: "border-line bg-surface text-fg-muted hover:bg-surface-2",
  },
  {
    key: "BLACK",
    label: "블랙",
    active: "border-black bg-neutral-900 text-white",
    idle: "border-line bg-surface text-fg-muted hover:bg-surface-2",
  },
];

/**
 * 경기별 자체전 팀 편성 — 참가자(참석/지각 회원 + 용병)를 이 경기에 한해 화이트/블랙으로 나눈다.
 * 전역 member.team 은 건드리지 않고 match.teamAssignments 에만 저장한다.
 * 용병은 match.guests 에 이름·포지션·팀과 함께 저장된다.
 */
export function MatchTeamPanel({
  match,
  members,
  onChange,
}: {
  match: Match;
  members: Member[];
  onChange: (m: Match) => void;
}) {
  const toast = useToast();
  const [gName, setGName] = useState("");
  const [gPrimary, setGPrimary] = useState("CM");
  const [gSecondary, setGSecondary] = useState("");
  const [gTeam, setGTeam] = useState<TeamColor>("WHITE");

  const guests = match.guests ?? [];
  const assigns = match.teamAssignments ?? {};

  // 참석·지각 회원
  const attendeeMembers = members.filter((m) =>
    match.attendance.some((a) => a.memberId === m.id && (a.status === "ATTEND" || a.status === "LATE")),
  );

  // 참가자 행 (회원 + 용병). fallback = 전역 팀(회원) 또는 용병 등록 시 팀
  type Row = { id: string; name: string; isGuest: boolean; sub?: string; fallback?: TeamColor };
  const rows: Row[] = [
    ...attendeeMembers.map((m) => ({ id: m.id, name: m.name, isGuest: false, sub: m.memberType, fallback: m.team })),
    ...guests.map((g) => ({ id: g.id, name: g.name, isGuest: true, sub: g.positions, fallback: g.team })),
  ];

  const teamOf = (r: Row): TeamColor | undefined => assigns[r.id] ?? r.fallback;
  const countTeam = (tc: TeamColor) => rows.filter((r) => teamOf(r) === tc).length;
  const unassigned = rows.filter((r) => !teamOf(r)).length;

  const setTeam = (id: string, tc: TeamColor | undefined) => {
    const next = { ...assigns };
    if (tc) next[id] = tc;
    else delete next[id];
    onChange({ ...match, teamAssignments: next });
  };

  const addGuest = () => {
    const name = gName.trim();
    if (!name) return toast("용병 이름을 입력하세요.", "error");
    const posStr = [gPrimary, gSecondary].filter(Boolean).join(",");
    const id = `mguest-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`;
    const guest: MatchGuest = { id, name, positions: posStr, team: gTeam };
    onChange({ ...match, guests: [...guests, guest], teamAssignments: { ...assigns, [id]: gTeam } });
    setGName("");
    setGPrimary("CM");
    setGSecondary("");
    toast(`용병 ${name} 추가 (${gTeam === "WHITE" ? "화이트" : "블랙"})`);
  };

  const removeGuest = (id: string) => {
    const nextAssigns = { ...assigns };
    delete nextAssigns[id];
    onChange({ ...match, guests: guests.filter((g) => g.id !== id), teamAssignments: nextAssigns });
  };

  return (
    <Card>
      <SectionTitle
        icon={<Users size={15} aria-hidden="true" />}
        action={
          <span className="text-xs text-fg-muted">
            화이트 <b className="text-fg">{countTeam("WHITE")}</b> · 블랙 <b className="text-fg">{countTeam("BLACK")}</b> · 미배정 {unassigned}
          </span>
        }
      >
        자체전 팀 편성 <span className="ml-1 text-sm font-normal text-fg-muted">(이 경기에만 적용)</span>
      </SectionTitle>

      {/* 용병 추가 */}
      <div className="mb-4 rounded-xl border border-dashed border-line bg-surface-2 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-fg-2">
          <UserPlus size={14} aria-hidden="true" /> 용병 추가
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
          <TextInput
            className="sm:col-span-2"
            value={gName}
            onChange={(e) => setGName(e.target.value)}
            placeholder="용병 이름"
            aria-label="용병 이름"
          />
          <Select value={gPrimary} onChange={(e) => setGPrimary(e.target.value)} aria-label="주 포지션">
            {GUEST_POS_OPTIONS.map((p) => (
              <option key={p} value={p}>
                주 {p}
              </option>
            ))}
          </Select>
          <Select value={gSecondary} onChange={(e) => setGSecondary(e.target.value)} aria-label="부 포지션">
            <option value="">부 없음</option>
            {GUEST_POS_OPTIONS.map((p) => (
              <option key={p} value={p}>
                부 {p}
              </option>
            ))}
          </Select>
          <Select value={gTeam} onChange={(e) => setGTeam(e.target.value as TeamColor)} aria-label="용병 팀">
            <option value="WHITE">화이트</option>
            <option value="BLACK">블랙</option>
          </Select>
          <Button onClick={addGuest}>추가</Button>
        </div>
      </div>

      {/* 참가자 팀 토글 */}
      {rows.length === 0 ? (
        <p className="py-3 text-sm text-fg-muted">
          위 출석에서 <b className="text-fg-2">참석/지각</b>을 체크하면 참가자가 여기에 나타납니다. 용병은 바로 위에서 추가할 수 있습니다.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {rows.map((r) => {
            const t = teamOf(r);
            return (
              <li
                key={r.id}
                className="flex items-center gap-2 rounded-lg border border-line-soft bg-surface-2 px-3 py-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="truncate text-sm font-semibold text-fg">{r.name}</span>
                  {r.sub && <span className="ml-1.5 text-[11px] text-fg-muted">{r.isGuest ? r.sub : ""}</span>}
                  {r.isGuest && (
                    <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                      용병
                    </span>
                  )}
                </span>
                <div className="flex overflow-hidden rounded-lg border border-line" role="group" aria-label={`${r.name} 팀`}>
                  {TEAMS.map((tm) => {
                    const on = t === tm.key;
                    return (
                      <button
                        key={tm.key}
                        type="button"
                        onClick={() => setTeam(r.id, on ? undefined : tm.key)}
                        aria-pressed={on}
                        className={`min-h-8 px-3 text-xs font-bold ${on ? tm.active : tm.idle}`}
                      >
                        {tm.label}
                      </button>
                    );
                  })}
                </div>
                {r.isGuest && (
                  <button
                    type="button"
                    onClick={() => removeGuest(r.id)}
                    className="inline-grid h-7 w-7 place-items-center rounded-md text-fg-muted hover:bg-surface-3 hover:text-red-600 dark:hover:text-red-400"
                    aria-label={`용병 ${r.name} 삭제`}
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-xs text-fg-muted">
        ※ 팀 배정은 <b>이 경기에만</b> 적용되며 회원의 기본 팀은 바뀌지 않습니다. 포메이션 화면에서 화이트/블랙 버튼으로 각 팀 명단을 불러올 수 있습니다.
      </p>
    </Card>
  );
}
