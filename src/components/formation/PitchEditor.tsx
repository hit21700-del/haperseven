"use client";
import React, { useState } from "react";
import type { QuarterLineup, FormationTemplate } from "@/types/formation";
import type { Member, Position } from "@/types/member";
import { PositionBadge } from "@/components/ui/Badge";
import { ELEVEN_GRID, gridZones, detailToGroup, type Group } from "@/lib/formation/positions";

/**
 * 자유 편집 포메이션 에디터(한 쿼터).
 * - 11인제 전체 포지션 그리드(LS/CF/LAM/CDM/SW…) 위에서 드래그앤드롭으로 자유 배치/교체
 * - 빈 칸은 포지션 라벨, 채워진 칸은 선수 칩(− 로 벤치)
 * - 모바일: 칩 − / 빈 칸 클릭 후 벤치 선수 선택
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
      alert(`이미 ${template.playerCount}명이 배치되어 있습니다. 먼저 다른 선수를 벤치로 내려주세요.`);
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
    <div className="overflow-hidden rounded-xl border border-green-700 shadow-sm">
      <div className="flex items-center justify-between bg-green-800 px-3 py-1.5">
        <span className="rounded-full bg-white px-3 py-0.5 text-sm font-bold text-green-800">{lineup.quarter}쿼터</span>
        <span className="text-xs text-green-100">
          출전 {onPitchIds.size}/{template.playerCount}명 · 휴식 {bench.length}명
        </span>
      </div>

      {/* 필드 (전체 포지션 그리드) */}
      <div
        className="relative flex flex-col justify-between gap-1 px-1.5 py-3"
        style={{
          minHeight: 520,
          background:
            "repeating-linear-gradient(180deg, #16a34a 0px, #16a34a 44px, #15a049 44px, #15a049 88px)",
        }}
      >
        <div className="pointer-events-none absolute inset-2 rounded-md border-2 border-white/30" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30" />

        {ELEVEN_GRID.map((row, ri) => (
          <div key={ri} className="relative z-10 flex items-center justify-around gap-1 py-0.5">
            {row.map((label) => {
              const memberId = memberAt(label);
              const selecting = pickingZone === label;
              const over = dragOver === label;
              if (memberId) {
                return (
                  <div
                    key={label}
                    draggable
                    onDragStart={onDragStart(memberId)}
                    onDragOver={allowDrop(label)}
                    onDrop={onDropZone(label)}
                    className={`relative flex w-[3.6rem] cursor-grab flex-col items-center active:cursor-grabbing ${over ? "scale-105" : ""}`}
                  >
                    <button
                      onClick={() => removeMember(memberId)}
                      className="absolute -top-1 left-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow"
                      aria-label="제외"
                      title="벤치로 내리기"
                    >
                      −
                    </button>
                    <span className="z-10 -mb-1 rounded bg-white px-1 text-[8px] font-bold leading-tight text-gray-600 shadow-sm">
                      {label}
                    </span>
                    <span
                      className={`w-full truncate rounded-full px-1.5 py-1 text-center text-[10px] font-semibold text-white ${over ? "bg-brand-600 ring-2 ring-white" : "bg-gray-900"}`}
                      title={`${nameOf(memberId)} (${label})`}
                    >
                      {nameOf(memberId)}
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
                  className={`w-[3.6rem] truncate rounded-full px-1.5 py-1 text-center text-[10px] font-semibold ${
                    selecting || over
                      ? "bg-yellow-300 text-gray-800 ring-2 ring-yellow-500"
                      : "bg-green-200/70 text-green-900"
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

      {/* 출전 가능(벤치) */}
      <div
        onDragOver={allowDrop("bench")}
        onDrop={onDropBench}
        className={`px-3 py-2 ${dragOver === "bench" ? "bg-red-50 ring-2 ring-inset ring-red-300" : "bg-gray-50"}`}
      >
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">출전 가능</span>
          <span className="text-xs text-gray-400">
            {pickingZone ? `${pickingZone} 자리에 넣을 선수 선택` : `${bench.length}명 · 여기로 드롭하면 벤치로`}
          </span>
        </div>
        {bench.length === 0 ? (
          <p className="text-xs text-gray-400">벤치에 대기 중인 선수가 없습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {bench.map((id) => {
              const m = members.find((x) => x.id === id);
              return (
                <button
                  key={id}
                  draggable
                  onDragStart={onDragStart(id)}
                  onClick={() => placeFromBench(id)}
                  className="flex cursor-grab items-center gap-1 rounded-full border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:border-brand-500 hover:bg-brand-50 active:cursor-grabbing"
                  title="필드로 드래그하거나 클릭해서 넣기"
                >
                  {m && <PositionBadge position={m.preferredPosition ?? m.positions[0] ?? "ANY"} />}
                  {nameOf(id)}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
