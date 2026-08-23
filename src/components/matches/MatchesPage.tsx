"use client";
import React, { useState } from "react";
import { Download, Plus, Swords, Users, Trophy, MapPin, CalendarDays } from "lucide-react";
import { useAppStore } from "@/lib/store/AppStore";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
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
  W: { label: "승", cls: "bg-emerald-50 text-emerald-700" },
  D: { label: "무", cls: "bg-gray-100 text-gray-700" },
  L: { label: "패", cls: "bg-red-50 text-red-700" },
};

const KIND_OPTIONS: { value: MatchType; label: string; icon: React.ReactNode }[] = [
  { value: "MATCH", label: "매칭 (외부전)", icon: <Swords size={16} aria-hidden="true" /> },
  { value: "SCRIMMAGE", label: "자체전 (화이트 vs 블랙)", icon: <Users size={16} aria-hidden="true" /> },
];

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
              <Download size={16} aria-hidden="true" />
              스탯 엑셀 내보내기
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} aria-hidden="true" />
              경기 등록
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 경기 목록 */}
        <Card className="lg:col-span-1">
          <SectionTitle icon={<Trophy size={15} aria-hidden="true" />} action={<Badge tone="gray">총 {matches.length}개</Badge>}>
            경기 목록
          </SectionTitle>
          {matches.length === 0 ? (
            <EmptyState
              compact
              icon={<CalendarDays size={18} aria-hidden="true" />}
              title="아직 등록된 경기가 없습니다"
              description="경기를 등록하면 출석·라인업·결과를 관리할 수 있습니다."
              action={
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus size={16} aria-hidden="true" />
                  경기 등록
                </Button>
              }
            />
          ) : (
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
                      type="button"
                      onClick={() => setSelectedId(m.id)}
                      aria-current={active ? "true" : undefined}
                      className={`w-full rounded-xl border px-3.5 py-3 pr-14 text-left transition ${
                        active ? "border-brand-500 bg-brand-50" : "border-line hover:bg-gray-50"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-gray-900">{m.date.slice(5).replace("-", ".")}</span>
                        {m.time && <span className="text-xs text-gray-500">{m.time}</span>}
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
                            <span className="text-base font-bold tabular-nums text-gray-900">
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
                      <span className="mt-1 flex flex-wrap items-center gap-x-1 text-xs text-gray-500">
                        {m.location && (
                          <>
                            <MapPin size={12} aria-hidden="true" />
                            <span>{m.location}</span>
                            <span aria-hidden="true">·</span>
                          </>
                        )}
                        <span>
                          참석 {attend}명 · 불참 {absent}명 · 미체크 {unchecked}명
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(m)}
                      className="absolute right-2 top-2 inline-flex min-h-8 items-center rounded px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                      aria-label={`${name} 삭제`}
                    >
                      삭제
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {matches.length > 0 && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2.5 text-sm font-medium text-gray-500 hover:border-brand-400 hover:text-brand-600"
            >
              <Plus size={16} aria-hidden="true" />
              경기 등록
            </button>
          )}
        </Card>

        {/* 선택된 경기 편집 */}
        <div className="lg:col-span-2">
          {selected ? (
            <MatchEditor match={selected} members={members} onChange={upsertMatch} />
          ) : (
            <Card>
              <p className="text-sm text-gray-500">경기를 선택하거나 등록하세요.</p>
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="경기 등록"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              취소
            </Button>
            <Button onClick={handleCreate}>경기 등록</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormRow label="경기 유형">
              <div className="flex gap-2">
                {KIND_OPTIONS.map((opt) => {
                  const selectedKind = draft.kind === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDraft({ ...draft, kind: opt.value })}
                      aria-pressed={selectedKind}
                      className={`inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm ${
                        selectedKind
                          ? "border-brand-500 bg-brand-50 font-semibold text-brand-600"
                          : "border-line text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  );
                })}
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
