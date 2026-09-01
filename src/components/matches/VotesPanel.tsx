"use client";
import React, { useCallback, useEffect, useState } from "react";
import { Share2, Users, ExternalLink, Link2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useAppStore } from "@/lib/store/AppStore";
import { useToast } from "@/components/ui/Toast";
import { fetchMatchVotes, subscribeVotes, type MatchVote } from "@/lib/repository/cloudRepository";
import { newVoteToken, shareVoteLink, voteUrl } from "@/lib/utils/vote";
import type { Match } from "@/types/match";
import type { Member } from "@/types/member";

const STATUS_LABEL: Record<string, string> = { ATTEND: "참석", LATE: "지각", ABSENT: "불참", INJURED: "부상" };

/**
 * 참석 투표 패널 (cloud 모드 전용)
 * - 투표 링크 만들기/공유 (운영자), 투표 페이지 열기
 * - 현재 투표 현황(회원 + 용병) 실시간 표시
 * - 운영자: "출석에 반영" (회원 투표 → attendance)
 */
export function VotesPanel({
  match,
  members,
  onApply,
  compact = false,
}: {
  match: Match;
  members: Member[];
  onApply?: (attendance: Match["attendance"]) => void;
  compact?: boolean;
}) {
  const { mode, canWrite } = useAuth();
  const { upsertMatch } = useAppStore();
  const toast = useToast();
  const [votes, setVotes] = useState<MatchVote[]>([]);

  const load = useCallback(async () => {
    try {
      setVotes(await fetchMatchVotes(match.id));
    } catch {
      /* 무시 */
    }
  }, [match.id]);

  useEffect(() => {
    if (mode !== "cloud") return;
    void load();
    return subscribeVotes(match.id, () => void load());
  }, [mode, match.id, load]);

  if (mode !== "cloud") return null;

  const url = voteUrl(match);
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? id;
  const memberVotes = votes.filter((v) => v.member_id);
  const guestVotes = votes.filter((v) => !v.member_id && v.guest_name);
  const count = (s: string) => memberVotes.filter((v) => v.status === s).length;

  /** 링크가 없으면 토큰을 만들어 저장한 뒤 공유 */
  const share = async () => {
    let target = match;
    if (!target.voteToken) {
      if (!canWrite) return toast("운영자가 투표 링크를 만든 뒤 공유할 수 있습니다.", "error");
      target = { ...match, voteToken: newVoteToken() };
      upsertMatch(target);
    }
    const u = voteUrl(target)!;
    const r = await shareVoteLink(target, u);
    if (r === "copied") toast("투표 링크를 복사했습니다. 카톡에 붙여넣어 공유하세요.");
    else if (r === "failed") toast("공유하지 못했습니다. 링크를 직접 복사하세요.", "error");
  };

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast("투표 링크를 복사했습니다.");
    } catch {
      toast("복사하지 못했습니다.", "error");
    }
  };

  const apply = () => {
    if (!onApply) return;
    const byMember = new Map(match.attendance.map((a) => [a.memberId, a]));
    for (const v of memberVotes) {
      byMember.set(v.member_id!, { ...byMember.get(v.member_id!), memberId: v.member_id!, status: v.status, memo: v.memo ?? undefined });
    }
    onApply([...byMember.values()]);
    toast(`회원 투표 ${memberVotes.length}건을 출석에 반영했습니다.${guestVotes.length ? ` 용병 ${guestVotes.length}명은 포메이션에서 불러오세요.` : ""}`);
  };

  return (
    <div className={`rounded-xl border border-line bg-surface-2 ${compact ? "p-3" : "p-4"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-fg">
          <Users size={15} aria-hidden="true" />
          참석 투표
          <span className="text-fg-muted">
            {memberVotes.length}명{guestVotes.length > 0 && ` + 용병 ${guestVotes.length}`}
          </span>
        </span>
        <span className="text-xs text-fg-muted">
          참석 {count("ATTEND")} · 지각 {count("LATE")} · 불참 {count("ABSENT")}
        </span>
      </div>

      {/* 링크 공유 */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(canWrite || url) && (
          <button
            type="button"
            onClick={share}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-sm font-semibold text-brand-fg hover:bg-brand-hover"
          >
            <Share2 size={14} aria-hidden="true" />
            {url ? "투표 링크 공유" : "투표 링크 만들어 공유"}
          </button>
        )}
        {url && (
          <>
            <button
              type="button"
              onClick={copy}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-fg-2 hover:bg-surface-3"
            >
              <Link2 size={14} aria-hidden="true" /> 링크 복사
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-fg-2 hover:bg-surface-3"
            >
              <ExternalLink size={14} aria-hidden="true" /> 투표 페이지
            </a>
          </>
        )}
      </div>
      {!url && (
        <p className="mt-2 text-xs text-fg-muted">
          링크를 만들면 로그인 없이 누구나 이름을 고르고 참석/불참을 누를 수 있습니다. 용병도 직접 등록됩니다.
        </p>
      )}

      {/* 투표자 목록 */}
      {votes.length > 0 && !compact && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {memberVotes.map((v) => (
            <li key={v.voter_key} className="rounded-full bg-surface px-2 py-0.5 text-xs text-fg-2">
              {nameOf(v.member_id!)} · {STATUS_LABEL[v.status]}
            </li>
          ))}
          {guestVotes.map((v) => (
            <li key={v.voter_key} className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              용병 {v.guest_name} · {v.guest_positions ?? "-"}
            </li>
          ))}
        </ul>
      )}
      {compact && votes.length > 0 && (
        <p className="mt-2 truncate text-xs text-fg-muted">
          {memberVotes.filter((v) => v.status === "ATTEND").map((v) => nameOf(v.member_id!)).join(", ")}
          {guestVotes.length > 0 && ` + 용병 ${guestVotes.map((v) => v.guest_name).join(", ")}`}
        </p>
      )}

      {canWrite && onApply && memberVotes.length > 0 && (
        <button
          type="button"
          onClick={apply}
          className="mt-3 inline-flex min-h-9 items-center rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-fg-2 hover:bg-surface-3"
        >
          회원 투표 {memberVotes.length}건 출석에 반영
        </button>
      )}
    </div>
  );
}
