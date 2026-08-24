"use client";
import React from "react";
import { Medal, CalendarDays, ClipboardCheck } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Table, THead, TH, TD, TR } from "@/components/ui/Table";
import { MemberTypeBadge, Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/Button";
import { TextInput, Select, FormRow } from "@/components/ui/Field";
import { useRouter } from "next/navigation";
import type { Match, AttendanceStatus, AttendanceRecord, MatchStat, MatchStatus } from "@/types/match";
import type { Member } from "@/types/member";

const STATUSES: AttendanceStatus[] = ["ATTEND", "LATE", "INJURED", "ABSENT"];
const STATUS_LABEL: Record<AttendanceStatus, string> = { ATTEND: "참석", LATE: "지각", INJURED: "부상", ABSENT: "불참" };

/** 모바일 출석 칩 순환 순서: 미체크 → 참석 → 지각 → 불참 → 부상 → 미체크 */
const CYCLE: (AttendanceStatus | null)[] = [null, "ATTEND", "LATE", "ABSENT", "INJURED"];
const CHIP_CLASS: Record<string, string> = {
  ATTEND: "border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  LATE: "border-amber-300 dark:border-amber-500/40 bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  ABSENT: "border-line bg-surface-3 text-fg-muted",
  INJURED: "border-red-300 dark:border-red-500/40 bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300",
  NONE: "border-line bg-surface text-fg-muted",
};

const MATCH_STATUS_OPTIONS: { value: MatchStatus | ""; label: string }[] = [
  { value: "", label: "자동 (스코어 입력 시 완료)" },
  { value: "SCHEDULED", label: "예정" },
  { value: "DONE", label: "완료" },
  { value: "CANCELED", label: "취소" },
];

/** MOM 토글 버튼 — 선택 시 색·채움으로 구분 (opacity 만으로 구분하지 않음) */
function MomButton({ name, selected, onToggle, title }: { name: string; selected: boolean; onToggle: () => void; title?: string }) {
  return (
    <IconButton
      onClick={onToggle}
      aria-pressed={selected}
      aria-label={`${name} MOM ${selected ? "해제" : "지정"}`}
      title={title}
    >
      <Medal size={20} className={selected ? "text-amber-600 fill-amber-200 dark:text-amber-400 dark:fill-amber-500/30" : "text-fg-muted"} aria-hidden="true" />
    </IconButton>
  );
}

/** 경기 정보/출석/스탯 편집기 */
export function MatchEditor({
  match,
  members,
  onChange,
}: {
  match: Match;
  members: Member[];
  onChange: (m: Match) => void;
}) {
  const router = useRouter();
  const attOf = (id: string): AttendanceRecord | undefined => match.attendance.find((a) => a.memberId === id);
  const statOf = (id: string): MatchStat | undefined => match.stats.find((s) => s.memberId === id);
  const isScrimmage = match.matchType === "SCRIMMAGE";

  const setField = (patch: Partial<Match>) => onChange({ ...match, ...patch });

  const setScore = (side: "us" | "them", value: string) => {
    // 한쪽을 비우면 결과 자체를 지움 (예정 경기로 되돌리기)
    if (value === "") {
      setField({ score: undefined });
      return;
    }
    const n = Math.max(0, Number(value) || 0);
    const base = match.score ?? { us: 0, them: 0 };
    setField({ score: { ...base, [side]: n } });
  };

  const setAttendance = (memberId: string, status: AttendanceStatus | null) => {
    if (status === null) {
      setField({ attendance: match.attendance.filter((a) => a.memberId !== memberId) });
      return;
    }
    const exists = attOf(memberId);
    const attendance = exists
      ? match.attendance.map((a) => (a.memberId === memberId ? { ...a, status } : a))
      : [...match.attendance, { memberId, status }];
    setField({ attendance });
  };

  const cycleAttendance = (memberId: string) => {
    const cur = attOf(memberId)?.status ?? null;
    const next = CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length];
    setAttendance(memberId, next);
  };

  const setStat = (memberId: string, patch: Partial<MatchStat>) => {
    const exists = statOf(memberId);
    const stats = exists
      ? match.stats.map((s) => (s.memberId === memberId ? { ...s, ...patch } : s))
      : [...match.stats, { memberId, goals: 0, assists: 0, ...patch }];
    setField({ stats });
  };

  /** MOM은 경기당 1명 — 지정 시 다른 선수의 MOM 해제 */
  const toggleMom = (memberId: string) => {
    const cur = statOf(memberId)?.mom ?? false;
    const cleared = match.stats.map((s) => ({ ...s, mom: false }));
    const exists = cleared.some((s) => s.memberId === memberId);
    const stats = cur
      ? cleared
      : exists
        ? cleared.map((s) => (s.memberId === memberId ? { ...s, mom: true } : s))
        : [...cleared, { memberId, goals: 0, assists: 0, mom: true }];
    setField({ stats });
  };

  const setMemo = (memberId: string, memo: string) => {
    const exists = attOf(memberId);
    const attendance = exists
      ? match.attendance.map((a) => (a.memberId === memberId ? { ...a, memo } : a))
      : [...match.attendance, { memberId, status: "ATTEND" as AttendanceStatus, memo }];
    setField({ attendance });
  };

  const activeMembers = members.filter((m) => m.isActive);
  const attendCount = match.attendance.filter((a) => a.status === "ATTEND" || a.status === "LATE").length;
  const lineupCount = match.formationPlan?.quarters[0]?.players.length ?? 0;

  return (
    <div className="space-y-4">
      {/* 경기 정보 + 결과 */}
      <Card>
        <SectionTitle
          icon={<CalendarDays size={15} aria-hidden="true" />}
          action={
            <button
              type="button"
              onClick={() => router.push(`/formation?match=${match.id}`)}
              className="inline-flex min-h-8 items-center rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-fg-2 hover:bg-surface-2"
            >
              {match.formationPlan ? `라인업 보기/수정 (${lineupCount}명)` : "라인업 작성"}
            </button>
          }
        >
          경기 정보
        </SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <FormRow label="날짜">
            <TextInput type="date" value={match.date} onChange={(e) => setField({ date: e.target.value })} />
          </FormRow>
          <FormRow label="시간">
            <TextInput type="time" value={match.time ?? ""} onChange={(e) => setField({ time: e.target.value || undefined })} />
          </FormRow>
          <FormRow label={isScrimmage ? "경기명" : "상대팀"}>
            {isScrimmage ? (
              <TextInput value={match.title ?? ""} onChange={(e) => setField({ title: e.target.value || undefined })} />
            ) : (
              <TextInput
                value={match.opponent ?? ""}
                onChange={(e) => setField({ opponent: e.target.value || undefined })}
                placeholder="FC 상대팀"
              />
            )}
          </FormRow>
          <FormRow label="장소">
            <TextInput
              value={match.location ?? ""}
              onChange={(e) => setField({ location: e.target.value || undefined })}
              placeholder="의왕축구장"
            />
          </FormRow>
        </div>

        <div className="mt-4 grid grid-cols-1 items-end gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-medium text-fg-2">
              경기 결과 {isScrimmage ? "(화이트 : 블랙)" : "(하퍼세븐 : 상대)"}
            </div>
            <div className="flex items-center gap-2">
              <TextInput
                type="number"
                min={0}
                className="w-20 text-center text-lg font-bold tabular-nums"
                value={match.score?.us ?? ""}
                onChange={(e) => setScore("us", e.target.value)}
                placeholder="-"
                aria-label={isScrimmage ? "화이트 득점" : "하퍼세븐 득점"}
              />
              <span className="text-lg font-bold text-fg-muted" aria-hidden="true">
                :
              </span>
              <TextInput
                type="number"
                min={0}
                className="w-20 text-center text-lg font-bold tabular-nums"
                value={match.score?.them ?? ""}
                onChange={(e) => setScore("them", e.target.value)}
                placeholder="-"
                aria-label={isScrimmage ? "블랙 득점" : "상대 득점"}
              />
              {!isScrimmage && match.score && (
                <Badge
                  tone={match.score.us > match.score.them ? "green" : match.score.us < match.score.them ? "red" : "gray"}
                >
                  {match.score.us > match.score.them ? "승리" : match.score.us < match.score.them ? "패배" : "무승부"}
                </Badge>
              )}
            </div>
          </div>
          <FormRow label="상태">
            <Select
              value={match.status ?? ""}
              onChange={(e) => setField({ status: (e.target.value || undefined) as MatchStatus | undefined })}
            >
              {MATCH_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </FormRow>
        </div>
      </Card>

      {/* 출석 · 스탯 */}
      <Card>
        <SectionTitle icon={<ClipboardCheck size={15} aria-hidden="true" />}>
          출석 · 스탯 입력 <span className="ml-2 text-sm font-normal text-fg-muted">(참석 {attendCount}명)</span>
        </SectionTitle>

        {/* 모바일: 이름 칩 토글 (탭할 때마다 미체크→참석→지각→불참→부상 순환) */}
        <div className="md:hidden">
          <p className="mb-2 text-xs text-fg-muted">
            이름을 탭하면 <b className="text-emerald-700 dark:text-emerald-400">참석</b> → <b className="text-amber-700 dark:text-amber-400">지각</b> →{" "}
            <b className="text-fg-2">불참</b> → <b className="text-red-600 dark:text-red-400">부상</b> 순으로 바뀝니다.
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {activeMembers.map((m) => {
              const st = attOf(m.id)?.status ?? null;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => cycleAttendance(m.id)}
                  aria-label={`${m.name} 출석 상태: ${st ? STATUS_LABEL[st] : "미체크"}. 탭하여 변경`}
                  className={`min-h-10 rounded-lg border px-2 py-2 text-center text-sm font-semibold ${CHIP_CLASS[st ?? "NONE"]}`}
                >
                  {m.name}
                  <span className="block text-[10px] font-medium">{st ? STATUS_LABEL[st] : "미체크"}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 space-y-2">
            <div className="text-xs font-medium text-fg-2">골 / 도움 / MOM (참석자)</div>
            {activeMembers
              .filter((m) => {
                const st = attOf(m.id)?.status;
                return st === "ATTEND" || st === "LATE";
              })
              .map((m) => {
                const stat = statOf(m.id);
                return (
                  <div key={m.id} className="flex items-center gap-2 rounded-lg border border-line-soft bg-surface-2 px-2.5 py-1.5">
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{m.name}</span>
                    <label className="flex items-center gap-1">
                      <span className="text-xs text-fg-muted">골</span>
                      <TextInput
                        type="number"
                        min={0}
                        className="w-14 !px-1.5 !py-1 text-center tabular-nums"
                        value={stat?.goals ?? 0}
                        onChange={(e) => setStat(m.id, { goals: Number(e.target.value) })}
                        aria-label={`${m.name} 골`}
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      <span className="text-xs text-fg-muted">도움</span>
                      <TextInput
                        type="number"
                        min={0}
                        className="w-14 !px-1.5 !py-1 text-center tabular-nums"
                        value={stat?.assists ?? 0}
                        onChange={(e) => setStat(m.id, { assists: Number(e.target.value) })}
                        aria-label={`${m.name} 도움`}
                      />
                    </label>
                    <MomButton name={m.name} selected={!!stat?.mom} onToggle={() => toggleMom(m.id)} title="MOM (경기당 1명)" />
                  </div>
                );
              })}
          </div>
        </div>

        {/* 데스크톱: 테이블 */}
        <div className="hidden md:block">
          <Table>
            <THead>
              <TR>
                <TH>이름</TH>
                <TH>구분</TH>
                <TH>출석</TH>
                <TH>득점</TH>
                <TH>도움</TH>
                <TH>MOM</TH>
                <TH>메모</TH>
              </TR>
            </THead>
            <tbody>
              {activeMembers.map((m) => {
                const att = attOf(m.id);
                const stat = statOf(m.id);
                return (
                  <TR key={m.id}>
                    <TD className="font-medium text-fg">{m.name}</TD>
                    <TD>
                      <MemberTypeBadge type={m.memberType} />
                    </TD>
                    <TD>
                      <Select
                        value={att?.status ?? ""}
                        onChange={(e) => setAttendance(m.id, (e.target.value || null) as AttendanceStatus | null)}
                        className="w-24"
                        aria-label={`${m.name} 출석 상태`}
                      >
                        <option value="">미체크</option>
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </Select>
                    </TD>
                    <TD>
                      <TextInput
                        type="number"
                        min={0}
                        value={stat?.goals ?? 0}
                        onChange={(e) => setStat(m.id, { goals: Number(e.target.value) })}
                        className="w-16 tabular-nums"
                        aria-label={`${m.name} 득점`}
                      />
                    </TD>
                    <TD>
                      <TextInput
                        type="number"
                        min={0}
                        value={stat?.assists ?? 0}
                        onChange={(e) => setStat(m.id, { assists: Number(e.target.value) })}
                        className="w-16 tabular-nums"
                        aria-label={`${m.name} 도움`}
                      />
                    </TD>
                    <TD>
                      <MomButton name={m.name} selected={!!stat?.mom} onToggle={() => toggleMom(m.id)} title="MOM (경기당 1명)" />
                    </TD>
                    <TD>
                      <TextInput
                        value={att?.memo ?? ""}
                        onChange={(e) => setMemo(m.id, e.target.value)}
                        placeholder="메모"
                        className="w-32"
                        aria-label={`${m.name} 메모`}
                      />
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
