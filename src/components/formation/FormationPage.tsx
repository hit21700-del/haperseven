"use client";
import React, { useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ClipboardList, Image as ImageIcon, Share2, Goal, ChevronDown, X, Pencil } from "lucide-react";
import { useAppStore } from "@/lib/store/AppStore";
import { MemberTypeBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select, TextInput, FormRow } from "@/components/ui/Field";
import { QuarterLineupCard } from "./QuarterLineupCard";
import { PitchEditor } from "./PitchEditor";
import { PlayerQuarterSummaryTable } from "./PlayerQuarterSummaryTable";
import { FormationWarnings } from "./FormationWarnings";
import { ParticipantPickerModal } from "./ParticipantPickerModal";
import { GuestAddModal } from "./GuestAddModal";
import { TeamEditModal } from "./TeamEditModal";
import { generateFormationPlan } from "@/lib/formation/generateFormationPlan";
import { summarizeQuarters } from "@/lib/formation/recompute";
import { DEFAULT_BASE_RULES } from "@/types/formation";
import type { FormationPlan, FormationTemplate, QuarterLineup } from "@/types/formation";
import type { Member, TeamColor } from "@/types/member";
import type { AttendanceRecord } from "@/types/match";
import type { ChatFormationRule } from "@/types/chat";
import { FEATURES } from "@/lib/config";
import { useAuth } from "@/lib/auth/AuthProvider";
import { fetchMatchVotes, type MatchVote } from "@/lib/repository/cloudRepository";
import { buildGuestMember } from "@/lib/formation/guestMember";

// AI 채팅 패널은 기능 플래그가 켜졌을 때만 별도 청크로 로드
const FormationChatPanel = dynamic(() => import("./FormationChatPanel").then((m) => m.FormationChatPanel), {
  ssr: false,
});

/** 캡처 이미지 총 장수 (1~4쿼터 + 출전 요약) */
const CAPTURE_TOTAL = 5;

export function FormationPage() {
  const { members, matches, formationTemplates, upsertFormationTemplate, upsertMatch, upsertMember } = useAppStore();
  const toast = useToast();

  const [matchId, setMatchId] = useState<string>(matches[0]?.id ?? "");
  const searchParams = useSearchParams();

  // /formation?match=<id> 딥링크: 해당 경기를 자동 선택 (경기 화면의 "포메이션 편집" 연결)
  useEffect(() => {
    const fromUrl = searchParams.get("match");
    if (fromUrl && matches.some((m) => m.id === fromUrl)) setMatchId(fromUrl);
  }, [searchParams, matches]);
  const [templateId, setTemplateId] = useState<string>(formationTemplates[0]?.id ?? "");
  const [chatRules, setChatRules] = useState<ChatFormationRule[]>([]);
  const [plan, setPlan] = useState<FormationPlan | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  // 참여 인원(직접 선택). 경기를 고르면 그 경기 출석자로 자동 채워지고, 이후 자유롭게 가감 가능
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  // 일회용 용병(게스트). 회원 명단에는 저장하지 않고 이번 포메이션에만 사용
  const [guests, setGuests] = useState<Member[]>([]);
  // 보기 모드: 필드뷰(축구장) / 리스트(셀렉트박스 수정)
  const [viewMode, setViewMode] = useState<"pitch" | "list">("pitch");
  // 필드뷰에서 편집 중인 쿼터(1~4)
  const [activeQuarter, setActiveQuarter] = useState(1);
  // 이미지 저장(캡처) 진행 상태
  const [exporting, setExporting] = useState(false);
  // 캡처 진행 장수 (n/5)
  const [progress, setProgress] = useState(0);
  // 공유 드롭다운 메뉴
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  // 쿼터 덮어쓰기 확인 다이얼로그
  const [copyConfirm, setCopyConfirm] = useState<{ from: number; to: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const match = matches.find((m) => m.id === matchId) ?? null;
  const template = formationTemplates.find((t) => t.id === templateId) ?? formationTemplates[0];
  // 회원 + 일회용 용병
  const allMembers = useMemo(() => [...members, ...guests], [members, guests]);
  const activeMembers = useMemo(() => allMembers.filter((m) => m.isActive), [allMembers]);

  // 선택된 참여 인원 → 출석 기록/대상 명단으로 변환
  const attendance = useMemo<AttendanceRecord[]>(
    () => selectedIds.map((id) => ({ memberId: id, status: "ATTEND" as const })),
    [selectedIds],
  );
  const attendees = useMemo(
    () => activeMembers.filter((m) => selectedIds.includes(m.id)),
    [activeMembers, selectedIds],
  );
  const attendeeIds = attendees.map((m) => m.id);

  // 선택된 경기의 참석자(참석+지각) — 원탭으로 참여 인원에 반영
  const matchAttendeeIds = useMemo(() => {
    if (!match) return [];
    return match.attendance
      .filter((a) => a.status === "ATTEND" || a.status === "LATE")
      .map((a) => a.memberId)
      .filter((id) => activeMembers.some((m) => m.id === id));
  }, [match, activeMembers]);

  // (cloud) 이 경기의 공개 투표 — 용병 참석 등록을 포메이션 용병으로 불러오기 위해 조회
  const { mode: authMode } = useAuth();
  const [matchVotes, setMatchVotes] = useState<MatchVote[]>([]);
  useEffect(() => {
    if (authMode !== "cloud" || !match?.id) {
      setMatchVotes([]);
      return;
    }
    let alive = true;
    fetchMatchVotes(match.id)
      .then((v) => alive && setMatchVotes(v))
      .catch(() => alive && setMatchVotes([]));
    return () => {
      alive = false;
    };
  }, [authMode, match?.id]);
  const guestVotes = useMemo(
    () => matchVotes.filter((v) => !v.member_id && v.guest_name && v.status === "ATTEND"),
    [matchVotes],
  );

  /** 참석자 + 투표로 등록된 용병을 참여 인원으로 불러오기 */
  const loadMatchAttendees = () => {
    const guestMembers = guestVotes.map((v) =>
      buildGuestMember({
        id: `guest-vote-${match!.id}-${v.voter_key}`,
        name: v.guest_name!,
        detailPositions: (v.guest_positions ?? "CM").split(",").filter(Boolean),
        age: v.guest_age ?? undefined,
      }),
    );
    setGuests((prev) => {
      const known = new Set(prev.map((g) => g.id));
      return [...prev, ...guestMembers.filter((g) => !known.has(g.id))];
    });
    setSelectedIds([...matchAttendeeIds, ...guestMembers.map((g) => g.id)]);
  };

  // 경기를 바꾸면: 저장된 포메이션이 있으면 그 명단을 복원, 없으면 참여 인원을 '비워서' 시작
  // (자동 선택하지 않고, 사용자가 '참여 인원 선택'으로 직접 고른다)
  useEffect(() => {
    const saved = match?.formationPlan ?? null;
    setPlan(saved);
    if (saved) {
      const ids = new Set<string>();
      saved.quarters.forEach((q) => {
        q.players.forEach((p) => ids.add(p.memberId));
        q.rests.forEach((r) => ids.add(r));
      });
      setSelectedIds([...ids].filter((id) => activeMembers.some((m) => m.id === id)));
    } else {
      setSelectedIds([]);
    }
  }, [matchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const generate = (rules: ChatFormationRule[] = chatRules) => {
    if (!template) {
      toast("포메이션 템플릿을 선택하세요.", "error");
      return;
    }
    if (attendees.length === 0) {
      toast("참여 인원을 1명 이상 선택하세요.", "error");
      return;
    }
    const result = generateFormationPlan({
      members: allMembers,
      attendance,
      formationTemplate: template,
      quarterCount: 4,
      chatRules: rules,
    });
    setPlan(result);
  };

  // 채팅 규칙 적용(누적)
  const applyRules = (rules: ChatFormationRule[]) => {
    setChatRules((prev) => {
      const merged = [...prev, ...rules];
      return merged;
    });
  };
  const removeRule = (id: string) => setChatRules((prev) => prev.filter((r) => r.id !== id));
  const clearRules = () => setChatRules([]);

  // 자체전 팀 → 참여 인원으로 로드
  const teamCount = (tc: TeamColor) => activeMembers.filter((m) => m.team === tc).length;
  const loadTeam = (tc: TeamColor) => {
    const ids = activeMembers.filter((m) => m.team === tc).map((m) => m.id);
    if (ids.length === 0) {
      toast(`${tc === "WHITE" ? "화이트" : "블랙"} 팀에 배정된 회원이 없습니다. '팀 편집'에서 배정하세요.`, "error");
      return;
    }
    setSelectedIds(ids);
  };

  // 수동 쿼터 수정
  const editQuarter = (updated: QuarterLineup) => {
    if (!plan) return;
    const quarters = plan.quarters.map((q) => (q.quarter === updated.quarter ? updated : q));
    setPlan({ ...plan, quarters, summary: summarizeQuarters(quarters, attendeeIds) });
  };

  // 같은 경기 안에서 다른 쿼터의 포메이션을 현재 쿼터로 복사 — 확인 다이얼로그를 먼저 띄운다
  const copyQuarterFrom = (fromQ: number, toQ: number) => {
    if (!plan || fromQ === toQ) return;
    const src = plan.quarters.find((q) => q.quarter === fromQ);
    if (!src) return;
    setCopyConfirm({ from: fromQ, to: toQ });
  };

  // 확인 후 실제 복사 수행
  const applyCopyQuarter = () => {
    if (!copyConfirm) return;
    const { from: fromQ, to: toQ } = copyConfirm;
    setCopyConfirm(null);
    if (!plan || fromQ === toQ) return;
    const src = plan.quarters.find((q) => q.quarter === fromQ);
    if (!src) return;
    const quarters = plan.quarters.map((q) =>
      q.quarter === toQ ? { ...q, players: src.players.map((p) => ({ ...p })), rests: [...src.rests] } : q,
    );
    setPlan({ ...plan, quarters, summary: summarizeQuarters(quarters, attendeeIds) });
  };

  const savePlan = () => {
    if (!match || !plan) return;
    upsertMatch({ ...match, formationPlan: plan });
    toast("이 경기에 포메이션을 저장했습니다.");
  };

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  /** 1~4쿼터 전술 보드 + 선수별 출전 요약을 순서대로 PNG Blob 5장으로 캡처 */
  const captureBoards = async (): Promise<{ name: string; blob: Blob }[]> => {
    if (!plan) return [];
    const { toBlob } = await import("html-to-image"); // 캡처 시점에만 로드
    const out: { name: string; blob: Blob }[] = [];
    let done = 0;
    setProgress(0);
    await wait(120);
    for (const q of plan.quarters) {
      setActiveQuarter(q.quarter);
      await wait(300); // 렌더 완료 대기
      if (!boardRef.current) continue;
      const blob = await toBlob(boardRef.current, { pixelRatio: 2, backgroundColor: "#0B1117" });
      if (blob) out.push({ name: `하퍼세븐_포메이션_${q.quarter}쿼터.png`, blob });
      setProgress(++done);
    }
    if (summaryRef.current) {
      const blob = await toBlob(summaryRef.current, { pixelRatio: 2, backgroundColor: "#FFFFFF" });
      if (blob) out.push({ name: `하퍼세븐_포메이션_출전요약.png`, blob });
      setProgress(++done);
    }
    return out;
  };

  const downloadAll = (captures: { name: string; blob: Blob }[]) => {
    captures.forEach(({ name, blob }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    });
  };

  // 쿼터별 보드 4장 + 선수별 출전 요약 1장 = 총 5장의 PNG 저장
  const exportImages = async () => {
    if (!plan || exporting) return;
    const prevQuarter = activeQuarter;
    const prevView = viewMode;
    setViewMode("pitch");
    setExporting(true);
    try {
      const captures = await captureBoards();
      downloadAll(captures);
      toast("이미지 5장을 저장했습니다. (1~4쿼터 + 출전 요약)\n브라우저가 여러 파일 다운로드 허용을 물으면 '허용'을 누르세요.");
    } catch (e) {
      toast("이미지 저장 중 오류가 발생했습니다. 다시 시도하세요.", "error");
      console.error(e);
    } finally {
      setActiveQuarter(prevQuarter);
      setViewMode(prevView);
      setExporting(false);
      setProgress(0);
    }
  };

  // 모바일 공유 시트로 카톡 등에 공유 (1~4쿼터 → 출전 요약 순서). 미지원 환경은 다운로드로 폴백
  const shareImages = async () => {
    if (!plan || exporting) return;
    const prevQuarter = activeQuarter;
    const prevView = viewMode;
    setViewMode("pitch");
    setExporting(true);
    try {
      const captures = await captureBoards();
      const files = captures.map(({ name, blob }) => new File([blob], name, { type: "image/png" }));
      const canShareFiles =
        typeof navigator !== "undefined" && !!navigator.canShare && navigator.canShare({ files });
      if (canShareFiles) {
        try {
          await navigator.share({ files, title: "하퍼세븐 포메이션" });
        } catch (e) {
          // 사용자가 공유 시트를 닫은 경우(AbortError)는 조용히 무시
          if (!(e instanceof DOMException && e.name === "AbortError")) {
            downloadAll(captures);
            toast("공유가 지원되지 않아 이미지 5장을 저장했습니다. 저장된 사진을 카톡에 첨부하세요.", "info");
          }
        }
      } else {
        downloadAll(captures);
        toast(
          "이 브라우저(PC 등)에서는 카톡 공유 시트를 열 수 없어 이미지 5장을 저장했습니다.\n휴대폰에서 열면 카톡으로 바로 공유됩니다.",
          "info",
        );
      }
    } catch (e) {
      toast("이미지 생성 중 오류가 발생했습니다. 다시 시도하세요.", "error");
      console.error(e);
    } finally {
      setActiveQuarter(prevQuarter);
      setViewMode(prevView);
      setExporting(false);
      setProgress(0);
    }
  };

  const shareLabel = exporting ? `${progress}/${CAPTURE_TOTAL} 생성 중…` : "공유";

  return (
    <div className="space-y-4">
      <PageHeader
        title="포메이션 관리"
        description="경기와 참여 인원을 고르고 자동 배정하거나 직접 배치를 조정하세요."
      />

      {/* 설정 카드: 경기 → 템플릿 → 자체전 팀 → 참여 인원 → 자동 배정 생성 */}
      <Card>
        <div className="space-y-6">
          {/* 1. 경기 / 포메이션 템플릿 */}
          <div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormRow label="경기 선택">
                <Select value={matchId} onChange={(e) => setMatchId(e.target.value)}>
                  <option value="">경기 선택</option>
                  {matches.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.date} {m.title ?? ""}
                    </option>
                  ))}
                </Select>
              </FormRow>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <FormRow label="포메이션 템플릿">
                    <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                      {formationTemplates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.playerCount}인)
                        </option>
                      ))}
                    </Select>
                  </FormRow>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setShowCustom((v) => !v)}
                  aria-expanded={showCustom}
                  className="shrink-0"
                >
                  커스텀
                </Button>
              </div>
            </div>
            {showCustom && (
              <CustomTemplateForm
                onSave={(t) => {
                  upsertFormationTemplate(t);
                  setTemplateId(t.id);
                  setShowCustom(false);
                }}
              />
            )}
          </div>

          {/* 2. 자체전 팀 빠른 선택 */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-fg-2">자체전 팀</span>
            <button
              type="button"
              onClick={() => loadTeam("WHITE")}
              className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-semibold text-gray-900 hover:bg-gray-100"
            >
              ● 화이트 {teamCount("WHITE")}
            </button>
            <button
              type="button"
              onClick={() => loadTeam("BLACK")}
              className="rounded-lg border border-white/20 bg-black px-4 py-1.5 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              ● 블랙 {teamCount("BLACK")}
            </button>
            <button
              type="button"
              onClick={() => setTeamModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-fg-2 hover:bg-surface-2"
            >
              <Pencil size={14} aria-hidden="true" />
              팀 편집
            </button>
            <span className="text-xs text-fg-muted">※ 버튼을 누르면 해당 팀 명단으로 참여 인원이 재배정됩니다.</span>
          </div>

          {/* 3. 참여 인원 */}
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <span className="font-bold text-fg">
                참여 인원 <span className="text-brand">{attendees.length}명</span>
                <span className="ml-2 text-sm font-normal text-fg-muted">· 기준 정원 {template?.playerCount ?? "-"}명</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {match && (matchAttendeeIds.length > 0 || guestVotes.length > 0) && (
                  <Button
                    variant="secondary"
                    className="!border-brand !bg-brand-50 !text-brand hover:!bg-brand-100"
                    onClick={loadMatchAttendees}
                    title="경기 화면에서 체크한 참석/지각 인원과 투표로 등록된 용병을 불러옵니다"
                  >
                    <ClipboardList size={16} aria-hidden="true" />
                    이 경기 참석자 {matchAttendeeIds.length}명
                    {guestVotes.length > 0 && ` + 용병 ${guestVotes.length}명`} 불러오기
                  </Button>
                )}
                <Button variant="secondary" onClick={() => setPickerOpen(true)}>
                  참여 인원 선택
                </Button>
                <Button variant="secondary" onClick={() => setGuestOpen(true)}>
                  용병 추가
                </Button>
                {attendees.length > 0 && (
                  <Button variant="ghost" onClick={() => setSelectedIds([])}>
                    전체 비우기
                  </Button>
                )}
              </div>
            </div>
            {attendees.length === 0 ? (
              <p className="text-sm text-fg-muted">
                <b className="text-fg-2">참여 인원 선택</b>을 눌러 오늘 출전할 선수를 직접 고르세요.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {attendees.map((m) => (
                  <span
                    key={m.id}
                    className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 py-1 pl-3 pr-1 text-sm font-semibold text-fg-2"
                  >
                    {m.isCoach && (
                      <span title="감독" className="text-amber-500">
                        ★
                      </span>
                    )}
                    {m.name}
                    <MemberTypeBadge type={m.memberType} />
                    <button
                      type="button"
                      onClick={() => setSelectedIds((prev) => prev.filter((id) => id !== m.id))}
                      className="inline-grid h-7 w-7 place-items-center rounded-md text-fg-muted hover:bg-surface-3 hover:text-red-600 dark:hover:text-red-400"
                      aria-label={`${m.name} 제외`}
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 4. 자동 배정 생성 (primary) */}
          <Button onClick={() => generate()} className="w-full sm:w-auto sm:min-w-[200px]">
            자동 배정 생성
          </Button>
        </div>
      </Card>

      <div className={`grid grid-cols-1 gap-4 ${FEATURES.aiChat ? "xl:grid-cols-3" : ""}`}>
        {/* 좌측: 포메이션 결과 */}
        <div className={`space-y-4 ${FEATURES.aiChat ? "xl:col-span-2" : ""}`}>
          {plan ? (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-fg">쿼터별 라인업</h2>
                <div className="flex flex-wrap gap-2">
                  {/* 보기 모드 토글 */}
                  <div className="flex overflow-hidden rounded-lg border border-line bg-surface" role="group" aria-label="보기 모드">
                    <button
                      type="button"
                      onClick={() => setViewMode("pitch")}
                      aria-pressed={viewMode === "pitch"}
                      className={`px-4 py-2 text-sm font-semibold ${
                        viewMode === "pitch" ? "bg-brand text-brand-fg" : "text-fg-2 hover:bg-surface-2"
                      }`}
                    >
                      필드뷰
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      aria-pressed={viewMode === "list"}
                      className={`px-4 py-2 text-sm font-semibold ${
                        viewMode === "list" ? "bg-brand text-brand-fg" : "text-fg-2 hover:bg-surface-2"
                      }`}
                    >
                      리스트뷰
                    </button>
                  </div>
                  <Button variant="secondary" onClick={() => generate()}>
                    다시 실행
                  </Button>

                  {/* 공유: 이미지 저장 / 카톡 공유 드롭다운 */}
                  <div className="relative">
                    <Button
                      variant="secondary"
                      onClick={() => setShareMenuOpen((v) => !v)}
                      disabled={exporting}
                      aria-haspopup="menu"
                      aria-expanded={shareMenuOpen}
                    >
                      <Share2 size={16} aria-hidden="true" />
                      {shareLabel}
                      <ChevronDown size={14} aria-hidden="true" />
                    </Button>
                    {shareMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setShareMenuOpen(false)} />
                        <div
                          role="menu"
                          aria-label="공유 방법"
                          className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-lg"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setShareMenuOpen(false);
                              exportImages();
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg-2 hover:bg-surface-2"
                          >
                            <ImageIcon size={16} aria-hidden="true" />
                            이미지로 저장
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setShareMenuOpen(false);
                              shareImages();
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg-2 hover:bg-surface-2"
                          >
                            <Share2 size={16} aria-hidden="true" />
                            카톡으로 공유
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <Button onClick={savePlan} className="hidden md:inline-flex">
                    경기에 저장
                  </Button>
                </div>
              </div>

              {viewMode === "pitch" ? (
                <div className="mx-auto w-full max-w-5xl space-y-3">
                  {/* 쿼터 탭 + 다른 쿼터 불러오기 */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="grid min-w-[240px] flex-1 grid-cols-4 gap-1.5" role="group" aria-label="쿼터 선택">
                      {plan.quarters.map((q) => (
                        <button
                          type="button"
                          key={q.quarter}
                          onClick={() => setActiveQuarter(q.quarter)}
                          aria-pressed={activeQuarter === q.quarter}
                          className={`flex flex-col items-center rounded-lg px-2 py-2 text-sm transition ${
                            activeQuarter === q.quarter
                              ? "border border-transparent bg-brand text-brand-fg"
                              : "border border-line bg-surface text-fg-2 hover:bg-surface-2"
                          }`}
                        >
                          <span className="font-bold">{q.quarter}쿼터</span>
                          <span className="text-xs opacity-80">{q.players.length}명</span>
                        </button>
                      ))}
                    </div>
                    <Select
                      value=""
                      onChange={(e) => {
                        const from = Number(e.target.value);
                        if (from) copyQuarterFrom(from, activeQuarter);
                      }}
                      className="w-auto sm:max-w-[190px]"
                      title="같은 경기의 다른 쿼터 포메이션을 현재 쿼터로 복사"
                      aria-label="다른 쿼터 포메이션 불러오기"
                    >
                      <option value="">↺ 쿼터 불러오기</option>
                      {plan.quarters
                        .filter((q) => q.quarter !== activeQuarter)
                        .map((q) => (
                          <option key={q.quarter} value={q.quarter}>
                            {q.quarter}쿼터 → {activeQuarter}쿼터
                          </option>
                        ))}
                    </Select>
                  </div>

                  {/* 선택된 쿼터 필드 에디터 (이미지 저장 시 캡처 대상) */}
                  <div ref={boardRef} data-export={exporting ? "" : undefined}>
                    {plan.quarters
                      .filter((q) => q.quarter === activeQuarter)
                      .map((q) => (
                        <PitchEditor
                          key={q.quarter}
                          lineup={q}
                          template={template}
                          members={allMembers}
                          attendeeIds={attendeeIds}
                          onChange={editQuarter}
                        />
                      ))}
                  </div>
                  <p className="text-center text-sm text-fg-muted">
                    ※ 드래그 또는 클릭으로 선수의 위치를 변경할 수 있습니다. 모바일에서는{" "}
                    <b className="text-red-600 dark:text-red-400">−</b> / 빈 자리 클릭 후 선수 선택으로도 됩니다.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {plan.quarters.map((q) => (
                    <QuarterLineupCard
                      key={q.quarter}
                      lineup={q}
                      template={template}
                      members={allMembers}
                      attendeeIds={attendeeIds}
                      onChange={editQuarter}
                      copyQuarters={plan.quarters.map((x) => x.quarter).filter((x) => x !== q.quarter)}
                      onCopyFrom={(from) => copyQuarterFrom(from, q.quarter)}
                    />
                  ))}
                </div>
              )}

              <div ref={summaryRef}>
                <Card>
                  <h2 className="mb-3 text-base font-bold text-fg">선수별 출전 요약</h2>
                  <PlayerQuarterSummaryTable summary={plan.summary} members={allMembers} minGuaranteed={DEFAULT_BASE_RULES.minGuaranteedQuarters} />
                </Card>
              </div>

              <FormationWarnings plan={plan} />
            </>
          ) : (
            <Card>
              <EmptyState
                icon={<Goal size={20} />}
                title="아직 라인업이 없습니다"
                description="참여 인원과 포메이션을 선택한 뒤 자동 배정을 생성하세요."
                action={<Button onClick={() => generate()}>자동 배정 생성</Button>}
              />
            </Card>
          )}
        </div>

        {/* 우측: 채팅 패널 (기능 플래그) */}
        {FEATURES.aiChat && (
          <div className="xl:col-span-1">
            <FormationChatPanel
              members={attendees}
              attendance={attendance}
              formationTemplate={template}
              currentPlan={plan ?? undefined}
              appliedRules={chatRules}
              onApplyRules={applyRules}
              onRemoveRule={removeRule}
              onClearRules={clearRules}
              onRegenerate={() => generate()}
            />
          </div>
        )}
      </div>

      {/* 모바일: 하단 탭바 위 스티키 저장 바 */}
      {plan && (
        <>
          <div className="h-16 md:hidden" aria-hidden="true" />
          <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+3.5rem)] z-20 border-t border-line bg-surface/90 px-4 py-3 backdrop-blur md:hidden">
            <Button onClick={savePlan} className="w-full">
              경기에 저장
            </Button>
          </div>
        </>
      )}

      {/* 참여 인원 선택 모달 */}
      <ParticipantPickerModal
        open={pickerOpen}
        members={activeMembers}
        selectedIds={selectedIds}
        onClose={() => setPickerOpen(false)}
        onConfirm={(ids) => {
          setSelectedIds(ids);
          setPickerOpen(false);
        }}
      />

      {/* 일회용 용병 추가 모달 */}
      <GuestAddModal
        open={guestOpen}
        onClose={() => setGuestOpen(false)}
        onAdd={(guest) => {
          setGuests((prev) => [...prev, guest]);
          setSelectedIds((prev) => [...prev, guest.id]);
        }}
      />

      {/* 자체전 팀 편집 모달 */}
      <TeamEditModal open={teamModalOpen} members={members} onClose={() => setTeamModalOpen(false)} onUpdate={upsertMember} />

      {/* 쿼터 덮어쓰기 확인 */}
      <ConfirmDialog
        open={copyConfirm !== null}
        title="쿼터 포메이션 덮어쓰기"
        message={
          copyConfirm
            ? `${copyConfirm.to}쿼터를 ${copyConfirm.from}쿼터 포메이션으로 덮어씁니다. 현재 배치는 사라집니다.`
            : ""
        }
        confirmLabel="덮어쓰기"
        onConfirm={applyCopyQuarter}
        onCancel={() => setCopyConfirm(null)}
      />
    </div>
  );
}

/** 커스텀 포메이션 템플릿 생성 폼 */
function CustomTemplateForm({ onSave }: { onSave: (t: FormationTemplate) => void }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [gk, setGk] = useState(1);
  const [df, setDf] = useState(3);
  const [mf, setMf] = useState(3);
  const [fw, setFw] = useState(1);
  const total = gk + df + mf + fw;

  return (
    <div className="mt-4 rounded-xl border border-dashed border-line bg-surface-2 p-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
        <div className="col-span-2">
          <FormRow label="이름">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 풋살 2-2" />
          </FormRow>
        </div>
        {(
          [
            ["GK", gk, setGk],
            ["DF", df, setDf],
            ["MF", mf, setMf],
            ["FW", fw, setFw],
          ] as [string, number, (n: number) => void][]
        ).map(([label, val, setter]) => (
          <FormRow key={label} label={label}>
            <TextInput type="number" min={0} value={val} onChange={(e) => setter(Number(e.target.value))} />
          </FormRow>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm text-fg-muted">정원 {total}명</span>
        <Button
          onClick={() => {
            if (!name.trim()) {
              toast("이름을 입력하세요.", "error");
              return;
            }
            onSave({
              id: `custom-${Date.now().toString(36)}`,
              name,
              playerCount: total,
              positions: { GK: gk, DF: df, MF: mf, FW: fw },
            });
          }}
        >
          템플릿 저장
        </Button>
      </div>
    </div>
  );
}
