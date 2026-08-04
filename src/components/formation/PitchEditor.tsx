"use client";
import React, { useState } from "react";
import type { QuarterLineup, FormationTemplate } from "@/types/formation";
import type { Member, Position } from "@/types/member";
import { ELEVEN_GRID, gridZones, detailToGroup, type Group } from "@/lib/formation/positions";

/** 포지션 그룹별 강조 색 (2008/09 브로드캐스트 팔레트) */
const POS_TEXT: Record<Group, string> = {
  FW: "text-rose-400",
  MF: "text-lime-400",
  DF: "text-sky-400",
  GK: "text-yellow-300",
};

const LEGEND: { group: Group; label: string }[] = [
  { group: "FW", label: "공격수" },
  { group: "MF", label: "미드필더" },
  { group: "DF", label: "수비수" },
  { group: "GK", label: "골키퍼" },
];

/** 경기장 마킹 (페널티 박스/센터서클) — 원근 클립 내부에 그려짐 */
function PitchMarkings() {
  return (
    <div className="pointer-events-none absolute inset-[4%] border-2 border-white/60">
      <div className="absolute left-1/2 top-0 h-[16%] w-[34%] -translate-x-1/2 border-x-2 border-b-2 border-white/60" />
      <div className="absolute bottom-0 left-1/2 h-[16%] w-[34%] -translate-x-1/2 border-x-2 border-t-2 border-white/60" />
      <div className="absolute left-0 top-1/2 w-full border-t-2 border-white/60" />
      <div className="absolute left-1/2 top-1/2 aspect-square h-[21%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/60" />
      <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />
    </div>
  );
}

/** 등번호 유니폼 칩 (clip-path 저지) */
function JerseyChip({ number, name, gk }: { number: number; name: string; gk?: boolean }) {
  return (
    <div className={`jersey ${gk ? "jersey-gk" : ""}`}>
      <span className="absolute inset-x-0 top-[12px] z-10 text-center text-lg font-black leading-none text-white drop-shadow-[0_2px_1px_rgba(0,0,0,.95)]">
        {number}
      </span>
      <span className="absolute inset-x-0 bottom-[7px] z-10 truncate px-2 text-center text-[10px] font-black text-white drop-shadow-[0_2px_1px_rgba(0,0,0,.95)]">
        {name}
      </span>
    </div>
  );
}

/**
 * 자유 편집 포메이션 에디터(한 쿼터) — 2008/09 브로드캐스트 필드뷰.
 * - 11인제 전체 포지션 그리드 위에서 드래그앤드롭/클릭으로 자유 배치·교체
 * - 배치된 선수는 등번호 유니폼 칩(GK 초록), 빈 칸은 은은한 포지션 라벨
 * - 우측 '후보 명단' 패널로 드롭하면 후보로 이동
 */
export function PitchEditor({
  lineup,
  template,
  members,
  attendeeIds,
  onChange,
}: {
  lineup: QuarterLineup;
  template: FormationTemplate;
  members: Member[];
  attendeeIds: string[];
  onChange: (updated: QuarterLineup) => void;
}) {
  const [pickingZone, setPickingZone] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | "bench" | null>(null);
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? id;

  const zones = gridZones();
  const zoneByLabel = new Map(zones.map((z) => [z.label, z]));

  // 현재 배치 계산: 선수의 slot 라벨이 그리드 칸이면 그 칸에, 아니면 그룹의 빈 칸에
  const placement = new Map<string, string>(); // zoneLabel -> memberId
  const used = new Set<string>();
  lineup.players.forEach((p) => {
    if (p.slot && zoneByLabel.has(p.slot) && !placement.has(p.slot)) {
      placement.set(p.slot, p.memberId);
      used.add(p.memberId);
    }
  });
  lineup.players.forEach((p) => {
    if (used.has(p.memberId)) return;
    const g = (p.isGK ? "GK" : p.position) as Group;
    const zone = zones.find((z) => z.group === g && !placement.has(z.label)) ?? zones.find((z) => !placement.has(z.label));
    if (zone) {
      placement.set(zone.label, p.memberId);
      used.add(p.memberId);
    }
  });
  const memberAt = (label: string) => placement.get(label) ?? null;

  const onPitchIds = new Set(placement.values());
  const bench = attendeeIds.filter((id) => !onPitchIds.has(id));

  // 등번호: GK(1) → 수비 → 미드필더 → 공격 순, 각 줄 좌→우. 후보는 이어서 12, 13…
  const numberOf = new Map<string, number>();
  let no = 1;
  for (let ri = ELEVEN_GRID.length - 1; ri >= 0; ri--) {
    for (const label of ELEVEN_GRID[ri]) {
      const mid = placement.get(label);
      if (mid) numberOf.set(mid, no++);
    }
  }
  bench.forEach((id) => numberOf.set(id, no++));

  const groupOf = (id: string): Group => {
    for (const [label, mid] of placement) if (mid === id) return (detailToGroup(label) ?? "MF") as Group;
    const m = members.find((x) => x.id === id);
    return ((m?.preferredPosition ?? m?.positions.find((p) => p !== "ANY")) as Group) ?? "MF";
  };

  // 포메이션 이름 (예: "11인제 4-2-3-1 (11명)" → "4-2-3-1")
  const formationName = template.name.match(/\d+(?:-\d+)+/)?.[0] ?? template.name;

  /** 배치 맵 → 라인업 커밋 */
  const commit = (next: Map<string, string>) => {
    const players = [...next.entries()].map(([label, mid]) => ({
      memberId: mid,
      position: (detailToGroup(label) ?? "MF") as Position,
      isGK: label === "GK",
      slot: label,
    }));
    const on = new Set(players.map((p) => p.memberId));
    const rests = attendeeIds.filter((id) => !on.has(id));
    onChange({ ...lineup, players, rests });
  };

  /** 선수를 특정 칸에 배치(이동/교체) */
  const placeAt = (memberId: string, targetLabel: string) => {
    const copy = new Map(placement);
    let curLabel: string | null = null;
    for (const [l, m] of copy) if (m === memberId) curLabel = l;
    const occupant = copy.get(targetLabel);
    // 후보에서 빈 칸으로 들어올 때 정원 초과 방지
    if (curLabel === null && !occupant && onPitchIds.size >= template.playerCount) {
      alert(`이미 ${template.playerCount}명이 배치되어 있습니다. 먼저 다른 선수를 후보로 내려주세요.`);
      return;
    }
    if (curLabel) copy.delete(curLabel);
    copy.set(targetLabel, memberId);
    if (occupant && occupant !== memberId && curLabel) copy.set(curLabel, occupant); // 칸↔칸 교체
    commit(copy);
    setPickingZone(null);
  };

  const removeMember = (memberId: string) => {
    const copy = new Map(placement);
    for (const [l, m] of copy) if (m === memberId) copy.delete(l);
    commit(copy);
  };

  const placeFromBench = (memberId: string) => {
    if (pickingZone) return placeAt(memberId, pickingZone);
    const m = members.find((x) => x.id === memberId);
    const pref = (m?.preferredPosition ?? m?.positions.find((p) => p !== "ANY") ?? "MF") as Group;
    const zone = zones.find((z) => z.group === pref && !placement.has(z.label)) ?? zones.find((z) => !placement.has(z.label));
    if (zone) placeAt(memberId, zone.label);
  };

  // 드래그
  const onDragStart = (memberId: string) => (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", memberId);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDropZone = (label: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    setDragOver(null);
    if (id) placeAt(id, label);
  };
  const onDropBench = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    setDragOver(null);
    if (id) removeMember(id);
  };
  const allowDrop = (key: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragOver !== key) setDragOver(key);
  };

  return (
    <div className="retro-panel relative overflow-hidden rounded-md bg-[#020819] p-4 shadow-panel">
      {/* 상단 글로우 장식 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_50%_0%,rgba(86,135,255,.42),transparent_66%)]" />
      <div className="pointer-events-none absolute left-[13%] top-[5%] h-20 w-20 rounded-full bg-blue-200/15 blur-2xl" />
      <div className="pointer-events-none absolute right-[13%] top-[5%] h-20 w-20 rounded-full bg-blue-200/15 blur-2xl" />

      <div className="relative grid gap-4 xl:grid-cols-[1fr_190px]">
        {/* 필드 영역 */}
        <div className="relative">
          {/* 포메이션 카드 */}
          <div className="absolute left-0 top-0 z-30 rounded-sm border border-slate-400/70 bg-gradient-to-b from-[#18254b] to-[#030817] px-5 py-2.5 shadow-chrome">
            <div className="text-2xl font-black tracking-tight text-white">{formationName}</div>
            <div className="text-center text-xs text-slate-300">{lineup.quarter}쿼터 포메이션</div>
          </div>
          {/* 출전 카운터 */}
          <div className="absolute right-0 top-0 z-30 rounded-sm border border-slate-400/70 bg-gradient-to-b from-[#18254b] to-[#030817] px-4 py-2.5 text-right shadow-chrome">
            <div className="text-sm font-black text-white">
              출전 {onPitchIds.size}
              <span className="text-slate-400">/{template.playerCount}</span>
            </div>
            <div className="text-[10px] text-slate-400">후보 {bench.length}명</div>
          </div>

          {/* 원근 잔디 필드 */}
          <div className="relative min-h-[640px]">
            <div className="pitch-grid absolute inset-0 overflow-hidden border border-white/45 shadow-[0_0_28px_rgba(74,135,255,.18)] [clip-path:polygon(14%_0,86%_0,100%_100%,0_100%)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,transparent,rgba(0,0,0,.42)_82%)]" />
              <PitchMarkings />
            </div>

            {/* 포지션 그리드 (드래그앤드롭) */}
            <div className="relative z-10 flex h-full min-h-[640px] flex-col justify-between gap-1 px-[5%] pb-5 pt-[74px]">
              {ELEVEN_GRID.map((row, ri) => (
                <div key={ri} className="flex items-end justify-around gap-1">
                  {row.map((label) => {
                    const memberId = memberAt(label);
                    const selecting = pickingZone === label;
                    const over = dragOver === label;
                    if (memberId) {
                      const g = (detailToGroup(label) ?? "MF") as Group;
                      return (
                        <div
                          key={label}
                          draggable
                          onDragStart={onDragStart(memberId)}
                          onDragOver={allowDrop(label)}
                          onDrop={onDropZone(label)}
                          className={`relative flex cursor-grab flex-col items-center transition duration-200 active:cursor-grabbing ${
                            over ? "z-30 scale-110" : "hover:z-30 hover:scale-105"
                          }`}
                          title={`${nameOf(memberId)} (${label})`}
                        >
                          <button
                            onClick={() => removeMember(memberId)}
                            className="absolute -top-1.5 right-0 z-20 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white opacity-80 shadow hover:opacity-100"
                            aria-label="후보로 내리기"
                            title="후보로 내리기"
                          >
                            −
                          </button>
                          <span className="text-[8px] font-black text-white/60 drop-shadow-[0_1px_1px_rgba(0,0,0,.9)]">
                            {label}
                          </span>
                          <JerseyChip number={numberOf.get(memberId) ?? 0} name={nameOf(memberId)} gk={label === "GK"} />
                          <span
                            className={`-mt-1 text-[11px] font-black drop-shadow-[0_2px_1px_rgba(0,0,0,.95)] ${POS_TEXT[g]}`}
                          >
                            {g}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <button
                        key={label}
                        onClick={() => setPickingZone(selecting ? null : label)}
                        onDragOver={allowDrop(label)}
                        onDrop={onDropZone(label)}
                        className={`flex h-7 w-14 items-center justify-center rounded-full text-[9px] font-black transition ${
                          selecting || over
                            ? "bg-yellow-300 text-slate-900 ring-2 ring-yellow-400"
                            : "border border-dashed border-white/30 bg-black/20 text-white/50 hover:bg-black/40 hover:text-white/80"
                        }`}
                        title="이 자리에 선수 넣기 (드롭/클릭)"
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* 범례 */}
          <div className="mx-auto mt-2 grid max-w-xl grid-cols-4 rounded-sm border border-white/10 bg-black/55 px-4 py-2 text-center text-xs font-black backdrop-blur sm:text-sm">
            {LEGEND.map(({ group, label }) => (
              <span key={group} className="text-white/80">
                <b className={POS_TEXT[group]}>{group}</b> {label}
              </span>
            ))}
          </div>
        </div>

        {/* 후보 명단 */}
        <aside
          onDragOver={allowDrop("bench")}
          onDrop={onDropBench}
          className={`retro-panel relative z-20 h-fit rounded-sm p-3 xl:mt-10 ${
            dragOver === "bench" ? "ring-2 ring-rose-400" : ""
          }`}
        >
          <h3 className="border-b border-slate-400/40 pb-2.5 text-center text-lg font-black text-white">후보 명단</h3>
          {pickingZone && (
            <p className="mt-2 rounded-sm border border-amber-400/40 bg-amber-500/10 px-2 py-1 text-center text-[10px] font-black text-yellow-300">
              {pickingZone} 자리에 넣을 선수 선택
            </p>
          )}
          <div className="mt-3 space-y-2.5">
            {bench.length === 0 ? (
              <p className="py-3 text-center text-xs text-slate-500">대기 중인 선수가 없습니다</p>
            ) : (
              bench.map((id) => {
                const g = groupOf(id);
                return (
                  <button
                    key={id}
                    draggable
                    onDragStart={onDragStart(id)}
                    onClick={() => placeFromBench(id)}
                    className="flex w-full cursor-grab items-center gap-3 rounded-sm border border-slate-400/35 bg-black/30 p-2.5 text-left hover:bg-white/5 active:cursor-grabbing"
                    title="필드로 드래그하거나 클릭해서 넣기"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-slate-400/50 bg-gradient-to-b from-[#1b2c57] to-[#040817] text-lg font-black text-white">
                      {numberOf.get(id)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-white">{nameOf(id)}</div>
                      <div className={`text-xs font-black ${POS_TEXT[g]}`}>{g}</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <p className="mt-3 border-t border-white/10 pt-2 text-[10px] leading-relaxed text-slate-500">
            선수를 여기로 드롭하면 후보로 내려갑니다
          </p>
        </aside>
      </div>
    </div>
  );
}
