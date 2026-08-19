"use client";
import React, { useState } from "react";
import { useAppStore } from "@/lib/store/AppStore";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormRow, TextInput } from "@/components/ui/Field";
import { MatchEditor } from "./MatchEditor";
import { PageHeader } from "@/components/ui/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Match, MatchType } from "@/types/match";
import { newMatchId } from "@/lib/repository/matchRepository";
import { matchResult } from "@/lib/stats/statsService";
import { todayISO } from "@/lib/utils/format";

const EMPTY_DRAFT = { date: todayISO(), title: "", opponent: "", time: "", location: "", kind: "MATCH" as MatchType };

const RESULT_BADGE: Record<"W" | "D" | "L", { label: string; cls: string }> = {
  W: { label: "승", cls: "bg-emerald-50 text-emerald-600" },
  D: { label: "무", cls: "bg-gray-100 text-gray-500" },
  L: { label: "패", cls: "bg-red-50 text-red-500" },
};

export function MatchesPage() {
  const { matches, members, upsertMatch, removeMatch } = useAppStore();
  const [selectedId, setSelectedId] = useState<string | null>(matches[0]?.id ?? null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Match | null>(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);

  const selected = matches.find((m) => m.id === selectedId) ?? null;
  const activeCount = members.filter((m) => m.isActive).length;

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
      time: draft.time || undefined,
      title: draft.title || (scrimmage ? "자체전 (화이트 vs 블랙)" : undefined),
      opponent: scrimmage ? undefined : draft.opponent || undefined,
      location: draft.location || undefined,
      matchType: draft.kind,
      quarterCount: 4,
      attendance,
      stats: [],
    };
    upsertMatch(m);
    setSelectedId(m.id);
    setCreateOpen(false);
    setDraft(EMPTY_DRAFT);
  };

  const handleExportStats = async () => {
    const { exportMatchStatsToExcel } = await import("@/lib/excel/excelExporter");
    exportMatchStatsToExcel(matches, members);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="경기 관리"
        description="일정 등록부터 출석·라인업·결과 입력까지 한 곳에서 관리합니다."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleExportStats}>
              ⬆ 스탯 엑셀 내보내기
            </Button>
            <Button onClick={() => setCreateOpen(true)}>＋ 경기 생성</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 경기 목록 */}
        <Card className="lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">🏆</span>
              <h2 className="text-base font-bold text-gray-900">경기 목록</h2>
            </div>
            <Badge tone="gray">총 {matches.length}개</Badge>
          </div>
          <ul className="space-y-2">
            {matches.map((m) => {
              const active = selectedId === m.id;
              const attend = m.attendance.filter((a) => a.status === "ATTEND" || a.status === "LATE").length;
              const absent = m.attendance.filter((a) => a.status === "ABSENT" || a.status === "INJURED").length;
              const unchecked = Math.max(0, activeCount - m.attendance.length);
              const result = (m.matchType ?? "MATCH") === "MATCH" ? matchResult(m) : null;
              const scrim = m.matchType === "SCRIMMAGE";
              const name = scrim ? m.title ?? "자체전" : m.opponent ? `vs ${m.opponent}` : m.title ?? "경기";
              const upcoming = !m.score && m.status !== "CANCELED" && m.date >= todayISO();
              return (
                <li key={m.id} className="relative">
                  <button
                    onClick={() => setSelectedId(m.id)}
                    className={`w-full rounded-xl border px-3.5 py-3 pr-12 text-left transition ${
                      active ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-gray-900">{m.date.slice(5).replace("-", ".")}</span>
                      {m.time && <span className="text-xs text-gray-400">{m.time}</span>}
                      {scrim && <Badge tone="purple">자체전</Badge>}
                      {m.status === "CANCELED" ? (
                        <Badge tone="gray">취소</Badge>
                      ) : upcoming ? (
                        <Badge tone="blue">예정</Badge>
                      ) : null}
                    </span>
                    <span className="mt-1 flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate font-semibold text-gray-800">{name}</span>
                      {m.score && (
                        <span className="flex shrink-0 items-center gap-1.5">
                          <span className="text-base font-bold text-gray-900">
                            {m.score.us} : {m.score.them}
                          </span>
                          {result && (
                            <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${RESULT_BADGE[result].cls}`}>
                              {RESULT_BADGE[result].label}
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-xs text-gray-400">
                      {m.location && <>📍 {m.location} · </>}참석 {attend} · 불참 {absent} · 미체크 {unchecked}
                    </span>
                  </button>
                  <button
                    onClick={() => setDeleteTarget(m)}
                    className="absolute right-2.5 top-2.5 rounded px-1.5 py-0.5 text-xs text-red-400 hover:bg-red-50 hover:text-red-600"
                    aria-label={`${name} 삭제`}
                  >
                    삭제
                  </button>
                </li>
              );
            })}
            {matches.length === 0 && <p className="py-4 text-center text-sm text-gray-400">경기가 없습니다.</p>}
          </ul>
          <button
            onClick={() => setCreateOpen(true)}
            className="mt-3 w-full rounded-lg border border-dashed border-gray-300 py-2.5 text-sm font-medium text-gray-500 hover:border-brand-400 hover:text-brand-600"
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
              <p className="text-sm text-gray-400">왼쪽에서 경기를 선택하거나 새 경기를 생성하세요.</p>
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
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                      draft.kind === k
                        ? "border-brand-500 bg-brand-50 font-semibold text-brand-600"
                        : "border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </FormRow>
          </div>
          {draft.kind === "SCRIMMAGE" && (
            <div className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-600 sm:col-span-2">
              화이트/블랙 팀에 배정된 활동 회원 전원이 <b>참석</b>으로 자동 추가됩니다. 포메이션 화면에서 팀별로 편성하세요.
            </div>
          )}
          <FormRow label="날짜">
            <TextInput type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          </FormRow>
          <FormRow label="시간">
            <TextInput type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} />
          </FormRow>
          {draft.kind === "MATCH" ? (
            <FormRow label="상대팀">
              <TextInput
                value={draft.opponent}
                onChange={(e) => setDraft({ ...draft, opponent: e.target.value })}
                placeholder="FC 상대팀"
              />
            </FormRow>
          ) : (
            <FormRow label="경기명">
              <TextInput
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="자체전 (화이트 vs 블랙)"
              />
            </FormRow>
          )}
          <FormRow label="장소">
            <TextInput
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              placeholder="의왕축구장"
            />
          </FormRow>
        </div>
      </Modal>

      {/* 경기 삭제 확인 */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="경기 삭제"
        message={
          deleteTarget && (
            <>
              <b>
                {deleteTarget.date} {deleteTarget.opponent ? `vs ${deleteTarget.opponent}` : deleteTarget.title ?? "경기"}
              </b>
              를 삭제할까요? 출석·스탯·라인업 기록이 함께 삭제됩니다.
            </>
          )
        }
        onConfirm={() => {
          if (deleteTarget) {
            removeMatch(deleteTarget.id);
            if (selectedId === deleteTarget.id) setSelectedId(null);
          }
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
