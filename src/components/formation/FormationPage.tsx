"use client";
import React, { useMemo, useState, useEffect, useRef } from "react";
import { toBlob } from "html-to-image";
import { useAppStore } from "@/lib/store/AppStore";
import { MemberTypeBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select, TextInput, FormRow } from "@/components/ui/Field";
import { QuarterLineupCard } from "./QuarterLineupCard";
import { PitchEditor } from "./PitchEditor";
import { PlayerQuarterSummaryTable } from "./PlayerQuarterSummaryTable";
import { FormationWarnings } from "./FormationWarnings";
import { FormationChatPanel } from "./FormationChatPanel";
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

export function FormationPage() {
  const { members, matches, formationTemplates, upsertFormationTemplate, upsertMatch, upsertMember } = useAppStore();

  const [matchId, setMatchId] = useState<string>(matches[0]?.id ?? "");
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
      alert("포메이션 템플릿을 선택하세요.");
      return;
    }
    if (attendees.length === 0) {
      alert("참여 인원을 1명 이상 선택하세요.");
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
      alert(`${tc === "WHITE" ? "화이트" : "블랙"} 팀에 배정된 회원이 없습니다. '팀 편집'에서 배정하세요.`);
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

  // 같은 경기 안에서 다른 쿼터의 포메이션을 현재 쿼터로 복사
  const copyQuarterFrom = (fromQ: number, toQ: number) => {
    if (!plan || fromQ === toQ) return;
    const src = plan.quarters.find((q) => q.quarter === fromQ);
    if (!src) return;
    if (!confirm(`${toQ}쿼터를 ${fromQ}쿼터 포메이션으로 덮어씌울까요?`)) return;
    const quarters = plan.quarters.map((q) =>
      q.quarter === toQ ? { ...q, players: src.players.map((p) => ({ ...p })), rests: [...src.rests] } : q,
    );
    setPlan({ ...plan, quarters, summary: summarizeQuarters(quarters, attendeeIds) });
  };

  const savePlan = () => {
    if (!match || !plan) return;
    upsertMatch({ ...match, formationPlan: plan });
    alert("이 경기에 포메이션을 저장했습니다.");
  };

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  /** 1~4쿼터 전술 보드 + 선수별 출전 요약을 순서대로 PNG Blob 5장으로 캡처 */
  const captureBoards = async (): Promise<{ name: string; blob: Blob }[]> => {
    if (!plan) return [];
    const out: { name: string; blob: Blob }[] = [];
    await wait(120);
    for (const q of plan.quarters) {
      setActiveQuarter(q.quarter);
      await wait(300); // 렌더 완료 대기
      if (!boardRef.current) continue;
      const blob = await toBlob(boardRef.current, { pixelRatio: 2, backgroundColor: "#0B1117" });
      if (blob) out.push({ name: `하퍼세븐_포메이션_${q.quarter}쿼터.png`, blob });
    }
    if (summaryRef.current) {
      const blob = await toBlob(summaryRef.current, { pixelRatio: 2, backgroundColor: "#FFFFFF" });
      if (blob) out.push({ name: `하퍼세븐_포메이션_출전요약.png`, blob });
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
      alert("이미지 5장을 저장했습니다. (1~4쿼터 + 출전 요약)\n브라우저가 여러 파일 다운로드 허용을 물으면 '허용'을 눌러주세요.");
    } catch (e) {
      alert("이미지 저장 중 오류가 발생했습니다. 다시 시도해주세요.");
      console.error(e);
    } finally {
      setActiveQuarter(prevQuarter);
      setViewMode(prevView);
      setExporting(false);
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
            alert("공유가 지원되지 않아 이미지 5장을 저장했습니다. 저장된 사진을 카톡에 첨부해주세요.");
          }
        }
      } else {
        downloadAll(captures);
        alert(
          "이 브라우저(PC 등)에서는 카톡 공유 시트를 열 수 없어 이미지 5장을 저장했습니다.\n휴대폰에서 열면 카톡으로 바로 공유됩니다.",
        );
      }
    } catch (e) {
      alert("이미지 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
      console.error(e);
    } finally {
      setActiveQuarter(prevQuarter);
      setViewMode(prevView);
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="포메이션 관리"
        description="경기와 참여 인원을 고르고 자동 배정하거나 직접 배치를 조정하세요."
      />

      {/* 설정 (밝은 카드) */}
      <div className="rounded-[14px] border border-[#E4E7EC] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
          <FormRow label="포메이션 템플릿">
            <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              {formationTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.playerCount}인)
                </option>
              ))}
            </Select>
          </FormRow>
          <div className="flex items-end gap-2">
            <Button onClick={() => generate()} className="flex-1">
              자동 배정 생성
            </Button>
            <Button variant="secondary" onClick={() => setShowCustom((v) => !v)}>
              커스텀
            </Button>
          </div>
        </div>

        {/* 참여 인원 선택 */}
        <div className="my-5 h-px bg-gray-100" />
        <div>
          {/* 자체전 팀 빠른 선택 */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">자체전 팀</span>
            <button
              onClick={() => loadTeam("WHITE")}
              className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              ● 화이트 {teamCount("WHITE")}
            </button>
            <button
              onClick={() => loadTeam("BLACK")}
              className="rounded-lg bg-gray-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-gray-800"
            >
              ● 블랙 {teamCount("BLACK")}
            </button>
            <button
              onClick={() => setTeamModalOpen(true)}
              className="rounded-lg border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              ✎ 팀 편집
            </button>
            <span className="text-xs text-gray-400">※ 버튼을 누르면 해당 팀 명단으로 참여 인원이 재배정됩니다.</span>
          </div>

          <div className="my-5 h-px bg-gray-100" />

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <span className="font-bold text-gray-900">
              참여 인원 <span className="text-brand-600">{attendees.length}명</span>
              <span className="ml-2 text-sm font-normal text-gray-400">· 기준 정원 {template?.playerCount ?? "-"}명</span>
            </span>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setPickerOpen(true)}>
                참여 인원 선택
              </Button>
              <Button variant="secondary" onClick={() => setGuestOpen(true)}>
                + 후보 추가
              </Button>
              {attendees.length > 0 && (
                <Button variant="ghost" onClick={() => setSelectedIds([])}>
                  전체 비우기
                </Button>
              )}
            </div>
          </div>
          {attendees.length === 0 ? (
            <p className="text-sm text-gray-400">
              <b className="text-gray-600">참여 인원 선택</b>을 눌러 오늘 출전할 선수를 직접 고르세요.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {attendees.map((m) => (
                <span
                  key={m.id}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-semibold text-gray-700"
                >
                  {m.isCoach && <span title="감독" className="text-amber-500">★</span>}
                  {m.name}
                  <MemberTypeBadge type={m.memberType} />
                  <button
                    onClick={() => setSelectedIds((prev) => prev.filter((id) => id !== m.id))}
                    className="ml-0.5 text-gray-400 hover:text-red-500"
                    aria-label="제외"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {showCustom && <CustomTemplateForm onSave={(t) => { upsertFormationTemplate(t); setTemplateId(t.id); setShowCustom(false); }} />}
      </div>

      <div className={`grid grid-cols-1 gap-4 ${FEATURES.aiChat ? "xl:grid-cols-3" : ""}`}>
        {/* 좌측: 포메이션 결과 */}
        <div className={`space-y-4 ${FEATURES.aiChat ? "xl:col-span-2" : ""}`}>
          {plan ? (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-gray-900">쿼터별 라인업</h2>
                <div className="flex flex-wrap gap-2">
                  {/* 보기 모드 토글 */}
                  <div className="flex overflow-hidden rounded-lg border border-[#E4E7EC] bg-white">
                    <button
                      onClick={() => setViewMode("pitch")}
                      className={`px-4 py-2 text-sm font-semibold ${
                        viewMode === "pitch" ? "bg-brand-600 text-white" : "text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      필드뷰
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`px-4 py-2 text-sm font-semibold ${
                        viewMode === "list" ? "bg-brand-600 text-white" : "text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      리스트뷰
                    </button>
                  </div>
                  <Button variant="secondary" onClick={() => generate()}>
                    다시 실행
                  </Button>
                  <Button variant="secondary" onClick={exportImages} disabled={exporting}>
                    {exporting ? "처리 중…" : "📸 이미지 저장"}
                  </Button>
                  <Button variant="secondary" onClick={shareImages} disabled={exporting}>
                    📤 카톡 공유
                  </Button>
                  <Button onClick={savePlan}>경기에 저장</Button>
                </div>
              </div>

              {viewMode === "pitch" ? (
                <div className="mx-auto w-full max-w-5xl space-y-3">
                  {/* 쿼터 탭 + 다른 쿼터 불러오기 */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="grid min-w-[240px] flex-1 grid-cols-4 gap-1.5">
                      {plan.quarters.map((q) => (
                        <button
                          key={q.quarter}
                          onClick={() => setActiveQuarter(q.quarter)}
                          className={`flex flex-col items-center rounded-lg px-2 py-2 text-sm transition ${
                            activeQuarter === q.quarter
                              ? "border border-transparent bg-brand-600 text-white"
                              : "border border-[#E4E7EC] bg-white text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <span className="font-bold">{q.quarter}쿼터</span>
                          <span className="text-xs opacity-80">{q.players.length}명</span>
                        </button>
                      ))}
                    </div>
                    <select
                      value=""
                      onChange={(e) => {
                        const from = Number(e.target.value);
                        if (from) copyQuarterFrom(from, activeQuarter);
                      }}
                      className="rounded-lg border border-[#D8DCE5] bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#635BFF] focus:outline-none sm:max-w-[190px]"
                      title="같은 경기의 다른 쿼터 포메이션을 현재 쿼터로 복사"
                    >
                      <option value="">↺ 쿼터 불러오기</option>
                      {plan.quarters
                        .filter((q) => q.quarter !== activeQuarter)
                        .map((q) => (
                          <option key={q.quarter} value={q.quarter}>
                            {q.quarter}쿼터 → {activeQuarter}쿼터
                          </option>
                        ))}
                    </select>
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
                  <p className="text-center text-sm text-gray-400">
                    ※ 드래그 또는 클릭으로 선수의 위치를 변경할 수 있습니다. 모바일에서는{" "}
                    <b className="text-red-500">−</b> / 빈 자리 클릭 후 선수 선택으로도 됩니다.
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
                <Card className="!rounded-[14px] !border-[#E4E7EC]">
                  <h2 className="mb-3 text-base font-bold text-gray-900">선수별 출전 요약</h2>
                  <PlayerQuarterSummaryTable summary={plan.summary} members={allMembers} minGuaranteed={DEFAULT_BASE_RULES.minGuaranteedQuarters} />
                </Card>
              </div>

              <FormationWarnings plan={plan} />
            </>
          ) : (
            <div className="rounded-[14px] border border-[#E4E7EC] bg-white px-6 py-14 text-center shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
              <div className="text-4xl">⚽</div>
              <h3 className="mt-4 text-base font-bold text-gray-900">아직 라인업이 없습니다</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
                참여 인원과 포메이션을 선택한 뒤 자동 배정을 생성해주세요.
              </p>
              <Button onClick={() => generate()} className="mt-5">
                자동 배정 생성
              </Button>
            </div>
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
    </div>
  );
}

/** 커스텀 포메이션 템플릿 생성 폼 */
function CustomTemplateForm({ onSave }: { onSave: (t: FormationTemplate) => void }) {
  const [name, setName] = useState("");
  const [gk, setGk] = useState(1);
  const [df, setDf] = useState(3);
  const [mf, setMf] = useState(3);
  const [fw, setFw] = useState(1);
  const total = gk + df + mf + fw;

  return (
    <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50/60 p-4">
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
        <span className="text-sm text-gray-500">정원 {total}명</span>
        <Button
          onClick={() => {
            if (!name.trim()) return alert("이름을 입력하세요.");
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
