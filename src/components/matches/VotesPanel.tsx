"use client";
import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, XCircle, Clock, Users } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { fetchVotes, upsertVote, removeVote, type AttendanceVote } from "@/lib/repository/cloudRepository";
import type { Match, AttendanceStatus } from "@/types/match";
import type { Member } from "@/types/member";

/**
 * 참석 투표 패널 (cloud 모드 전용)
 * - 회원(연결된 계정): 자기 참석/불참/지각 투표
 * - 운영자: 투표 현황 + "출석에 반영" 버튼
 */
export function VotesPanel({
  match,
  members,
  onApply,
  compact = false,
}: {
  match: Match;
  members: Member[];
  /** 운영자가 투표를 출석에 반영할 때 (없으면 반영 버튼 숨김) */
  onApply?: (attendance: Match["attendance"]) => void;
  compact?: boolean;
}) {
  const { mode, profile, canWrite, session } = useAuth();
  const toast = useToast();
  const [votes, setVotes] = useState<AttendanceVote[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setVotes(await fetchVotes(match.id));
    } catch {
      /* 무시 */
    }
  }, [match.id]);

  useEffect(() => {
    if (mode !== "cloud") return;
    void load();
  }, [mode, load]);

  if (mode !== "cloud") return null;

  const myMemberId = profile?.member_id ?? null;
  const mine = myMemberId ? votes.find((v) => v.member_id === myMemberId) : undefined;
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? id;
  const count = (s: AttendanceStatus) => votes.filter((v) => v.status === s).length;

  const vote = async (status: AttendanceStatus | null) => {
    if (!myMemberId || !session) return;
    setBusy(true);
    try {
      if (status === null) await removeVote(match.id, myMemberId);
      else await upsertVote({ match_id: match.id, member_id: myMemberId, user_id: session.user.id, status });
      await load();
      toast(status === null ? "투표를 취소했습니다." : "참석 투표를 저장했습니다.");
    } catch {
      toast("투표를 저장하지 못했습니다.", "error");
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (!onApply) return;
    const byMember = new Map(match.attendance.map((a) => [a.memberId, a]));
    for (const v of votes) byMember.set(v.member_id, { ...byMember.get(v.member_id), memberId: v.member_id, status: v.status });
    onApply([...byMember.values()]);
    toast(`투표 ${votes.length}건을 출석에 반영했습니다.`);
  };

  const options: { s: AttendanceStatus; label: string; icon: React.ReactNode; cls: string }[] = [
    { s: "ATTEND", label: "참석", icon: <CheckCircle2 size={15} />, cls: "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
    { s: "LATE", label: "지각", icon: <Clock size={15} />, cls: "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
    { s: "ABSENT", label: "불참", icon: <XCircle size={15} />, cls: "border-line bg-surface-3 text-fg-2" },
  ];

  return (
    <div className={`rounded-xl border border-line bg-surface-2 ${compact ? "p-3" : "p-4"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-fg">
          <Users size={15} aria-hidden="true" />
          참석 투표 <span className="text-fg-muted">{votes.length}건</span>
        </span>
        <span className="text-xs text-fg-muted">
          참석 {count("ATTEND")} · 지각 {count("LATE")} · 불참 {count("ABSENT")}
        </span>
      </div>

      {/* 내 투표 */}
      {myMemberId ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="내 참석 투표">
          {options.map((o) => (
            <button
              key={o.s}
              type="button"
              disabled={busy}
              aria-pressed={mine?.status === o.s}
              onClick={() => vote(mine?.status === o.s ? null : o.s)}
              className={`inline-flex min-h-9 items-center gap-1 rounded-lg border px-3 text-sm font-semibold transition-colors duration-100 ${
                mine?.status === o.s ? o.cls : "border-line bg-surface text-fg-2 hover:bg-surface-3"
              }`}
            >
              {o.icon}
              {o.label}
            </button>
          ))}
          {mine && <span className="text-xs text-fg-muted">· 다시 누르면 취소</span>}
        </div>
      ) : (
        <p className="mt-2 text-xs text-fg-muted">
          {canWrite ? "회원 계정으로 로그인하면 여기서 투표할 수 있습니다." : "내 계정이 아직 회원과 연결되지 않았습니다. 운영자에게 요청하세요."}
        </p>
      )}

      {/* 투표자 목록 + 운영자 반영 */}
      {votes.length > 0 && !compact && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {votes.map((v) => (
            <li key={v.member_id} className="rounded-full bg-surface px-2 py-0.5 text-xs text-fg-2">
              {nameOf(v.member_id)} · {v.status === "ATTEND" ? "참석" : v.status === "LATE" ? "지각" : v.status === "INJURED" ? "부상" : "불참"}
            </li>
          ))}
        </ul>
      )}
      {canWrite && onApply && votes.length > 0 && (
        <button
          type="button"
          onClick={apply}
          className="mt-3 inline-flex min-h-9 items-center rounded-lg bg-brand px-3 text-sm font-semibold text-brand-fg hover:bg-brand-hover"
        >
          투표 {votes.length}건 출석에 반영
        </button>
      )}
    </div>
  );
}
