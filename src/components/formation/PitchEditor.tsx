"use client";
import React, { useState } from "react";
import type { QuarterLineup, FormationTemplate } from "@/types/formation";
import type { Member, Position } from "@/types/member";
import { ELEVEN_GRID, gridZones, detailToGroup, type Group } from "@/lib/formation/positions";

/** 포지션 그룹별 강조 색 (다크 필드 위 텍스트) */
const POS_TEXT: Record<Group, string> = {
  FW: "text-pink-400",
  MF: "text-green-400",
  DF: "text-sky-400",
  GK: "text-emerald-300",
};

const LEGEND: { group: Group; label: string }[] = [
  { group: "FW", label: "공격수" },
  { group: "MF", label: "미드필더" },
  { group: "DF", label: "수비수" },
  { group: "GK", label: "골키퍼" },
];

/** 유니폼(저지) 모양 + 등번호 */
function Jersey({ number, gk }: { number: number; gk?: boolean }) {
  const gradId = gk ? "hsJerseyGk" : "hsJerseyField";
  return (
    <svg viewBox="0 0 64 60" className="h-12 w-14 drop-shadow-[0_4px_6px_rgba(0,0,0,0.45)]">
      <defs>
        <linearGradient id="hsJerseyField" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#443c80" />
          <stop offset="100%" stopColor="#241f4d" />
        </linearGradient>
        <linearGradient id="hsJerseyGk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
      </defs>
      <path
        d="M21 4 L9 12 L15 24 L20 21 L20 56 L44 56 L44 21 L49 24 L55 12 L43 4 C39 10 25 10 21 4 Z"
        fill={`url(#${gradId})`}
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.5"
      />
      <text x="32" y="41" textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff">
        {number}
      </text>
    </svg>
  );
}

/** 원근감 있는 경기장 라인 */
function PitchLines() {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
      <g stroke="rgba(255,255,255,0.14)" strokeWidth="0.35" fill="none" vectorEffect="non-scaling-stroke">
        {/* 외곽 (아래가 넓은 사다리꼴) */}
        <polygon points="18,3 82,3 98,98 2,98" />
        {/* 하프라인 + 센터서클 */}
        <line x1="10.2" y1="51" x2="89.8" y2="51" />
        <ellipse cx="50" cy="51" rx="11" ry="6.5" />
        {/* 상단 페널티/골 에어리어 */}
        <polyline points="33,3 31.5,14 68.5,14 67,3" />
        <polyline points="41,3 40.4,8.5 59.6,8.5 59,3" />
        {/* 하단 페널티/골 에어리어 + 아크 */}
        <polyline points="28.5,98 31,76 69,76 71.5,98" />
        <polyline points="39,98 40,87 60,87 61,98" />
        <path d="M43,76 C45,71.5 55,71.5 57,76" />
      </g>
    </svg>
  );
}

/**
 * 자유 편집 포메이션 에디터(한 쿼터) — 다크 스타디움 필드뷰.
 * - 11인제 전체 포지션 그리드 위에서 드래그앤드롭/클릭으로 자유 배치·교체
 * - 배치된 선수는 등번호 유니폼 칩, 빈 칸은 은은한 포지션 라벨
 * - 우측 '후보 명단' 패널로 드롭하면 벤치로 이동
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

  // 등번호: GK(1) → 수비 → 미드필더 → 공격 순, 각 줄 좌→우. 벤치는 이어서 12, 13…
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
    // 벤치에서 빈 칸으로 들어올 때 정원 초과 방지
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
    <div
      className="overflow-hidden rounded-2xl shadow-[0_8px_30px_rgba(20,15,60,0.35)] ring-1 ring-black/20"
      style={{ background: "radial-gradient(120% 90% at 50% 0%, #2c2a5c 0%, #1b1a3d 45%, #111027 100%)" }}
    >
      {/* 상단: 포메이션 카드 + 출전 요약 */}
      <div className="flex items-start justify-between gap-2 px-3 pt-3 sm:px-4">
        <div className="rounded-xl bg-white/[0.07] px-4 py-2 ring-1 ring-white/10 backdrop-blur">
          <div className="text-lg font-extrabold leading-tight text-white">{formationName}</div>
          <div className="text-[10px] font-medium text-white/50">{lineup.quarter}쿼터 포메이션</div>
        </div>
        <div className="rounded-xl bg-white/[0.07] px-3 py-2 text-right ring-1 ring-white/10 backdrop-blur">
          <div className="text-sm font-bold text-white">
            출전 {onPitchIds.size}
            <span className="text-white/40">/{template.playerCount}</span>
          </div>
          <div className="text-[10px] text-white/50">후보 {bench.length}명</div>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:p-4">
        {/* 필드 */}
        <div className="relative min-h-[540px] flex-1">
          <PitchLines />
          <div className="relative z-10 flex h-full min-h-[540px] flex-col justify-between gap-1 px-1 py-4">
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
                        className={`group relative flex w-[4.2rem] cursor-grab flex-col items-center active:cursor-grabbing ${
                          over ? "scale-110" : ""
                        } transition-transform`}
                        title={`${nameOf(memberId)} (${label})`}
                      >
                        <button
                          onClick={() => removeMember(memberId)}
                          className="absolute -top-1 right-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white opacity-70 shadow hover:opacity-100"
                          aria-label="후보로 내리기"
                          title="후보로 내리기"
                        >
                          −
                        </button>
                        <span className="text-[8px] font-semibold text-white/35">{label}</span>
                        <Jersey number={numberOf.get(memberId) ?? 0} gk={label === "GK"} />
                        <span
                          className={`-mt-0.5 max-w-[4.5rem] truncate text-[11px] font-bold text-white drop-shadow ${
                            over ? "text-yellow-300" : ""
                          }`}
                        >
                          {nameOf(memberId)}
                        </span>
                        <span className={`text-[9px] font-extrabold ${POS_TEXT[label === "GK" ? "GK" : g]}`}>
                          {label === "GK" ? "GK" : g}
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
                      className={`flex h-7 w-[3.4rem] items-center justify-center rounded-full text-[9px] font-semibold transition ${
                        selecting || over
                          ? "bg-yellow-300 text-gray-900 ring-2 ring-yellow-400"
                          : "border border-dashed border-white/15 bg-white/[0.04] text-white/35 hover:bg-white/10 hover:text-white/60"
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

        {/* 후보 명단 */}
        <div
          onDragOver={allowDrop("bench")}
          onDrop={onDropBench}
          className={`w-full shrink-0 self-start rounded-xl p-3 ring-1 backdrop-blur sm:w-44 ${
            dragOver === "bench" ? "bg-red-500/20 ring-red-400" : "bg-white/[0.06] ring-white/10"
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold text-white">후보 명단</span>
            <span className="text-[10px] text-white/40">{bench.length}명</span>
          </div>
          {pickingZone && (
            <p className="mb-2 rounded-lg bg-yellow-300/20 px-2 py-1 text-[10px] font-semibold text-yellow-200">
              {pickingZone} 자리에 넣을 선수를 선택하세요
            </p>
          )}
          {bench.length === 0 ? (
            <p className="py-3 text-center text-xs text-white/35">대기 중인 선수가 없습니다</p>
          ) : (
            <div className="flex flex-row flex-wrap gap-1.5 sm:flex-col">
              {bench.map((id) => {
                const g = groupOf(id);
                return (
                  <button
                    key={id}
                    draggable
                    onDragStart={onDragStart(id)}
                    onClick={() => placeFromBench(id)}
                    className="flex cursor-grab items-center gap-2 rounded-lg bg-white/[0.07] px-2 py-1.5 text-left ring-1 ring-white/10 hover:bg-white/15 active:cursor-grabbing sm:w-full"
                    title="필드로 드래그하거나 클릭해서 넣기"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/10 text-sm font-extrabold text-white">
                      {numberOf.get(id)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold text-white">{nameOf(id)}</span>
                      <span className={`block text-[9px] font-extrabold ${POS_TEXT[g]}`}>{g}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <p className="mt-2 hidden text-[10px] leading-relaxed text-white/30 sm:block">
            선수를 여기로 드롭하면 후보로 내려갑니다
          </p>
        </div>
      </div>

      {/* 범례 */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 border-t border-white/10 px-3 py-2.5">
        {LEGEND.map(({ group, label }) => (
          <span key={group} className="flex items-center gap-1.5 text-[11px]">
            <span className={`font-extrabold ${POS_TEXT[group]}`}>{group}</span>
            <span className="text-white/60">{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
