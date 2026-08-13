"use client";
import React, { useMemo, useState, useEffect } from "react";
import { useAppStore } from "@/lib/store/AppStore";
import { MemberTypeBadge } from "@/components/ui/Badge";
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
import { exportFormationToExcel } from "@/lib/excel/excelExporter";
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">포메이션 관리</h1>
        <p className="mt-1 text-sm text-gray-500">경기와 참여 인원을 고르고 자동 배정하거나 직접 배치를 조정하세요.</p>
      </div>

      {/* 설정 */}
      <div className="rounded-2xl border border-white/10 bg-[#12161D] p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">경기 선택</label>
            <select className="fm-select" value={matchId} onChange={(e) => setMatchId(e.target.value)}>
              <option value="">경기 선택</option>
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.date} {m.title ?? ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">포메이션 템플릿</label>
            <select className="fm-select" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              {formationTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.playerCount}인)
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => generate()}
              className="flex-1 rounded-lg bg-[#31ef76] px-4 py-2.5 text-sm font-bold text-[#062313] transition hover:brightness-110"
            >
              자동 배정 생성
            </button>
            <button
              onClick={() => setShowCustom((v) => !v)}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/10"
            >
              커스텀
            </button>
          </div>
        </div>

        {/* 참여 인원 선택 */}
        <div className="my-5 h-px bg-white/10" />
        <div>
          {/* 자체전 팀 빠른 선택 */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-gray-300">자체전 팀</span>
            <button
              onClick={() => loadTeam("WHITE")}
              className="rounded-lg border border-white/15 bg-gray-100 px-4 py-1.5 text-sm font-semibold text-gray-900 hover:bg-white"
            >
              ● 화이트 {teamCount("WHITE")}
            </button>
            <button
              onClick={() => loadTeam("BLACK")}
              className="rounded-lg border border-white/25 bg-black px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#1A202A]"
            >
              ● 블랙 {teamCount("BLACK")}
            </button>
            <button
              onClick={() => setTeamModalOpen(true)}
              className="rounded-lg border border-white/10 bg-white/5 px-3.5 py-1.5 text-sm font-medium text-gray-300 hover:bg-white/10"
            >
              ✎ 팀 편집
            </button>
            <span className="text-xs text-gray-500">※ 버튼을 누르면 해당 팀 명단으로 참여 인원이 재배정됩니다.</span>
          </div>

          <div className="my-5 h-px bg-white/10" />

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <span className="font-bold text-gray-100">
              참여 인원 <span className="text-[#31ef76]">{attendees.length}명</span>
              <span className="ml-2 text-sm font-normal text-gray-500">· 기준 정원 {template?.playerCount ?? "-"}명</span>
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setPickerOpen(true)}
                className="rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-semibold text-gray-200 hover:bg-white/10"
              >
                참여 인원 선택
              </button>
              <button
                onClick={() => setGuestOpen(true)}
                className="rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-semibold text-gray-200 hover:bg-white/10"
              >
                + 후보 추가
              </button>
              {attendees.length > 0 && (
                <button
                  onClick={() => setSelectedIds([])}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-white/5 hover:text-gray-300"
                >
                  전체 비우기
                </button>
              )}
            </div>
          </div>
          {attendees.length === 0 ? (
            <p className="text-sm text-gray-500">
              <b className="text-gray-300">참여 인원 선택</b>을 눌러 오늘 출전할 선수를 직접 고르세요.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {attendees.map((m) => (
                <span
                  key={m.id}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#1A202A] px-3 py-1.5 text-sm font-semibold text-gray-200"
                >
                  {m.isCoach && <span title="감독" className="text-amber-300">★</span>}
                  {m.name}
                  <MemberTypeBadge type={m.memberType} />
                  <button
                    onClick={() => setSelectedIds((prev) => prev.filter((id) => id !== m.id))}
                    className="ml-0.5 text-gray-500 hover:text-[#ff5666]"
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
                <h2 className="text-base font-bold text-gray-100">쿼터별 라인업</h2>
                <div className="flex flex-wrap gap-2">
                  {/* 보기 모드 토글 */}
                  <div className="flex overflow-hidden rounded-lg border border-white/10">
                    <button
                      onClick={() => setViewMode("pitch")}
                      className={`px-4 py-2 text-sm font-semibold ${
                        viewMode === "pitch" ? "bg-white/10 text-white" : "bg-transparent text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      필드뷰
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`px-4 py-2 text-sm font-semibold ${
                        viewMode === "list" ? "bg-white/10 text-white" : "bg-transparent text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      리스트뷰
                    </button>
                  </div>
                  <button
                    onClick={() => generate()}
                    className="rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-semibold text-gray-200 hover:bg-white/10"
                  >
                    다시 실행
                  </button>
                  <button
                    onClick={() => exportFormationToExcel(plan, allMembers)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-semibold text-gray-200 hover:bg-white/10"
                  >
                    엑셀
                  </button>
                  <button
                    onClick={savePlan}
                    className="rounded-lg bg-[#31ef76] px-4 py-2 text-sm font-bold text-[#062313] hover:brightness-110"
                  >
                    경기에 저장
                  </button>
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
                              ? "border border-[#31ef76]/50 bg-[#31ef76]/10 text-[#31ef76]"
                              : "border border-white/10 bg-[#12161D] text-gray-400 hover:bg-white/5"
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
                      className="fm-select sm:max-w-[190px]"
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

                  {/* 선택된 쿼터 필드 에디터 */}
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
                  <p className="text-center text-sm text-gray-500">
                    ※ 드래그 또는 클릭으로 선수의 위치를 변경할 수 있습니다. 모바일에서는{" "}
                    <b className="text-[#ff5666]">−</b> / 빈 자리 클릭 후 선수 선택으로도 됩니다.
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

              <div className="rounded-2xl border border-white/10 bg-[#12161D] p-5">
                <h2 className="mb-3 text-base font-bold text-gray-100">선수별 출전 요약</h2>
                <PlayerQuarterSummaryTable summary={plan.summary} members={allMembers} minGuaranteed={DEFAULT_BASE_RULES.minGuaranteedQuarters} />
              </div>

              <FormationWarnings plan={plan} />
            </>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#12161D] p-8 text-center">
              <p className="text-sm text-gray-500">
                <b className="text-gray-300">참여 인원</b>과 템플릿을 선택하고{" "}
                <b className="text-[#31ef76]">자동 배정 생성</b>을 누르세요.
              </p>
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
    <div className="mt-4 rounded-xl border border-dashed border-white/15 bg-white/5 p-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-400">이름</label>
          <input
            className="fm-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 풋살 2-2"
          />
        </div>
        {(
          [
            ["GK", gk, setGk],
            ["DF", df, setDf],
            ["MF", mf, setMf],
            ["FW", fw, setFw],
          ] as [string, number, (n: number) => void][]
        ).map(([label, val, setter]) => (
          <div key={label}>
            <label className="mb-1 block text-xs font-medium text-gray-400">{label}</label>
            <input
              className="fm-input"
              type="number"
              min={0}
              value={val}
              onChange={(e) => setter(Number(e.target.value))}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm text-gray-500">정원 {total}명</span>
        <button
          className="rounded-lg bg-[#31ef76] px-4 py-2 text-sm font-bold text-[#062313] hover:brightness-110"
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
        </button>
      </div>
    </div>
  );
}
