"use client";
import React, { useMemo, useState, useEffect } from "react";
import { useAppStore } from "@/lib/store/AppStore";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select, TextInput, FormRow } from "@/components/ui/Field";
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

  const savePlan = () => {
    if (!match || !plan) return;
    upsertMatch({ ...match, formationPlan: plan });
    alert("이 경기에 포메이션을 저장했습니다.");
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-gray-800">포메이션 자동 배정</h1>

      {/* 설정 */}
      <Card>
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
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          {/* 자체전 팀 빠른 선택 */}
          <div className="mb-2 flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2">
            <span className="text-xs font-semibold text-gray-500">자체전 팀</span>
            <button
              onClick={() => loadTeam("WHITE")}
              className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-200"
            >
              🤍 화이트 {teamCount("WHITE")}
            </button>
            <button
              onClick={() => loadTeam("BLACK")}
              className="rounded-full bg-gray-800 px-3 py-1 text-xs font-semibold text-white hover:bg-black"
            >
              🖤 블랙 {teamCount("BLACK")}
            </button>
            <button
              onClick={() => setTeamModalOpen(true)}
              className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-white"
            >
              ✎ 팀 편집
            </button>
            <span className="text-[11px] text-gray-400">팀 버튼을 누르면 해당 팀 명단으로 참여 인원이 채워집니다.</span>
          </div>

          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-gray-700">
              참여 인원 <span className="text-brand-600">{attendees.length}명</span>
              <span className="ml-1 text-xs text-gray-400">· 기준 정원 {template?.playerCount ?? "-"}명</span>
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setPickerOpen(true)}>
                참여 인원 선택
              </Button>
              <Button variant="secondary" onClick={() => setGuestOpen(true)}>
                + 용병 추가
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
              <b>참여 인원 선택</b>을 눌러 오늘 출전할 선수를 직접 고르세요.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {attendees.map((m) => (
                <span
                  key={m.id}
                  className="flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs text-gray-700 shadow-sm"
                >
                  {m.isCoach && <span title="감독">⭐</span>}
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
      </Card>

      <div className={`grid grid-cols-1 gap-4 ${FEATURES.aiChat ? "xl:grid-cols-3" : ""}`}>
        {/* 좌측: 포메이션 결과 */}
        <div className={`space-y-4 ${FEATURES.aiChat ? "xl:col-span-2" : ""}`}>
          {plan ? (
            <>
              <SectionTitle
                action={
                  <div className="flex flex-wrap gap-2">
                    {/* 보기 모드 토글 */}
                    <div className="flex overflow-hidden rounded-lg border border-gray-300 text-sm">
                      <button
                        onClick={() => setViewMode("pitch")}
                        className={`px-3 py-1.5 ${viewMode === "pitch" ? "bg-brand-600 text-white" : "bg-white text-gray-600"}`}
                      >
                        필드뷰
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={`px-3 py-1.5 ${viewMode === "list" ? "bg-brand-600 text-white" : "bg-white text-gray-600"}`}
                      >
                        리스트 수정
                      </button>
                    </div>
                    <Button variant="secondary" onClick={() => generate()}>
                      다시 실행
                    </Button>
                    <Button variant="secondary" onClick={() => exportFormationToExcel(plan, allMembers)}>
                      엑셀
                    </Button>
                    <Button onClick={savePlan}>경기에 저장</Button>
                  </div>
                }
              >
                쿼터별 라인업
              </SectionTitle>

              {viewMode === "pitch" ? (
                <div className="mx-auto w-full max-w-lg space-y-3">
                  {/* 쿼터 탭 */}
                  <div className="grid grid-cols-4 gap-1">
                    {plan.quarters.map((q) => (
                      <button
                        key={q.quarter}
                        onClick={() => setActiveQuarter(q.quarter)}
                        className={`flex flex-col items-center rounded-lg px-2 py-2 text-sm ${
                          activeQuarter === q.quarter
                            ? "bg-brand-600 text-white"
                            : "bg-white text-gray-600 ring-1 ring-gray-200"
                        }`}
                      >
                        <span className="font-bold">{q.quarter}쿼터</span>
                        <span className="text-xs opacity-80">{q.players.length}명</span>
                      </button>
                    ))}
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
                  <p className="text-xs text-gray-400">
                    ※ <b>드래그 앤 드롭</b>으로 선수를 옮기거나(겹치면 교체) <b>출전 가능</b> 영역으로 끌어 벤치로 내릴 수 있습니다.
                    모바일에서는 <b className="text-red-500">−</b> / 빈 자리 클릭 후 선수 선택으로도 됩니다.
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
                    />
                  ))}
                </div>
              )}

              <Card>
                <SectionTitle>선수별 출전 요약</SectionTitle>
                <PlayerQuarterSummaryTable summary={plan.summary} members={allMembers} minGuaranteed={DEFAULT_BASE_RULES.minGuaranteedQuarters} />
              </Card>

              <FormationWarnings plan={plan} />
            </>
          ) : (
            <Card>
              <p className="text-sm text-gray-400">
                <b>참여 인원</b>과 템플릿을 선택하고 <b>자동 배정 생성</b>을 누르세요.
              </p>
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
    <div className="mt-3 rounded-lg border border-dashed border-gray-300 p-3">
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
      <div className="mt-2 flex items-center justify-between">
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
