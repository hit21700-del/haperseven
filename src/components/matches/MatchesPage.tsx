"use client";
import React, { useState } from "react";
import { useAppStore } from "@/lib/store/AppStore";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormRow, TextInput } from "@/components/ui/Field";
import { MatchEditor } from "./MatchEditor";
import type { Match, MatchType } from "@/types/match";
import { newMatchId } from "@/lib/repository/matchRepository";
import { exportMatchStatsToExcel } from "@/lib/excel/excelExporter";
import { todayISO } from "@/lib/utils/format";

export function MatchesPage() {
  const { matches, members, upsertMatch, removeMatch } = useAppStore();
  const [selectedId, setSelectedId] = useState<string | null>(matches[0]?.id ?? null);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState({ date: todayISO(), title: "", location: "", kind: "MATCH" as MatchType });

  const selected = matches.find((m) => m.id === selectedId) ?? null;

  const handleCreate = () => {
    const scrimmage = draft.kind === "SCRIMMAGE";
    // 자체전이면 화이트/블랙 팀에 배정된 활동 회원 전원을 참석으로 자동 추가
    const attendance = scrimmage
      ? members
          .filter((m) => m.isActive && (m.team === "WHITE" || m.team === "BLACK"))
          .map((m) => ({ memberId: m.id, status: "ATTEND" as const }))
      : [];
    const m: Match = {
      id: newMatchId(),
      date: draft.date,
      title: draft.title || (scrimmage ? "자체전 (화이트 vs 블랙)" : undefined),
      location: draft.location || undefined,
      matchType: draft.kind,
      quarterCount: 4,
      attendance,
      stats: [],
    };
    upsertMatch(m);
    setSelectedId(m.id);
    setCreateOpen(false);
    setDraft({ date: todayISO(), title: "", location: "", kind: "MATCH" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black tracking-tight text-white">경기 관리</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => exportMatchStatsToExcel(matches, members)}>
            ⬆ 스탯 엑셀 내보내기
          </Button>
          <Button onClick={() => setCreateOpen(true)}>＋ 경기 생성</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 경기 목록 */}
        <Card className="lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-300">🏆</span>
              <h2 className="text-base font-bold text-white">경기 목록</h2>
            </div>
            <Badge tone="gray">총 {matches.length}개</Badge>
          </div>
          <ul className="space-y-2">
            {matches.map((m) => {
              const active = selectedId === m.id;
              const attend = m.attendance.filter((a) => a.status === "ATTEND" || a.status === "LATE").length;
              return (
                <li key={m.id}>
                  <button
                    onClick={() => setSelectedId(m.id)}
                    className={`flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left transition ${
                      active ? "border-blue-400/40 bg-blue-500/10" : "border-white/10 hover:bg-white/5"
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-blue-300">
                      ⚽
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-semibold text-white">{m.title ?? "경기"}</span>
                        {m.matchType === "SCRIMMAGE" && <Badge tone="purple">자체전</Badge>}
                        {active && <Badge tone="blue">선택됨</Badge>}
                      </span>
                      <span className="block text-xs text-slate-500">
                        📅 {m.date} · 참석 {attend}명
                      </span>
                    </span>
                    <span
                      className="shrink-0 text-xs text-rose-400 hover:text-rose-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("경기를 삭제할까요?")) {
                          removeMatch(m.id);
                          if (active) setSelectedId(null);
                        }
                      }}
                    >
                      삭제
                    </span>
                  </button>
                </li>
              );
            })}
            {matches.length === 0 && <p className="py-4 text-center text-sm text-slate-500">경기가 없습니다.</p>}
          </ul>
          <button
            onClick={() => setCreateOpen(true)}
            className="mt-3 w-full rounded-md border border-dashed border-slate-400/40 py-2.5 text-sm font-medium text-slate-300 hover:border-blue-400 hover:text-blue-300"
          >
            ＋ 경기 추가
          </button>
        </Card>

        {/* 선택된 경기 편집 */}
        <div className="lg:col-span-2">
          {selected ? (
            <MatchEditor match={selected} members={members} onChange={upsertMatch} />
          ) : (
            <Card>
              <p className="text-sm text-slate-500">왼쪽에서 경기를 선택하거나 새 경기를 생성하세요.</p>
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="경기 생성"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              취소
            </Button>
            <Button onClick={handleCreate}>생성</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormRow label="경기 유형">
              <div className="flex gap-2">
                {(
                  [
                    ["MATCH", "🆚 매칭 (외부전)"],
                    ["SCRIMMAGE", "⚔ 자체전 (화이트 vs 블랙)"],
                  ] as [MatchType, string][]
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setDraft({ ...draft, kind: k })}
                    className={`flex-1 rounded-sm border px-3 py-2 text-sm ${
                      draft.kind === k
                        ? "border-blue-400 bg-blue-500/10 font-semibold text-blue-300"
                        : "border-slate-400/40 text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </FormRow>
          </div>
          {draft.kind === "SCRIMMAGE" && (
            <div className="rounded-sm border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-300 sm:col-span-2">
              화이트/블랙 팀에 배정된 활동 회원 전원이 <b>참석</b>으로 자동 추가됩니다. 포메이션 화면에서 팀별로 편성하세요.
            </div>
          )}
          <FormRow label="날짜">
            <TextInput type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          </FormRow>
          <FormRow label="경기명">
            <TextInput
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="정기전 vs ..."
            />
          </FormRow>
          <div className="sm:col-span-2">
            <FormRow label="장소">
              <TextInput value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
            </FormRow>
          </div>
        </div>
      </Modal>
    </div>
  );
}
