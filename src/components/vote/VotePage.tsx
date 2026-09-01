"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, XCircle, MapPin, RefreshCw, UserPlus, Users } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchVotePage, castVote, type VotePageData, type MatchVote } from "@/lib/repository/cloudRepository";
import { GUEST_POS_OPTIONS } from "@/lib/formation/guestMember";
import { LogoBox, Wordmark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { FormRow, TextInput, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import type { AttendanceStatus } from "@/types/match";

const VOTE_AS_KEY = "haperseven:voteAs";
const STATUS_LABEL: Record<AttendanceStatus, string> = { ATTEND: "참석", LATE: "지각", ABSENT: "불참", INJURED: "부상" };

/**
 * 공개 참석 투표 페이지 (/vote/[matchId]?t=토큰) — 로그인 없이 이름 선택 후 참석/불참
 * 용병은 이름·포지션·나이를 직접 입력해 참석 등록
 */
export function VotePage() {
  const params = useParams<{ matchId: string }>();
  const search = useSearchParams();
  const toast = useToast();
  const matchId = decodeURIComponent(params.matchId ?? "");
  const token = search.get("t") ?? "";

  const [data, setData] = useState<VotePageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [memo, setMemo] = useState("");
  const [guestOpen, setGuestOpen] = useState(false);
  const [guest, setGuest] = useState({ name: "", primary: "CM", secondary: "", age: "" });

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError("투표 기능은 클라우드 모드에서만 동작합니다.");
      setLoading(false);
      return;
    }
    if (!matchId || !token) {
      setError("링크가 올바르지 않습니다.");
      setLoading(false);
      return;
    }
    try {
      setData(await fetchVotePage(matchId, token));
      setError(null);
    } catch {
      setError("유효하지 않거나 만료된 투표 링크입니다. 운영자에게 새 링크를 요청하세요.");
    } finally {
      setLoading(false);
    }
  }, [matchId, token]);

  useEffect(() => {
    void load();
    try {
      const saved = localStorage.getItem(VOTE_AS_KEY);
      if (saved) setMemberId(saved);
    } catch {}
  }, [load]);

  const myVote = useMemo<MatchVote | undefined>(
    () => data?.votes.find((v) => v.member_id === memberId),
    [data, memberId],
  );
  const memberVotes = data?.votes.filter((v) => v.member_id) ?? [];
  const guestVotes = data?.votes.filter((v) => !v.member_id && v.guest_name) ?? [];
  const byStatus = (s: AttendanceStatus) => memberVotes.filter((v) => v.status === s);
  const nameOf = (id: string) => data?.members.find((m) => m.id === id)?.name ?? id;

  const vote = async (status: AttendanceStatus | null) => {
    if (!memberId) return toast("먼저 이름을 선택하세요.", "error");
    setBusy(true);
    try {
      await castVote({ matchId, token, voterKey: `member:${memberId}`, memberId, status, memo: memo || null });
      try {
        localStorage.setItem(VOTE_AS_KEY, memberId);
      } catch {}
      await load();
      toast(status ? `${nameOf(memberId)} · ${STATUS_LABEL[status]}으로 투표했습니다.` : "투표를 취소했습니다.");
    } catch {
      toast("저장하지 못했습니다. 잠시 후 다시 시도하세요.", "error");
    } finally {
      setBusy(false);
    }
  };

  const addGuest = async () => {
    const name = guest.name.trim();
    if (!name) return toast("용병 이름을 입력하세요.", "error");
    setBusy(true);
    try {
      const positions = [guest.primary, guest.secondary].filter(Boolean).join(",");
      await castVote({
        matchId,
        token,
        voterKey: `guest:${name}`,
        guestName: name,
        guestPositions: positions,
        guestAge: guest.age ? Number(guest.age) : null,
        status: "ATTEND",
      });
      await load();
      setGuest({ name: "", primary: "CM", secondary: "", age: "" });
      setGuestOpen(false);
      toast(`용병 ${name} 참석 등록했습니다.`);
    } catch {
      toast("등록하지 못했습니다.", "error");
    } finally {
      setBusy(false);
    }
  };

  const removeGuest = async (v: MatchVote) => {
    setBusy(true);
    try {
      await castVote({ matchId, token, voterKey: v.voter_key, status: null });
      await load();
      toast("용병 등록을 취소했습니다.", "info");
    } catch {
      toast("취소하지 못했습니다.", "error");
    } finally {
      setBusy(false);
    }
  };

  const options: { s: AttendanceStatus; label: string; icon: React.ReactNode; cls: string }[] = [
    { s: "ATTEND", label: "참석", icon: <CheckCircle2 size={18} />, cls: "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
    { s: "LATE", label: "지각", icon: <Clock size={18} />, cls: "border-amber-600 bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
    { s: "ABSENT", label: "불참", icon: <XCircle size={18} />, cls: "border-line bg-surface-3 text-fg-2" },
  ];

  const m = data?.match;
  const title = m ? (m.matchType === "SCRIMMAGE" ? m.title ?? "자체전" : m.opponent ? `하퍼세븐 vs ${m.opponent}` : m.title ?? "경기") : "";

  return (
    <main className="min-h-screen bg-app px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-5 flex items-center justify-center gap-3">
          <LogoBox size={40} />
          <Wordmark size="sm" />
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-fg-muted" role="status">불러오는 중…</p>
        ) : error || !data || !m ? (
          <div className="rounded-2xl border border-line bg-surface p-6 text-center">
            <p className="text-sm font-semibold text-fg">투표 페이지를 열 수 없습니다</p>
            <p className="mt-1 text-sm text-fg-muted">{error ?? "알 수 없는 오류"}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 경기 정보 */}
            <section className="rounded-2xl border border-line bg-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">참석 투표</p>
              <h1 className="mt-1 text-xl font-bold text-fg">{title}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-fg-muted">
                <span>
                  {m.date}
                  {m.time && ` ${m.time}`}
                </span>
                {m.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={13} aria-hidden="true" /> {m.location}
                  </span>
                )}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  참석 {byStatus("ATTEND").length + guestVotes.length}
                </span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                  지각 {byStatus("LATE").length}
                </span>
                <span className="rounded-full bg-surface-3 px-2 py-0.5 font-semibold text-fg-2">불참 {byStatus("ABSENT").length}</span>
                <button type="button" onClick={() => void load()} className="ml-auto inline-flex items-center gap-1 text-fg-muted hover:text-fg" aria-label="새로고침">
                  <RefreshCw size={13} aria-hidden="true" /> 새로고침
                </button>
              </div>
            </section>

            {/* 내 투표 */}
            <section className="rounded-2xl border border-line bg-surface p-5">
              <FormRow label="내 이름">
                <Select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                  <option value="">이름을 선택하세요</option>
                  {data.members.map((mem) => (
                    <option key={mem.id} value={mem.id}>
                      {mem.name}
                    </option>
                  ))}
                </Select>
              </FormRow>
              {myVote && (
                <p className="mt-2 text-xs text-fg-muted">
                  현재 <b className="text-fg">{STATUS_LABEL[myVote.status]}</b>으로 투표됨 · 다른 버튼을 누르면 변경, 같은 버튼을 누르면 취소
                </p>
              )}
              <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="참석 여부">
                {options.map((o) => (
                  <button
                    key={o.s}
                    type="button"
                    disabled={busy || !memberId}
                    aria-pressed={myVote?.status === o.s}
                    onClick={() => vote(myVote?.status === o.s ? null : o.s)}
                    className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border-2 text-sm font-bold transition-colors duration-100 disabled:opacity-50 ${
                      myVote?.status === o.s ? o.cls : "border-line bg-surface text-fg-2 hover:bg-surface-2"
                    }`}
                  >
                    {o.icon}
                    {o.label}
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <TextInput value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="메모 (선택) 예: 30분 늦어요" aria-label="메모" />
              </div>
            </section>

            {/* 용병 */}
            <section className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-fg">
                  <UserPlus size={15} aria-hidden="true" /> 용병 데려오기
                </h2>
                <Button variant="secondary" onClick={() => setGuestOpen((v) => !v)} className="!min-h-8 !px-3 !text-xs">
                  {guestOpen ? "닫기" : "+ 용병 등록"}
                </Button>
              </div>
              {guestOpen && (
                <div className="mt-3 space-y-2">
                  <FormRow label="용병 이름">
                    <TextInput value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} placeholder="이름" />
                  </FormRow>
                  <div className="grid grid-cols-3 gap-2">
                    <FormRow label="주 포지션">
                      <Select value={guest.primary} onChange={(e) => setGuest({ ...guest, primary: e.target.value })}>
                        {GUEST_POS_OPTIONS.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </Select>
                    </FormRow>
                    <FormRow label="부 포지션">
                      <Select value={guest.secondary} onChange={(e) => setGuest({ ...guest, secondary: e.target.value })}>
                        <option value="">없음</option>
                        {GUEST_POS_OPTIONS.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </Select>
                    </FormRow>
                    <FormRow label="나이">
                      <TextInput type="number" inputMode="numeric" value={guest.age} onChange={(e) => setGuest({ ...guest, age: e.target.value })} placeholder="28" />
                    </FormRow>
                  </div>
                  <Button onClick={addGuest} disabled={busy} className="w-full">
                    용병 참석 등록
                  </Button>
                </div>
              )}
              {guestVotes.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {guestVotes.map((v) => (
                    <li key={v.voter_key} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-1.5 text-sm">
                      <span className="text-fg">
                        {v.guest_name} <span className="text-xs text-fg-muted">{v.guest_positions}{v.guest_age ? ` · ${v.guest_age}세` : ""}</span>
                      </span>
                      <button type="button" onClick={() => removeGuest(v)} disabled={busy} className="text-xs text-fg-muted hover:text-red-600">
                        취소
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 명단 */}
            <section className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-fg">
                <Users size={15} aria-hidden="true" /> 투표 현황
              </h2>
              {(["ATTEND", "LATE", "ABSENT"] as AttendanceStatus[]).map((s) => {
                const list = byStatus(s);
                if (list.length === 0 && !(s === "ATTEND" && guestVotes.length)) return null;
                return (
                  <div key={s} className="mb-2 text-sm">
                    <span className="mr-2 font-semibold text-fg-2">{STATUS_LABEL[s]}</span>
                    <span className="text-fg-muted">
                      {list.map((v) => nameOf(v.member_id!)).join(", ")}
                      {s === "ATTEND" && guestVotes.length > 0 && `${list.length ? ", " : ""}${guestVotes.map((v) => `${v.guest_name}(용병)`).join(", ")}`}
                    </span>
                  </div>
                );
              })}
              {memberVotes.length === 0 && guestVotes.length === 0 && <p className="text-sm text-fg-muted">아직 투표가 없습니다. 첫 번째로 투표해보세요!</p>}
            </section>

            <p className="pb-6 text-center text-xs text-fg-muted">하퍼세븐 · 투표는 운영자가 출석과 라인업에 반영합니다.</p>
          </div>
        )}
      </div>
    </main>
  );
}
