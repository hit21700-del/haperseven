"use client";
import React, { useRef, useState } from "react";
import type { QuarterLineup, FormationTemplate } from "@/types/formation";
import type { Member, Position } from "@/types/member";
import { ELEVEN_GRID, gridZones, detailToGroup, type Group } from "@/lib/formation/positions";

/* ────────────────────────────────────────────────────────────
   포지션 컬러 (FC24 팔레트)
   ──────────────────────────────────────────────────────────── */
const POS_HEX: Record<Group, string> = {
  FW: "#ff5666",
  MF: "#31ef76",
  DF: "#45a1ff",
  GK: "#ffc928",
};

const LEGEND: { group: Group; label: string }[] = [
  { group: "FW", label: "공격수" },
  { group: "MF", label: "미드필더" },
  { group: "DF", label: "수비수" },
  { group: "GK", label: "골키퍼" },
];

/* 그리드 슬롯 → 경기장 % 좌표 (x: 0~100 좌→우, y: 0~100 위=상대 골대) */
const SLOT_POS: Record<string, { x: number; y: number }> = {
  LW: { x: 14, y: 9 }, LS: { x: 32, y: 9 }, CF: { x: 50, y: 9 }, RS: { x: 68, y: 9 }, RW: { x: 86, y: 9 },
  LAM: { x: 26, y: 26 }, CAM: { x: 50, y: 26 }, RAM: { x: 74, y: 26 },
  LM: { x: 12, y: 43 }, LCM: { x: 31, y: 43 }, CM: { x: 50, y: 43 }, RCM: { x: 69, y: 43 }, RM: { x: 88, y: 43 },
  LWB: { x: 12, y: 60 }, LDM: { x: 31, y: 60 }, CDM: { x: 50, y: 60 }, RDM: { x: 69, y: 60 }, RWB: { x: 88, y: 60 },
  LB: { x: 13, y: 77 }, LCB: { x: 31.5, y: 77 }, CB: { x: 50, y: 77 }, RCB: { x: 68.5, y: 77 }, RB: { x: 87, y: 77 },
  GK: { x: 50, y: 93 },
};

/** 사다리꼴 원근(위가 좁음)에 맞춰 x 좌표 보정 */
const xAdj = (x: number, y: number) => 50 + (x - 50) * (0.8 + 0.2 * (y / 100));

/* ────────────────────────────────────────────────────────────
   경기장 마킹 (센터라인/서클/페널티박스/골에어리어/아크)
   ──────────────────────────────────────────────────────────── */
function PitchMarkings() {
  return (
    <div className="pointer-events-none absolute inset-[3.5%] border border-white/25">
      {/* 상단 페널티박스 + 골에어리어 + 아크 */}
      <div className="absolute left-1/2 top-0 h-[15%] w-[46%] -translate-x-1/2 border-x border-b border-white/25" />
      <div className="absolute left-1/2 top-0 h-[6.5%] w-[22%] -translate-x-1/2 border-x border-b border-white/25" />
      <div className="absolute left-1/2 top-[15%] h-[5%] w-[14%] -translate-x-1/2 overflow-hidden">
        <div className="absolute -top-[100%] h-[200%] w-full rounded-full border border-white/25" />
      </div>
      {/* 하단 페널티박스 + 골에어리어 + 아크 */}
      <div className="absolute bottom-0 left-1/2 h-[15%] w-[46%] -translate-x-1/2 border-x border-t border-white/25" />
      <div className="absolute bottom-0 left-1/2 h-[6.5%] w-[22%] -translate-x-1/2 border-x border-t border-white/25" />
      <div className="absolute bottom-[15%] left-1/2 h-[5%] w-[14%] -translate-x-1/2 overflow-hidden">
        <div className="absolute -bottom-[100%] h-[200%] w-full rounded-full border border-white/25" />
      </div>
      {/* 센터라인 + 센터서클 */}
      <div className="absolute left-0 top-1/2 w-full border-t border-white/25" />
      <div className="absolute left-1/2 top-1/2 aspect-square h-[18%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
      <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40" />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   유니폼 칩 (등번호 + 이름 + 포지션)
   ──────────────────────────────────────────────────────────── */
function PlayerJersey({
  number,
  name,
  slot,
  gk,
}: {
  number: number;
  name: string;
  slot: string;
  gk?: boolean;
}) {
  const group = gk ? "GK" : ((detailToGroup(slot) ?? "MF") as Group);
  return (
    <div className="flex flex-col items-center">
      <div className={`fm-jersey ${gk ? "fm-jersey-gk" : ""}`}>
        <span
          className={`absolute inset-0 z-10 flex items-center justify-center pt-1 text-[22px] font-extrabold leading-none ${
            gk ? "text-[#241a00]" : "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,.9)]"
          }`}
        >
          {number}
        </span>
      </div>
      {/* 이름표 — 캡처 공유 시에도 읽히도록 크게 */}
      <span className="z-10 -mt-1.5 whitespace-nowrap rounded-md border border-white/10 bg-[#04070B]/90 px-2.5 py-0.5 text-[15px] font-bold leading-tight text-white shadow-[0_2px_6px_rgba(0,0,0,.5)] sm:text-base">
        {name}
      </span>
      <span
        className="mt-0.5 text-[11px] font-extrabold drop-shadow-[0_1px_1px_rgba(0,0,0,.9)]"
        style={{ color: POS_HEX[group] }}
      >
        {slot}
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   드래그 상태
   ──────────────────────────────────────────────────────────── */
type DragState = {
  id: string;
  from: "pitch" | "bench";
  x: number; // 경기장 기준 %
  y: number;
  moved: boolean;
  startCX: number;
  startCY: number;
  hover: string | null; // 드롭 예상 슬롯
  overBench: boolean;
};

/**
 * FC24 스타일 전술 보드 (한 쿼터).
 * - 선수는 % 좌표 기반 절대 배치, Pointer Event 드래그로 이동/교체
 * - 후보 명단은 우측 사이드바, 드롭하면 후보로 이동
 * - 빈 슬롯 탭 → 후보 탭으로도 배치 가능 (모바일 폴백)
 * 슬롯(포지션) 데이터 모델과 자동 배정 로직은 기존 그대로 유지한다.
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
  const pitchRef = useRef<HTMLDivElement>(null);
  const benchRef = useRef<HTMLDivElement>(null);
  const [pickingZone, setPickingZone] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? id;

  const zones = gridZones();
  const zoneByLabel = new Map(zones.map((z) => [z.label, z]));

  // 현재 배치 계산: slot 라벨이 그리드 칸이면 그 칸에, 아니면 그룹의 빈 칸에
  const placement = new Map<string, string>(); // slotLabel -> memberId
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

  const onPitchIds = new Set(placement.values());
  const bench = attendeeIds.filter((id) => !onPitchIds.has(id));

  // 등번호: GK(1) → 수비 → 미드필더 → 공격 순, 각 줄 좌→우. 후보는 12, 13…
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

  const formationName = template.name.match(/\d+(?:-\d+)+/)?.[0] ?? template.name;

  /* ── 라인업 커밋 (슬롯 → 포지션/GK 매핑은 기존 로직 그대로) ── */
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

  const placeAt = (memberId: string, targetLabel: string) => {
    const copy = new Map(placement);
    let curLabel: string | null = null;
    for (const [l, m] of copy) if (m === memberId) curLabel = l;
    const occupant = copy.get(targetLabel);
    if (curLabel === null && !occupant && onPitchIds.size >= template.playerCount) {
      alert(`이미 ${template.playerCount}명이 배치되어 있습니다. 먼저 다른 선수를 후보로 내려주세요.`);
      return;
    }
    if (curLabel) copy.delete(curLabel);
    copy.set(targetLabel, memberId);
    if (occupant && occupant !== memberId && curLabel) copy.set(curLabel, occupant); // 자리 교체
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

  /* ── Pointer Event 드래그 ── */
  const pctOf = (e: { clientX: number; clientY: number }) => {
    const rect = pitchRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const nearestSlot = (x: number, y: number): string | null => {
    let best: string | null = null;
    let bestDist = Infinity;
    for (const z of zones) {
      const p = SLOT_POS[z.label];
      if (!p) continue;
      const dx = xAdj(p.x, p.y) - x;
      const dy = p.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        best = z.label;
      }
    }
    return bestDist <= 20 * 20 ? best : null;
  };

  const inBench = (cx: number, cy: number) => {
    const r = benchRef.current?.getBoundingClientRect();
    return !!r && cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
  };

  const startDrag = (id: string, from: "pitch" | "bench") => (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const { x, y } = pctOf(e);
    setDrag({ id, from, x, y, moved: false, startCX: e.clientX, startCY: e.clientY, hover: null, overBench: false });
  };

  const moveDrag = (e: React.PointerEvent) => {
    if (!drag) return;
    e.preventDefault();
    const { x, y } = pctOf(e);
    const cx = Math.min(98, Math.max(2, x));
    const cy = Math.min(97, Math.max(3, y));
    const moved = drag.moved || Math.abs(e.clientX - drag.startCX) + Math.abs(e.clientY - drag.startCY) > 6;
    const inside = x >= -2 && x <= 102 && y >= -2 && y <= 102;
    setDrag({
      ...drag,
      x: cx,
      y: cy,
      moved,
      hover: inside ? nearestSlot(cx, cy) : null,
      overBench: inBench(e.clientX, e.clientY),
    });
  };

  const endDrag = () => {
    if (!drag) return;
    const d = drag;
    setDrag(null);
    if (!d.moved) {
      if (d.from === "bench") placeFromBench(d.id); // 탭 = 자동 배치
      return;
    }
    if (d.overBench) {
      if (d.from === "pitch") removeMember(d.id);
      return;
    }
    if (d.hover) placeAt(d.id, d.hover);
    // 그 외: 원래 자리로 스냅백 (상태 변경 없음)
  };

  const dragging = (id: string) => drag?.id === id && drag.moved;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0B1117] p-4 sm:p-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_230px]">
        {/* ── 필드 영역 ── */}
        <div className="min-w-0">
          {/* 상단 정보 */}
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-gray-100">{formationName}</span>
              <span className="text-xs font-semibold text-[#20E878]">{lineup.quarter}쿼터</span>
            </div>
            <div className="text-sm text-gray-500">
              출전 <b className="text-gray-100">{onPitchIds.size}</b>/{template.playerCount} · 후보{" "}
              <b className="text-gray-300">{bench.length}</b>명
            </div>
          </div>

          {/* 경기장 */}
          <div
            ref={pitchRef}
            className="relative h-[640px] touch-none select-none overflow-hidden rounded-xl bg-[#0B1117] sm:h-[720px]"
          >
            {/* 스타디움 분위기 (어두운 외곽 + 아주 약한 그린 톤) */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(ellipse_at_50%_0%,rgba(32,232,120,.05),transparent_70%)]" />
            {/* 잔디 (약한 원근 사다리꼴) */}
            <div className="fm-pitch absolute inset-x-0 bottom-2 top-3 [clip-path:polygon(9%_0,91%_0,100%_100%,0_100%)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,transparent,rgba(0,0,0,.4)_85%)]" />
              <PitchMarkings />
            </div>

            {/* 빈 슬롯 마커 */}
            {zones.map((z) => {
              const p = SLOT_POS[z.label];
              if (!p || placement.has(z.label)) return null;
              const active = pickingZone === z.label || drag?.hover === z.label;
              return (
                <button
                  key={z.label}
                  onClick={() => setPickingZone(pickingZone === z.label ? null : z.label)}
                  className={`export-hide absolute z-10 flex h-7 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md text-[9px] font-bold transition ${
                    active
                      ? "bg-[#20E878] text-[#062313]"
                      : "border border-dashed border-white/15 bg-black/25 text-white/35 hover:bg-black/40 hover:text-white/60"
                  }`}
                  style={{ left: `${xAdj(p.x, p.y)}%`, top: `${p.y}%` }}
                  title="이 자리에 선수 넣기"
                >
                  {z.label}
                </button>
              );
            })}

            {/* 배치된 선수 */}
            {[...placement.entries()].map(([label, mid]) => {
              const p = SLOT_POS[label];
              if (!p) return null;
              const isDragging = dragging(mid);
              const x = isDragging ? drag!.x : xAdj(p.x, p.y);
              const y = isDragging ? drag!.y : p.y;
              const targeted = drag && drag.id !== mid && drag.hover === label; // 교체 대상
              return (
                <div
                  key={mid}
                  onPointerDown={startDrag(mid, "pitch")}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={() => setDrag(null)}
                  className={`group absolute -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none active:cursor-grabbing ${
                    isDragging
                      ? "z-40 scale-110 opacity-95"
                      : targeted
                        ? "z-30 scale-110"
                        : "z-20 transition-transform duration-150 hover:scale-105"
                  }`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  title={`${nameOf(mid)} (${label})`}
                >
                  {!isDragging && (
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => removeMember(mid)}
                      className="export-hide absolute -right-1 -top-1 z-30 flex h-5 w-5 items-center justify-center rounded-full bg-[#ff5666] text-xs font-bold text-white opacity-60 shadow transition-opacity hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-80"
                      aria-label="후보로 내리기"
                      title="후보로 내리기"
                    >
                      −
                    </button>
                  )}
                  <PlayerJersey number={numberOf.get(mid) ?? 0} name={nameOf(mid)} slot={label} gk={label === "GK"} />
                </div>
              );
            })}

            {/* 후보에서 끌어오는 중인 선수 */}
            {drag && drag.from === "bench" && drag.moved && (
              <div
                className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2 scale-110 opacity-95"
                style={{ left: `${drag.x}%`, top: `${drag.y}%` }}
              >
                <PlayerJersey
                  number={numberOf.get(drag.id) ?? 0}
                  name={nameOf(drag.id)}
                  slot={drag.hover ?? groupOf(drag.id)}
                  gk={drag.hover === "GK"}
                />
              </div>
            )}
          </div>

          {/* 범례 */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs">
            {LEGEND.map(({ group, label }) => (
              <span key={group} className="flex items-center gap-1.5 text-gray-500">
                <b className="font-extrabold" style={{ color: POS_HEX[group] }}>
                  {group}
                </b>
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ── 후보 명단 사이드바 ── */}
        <aside
          ref={benchRef}
          className={`h-fit rounded-xl border p-3 transition-colors xl:sticky xl:top-4 ${
            drag?.overBench && drag.from === "pitch"
              ? "border-[#ff5666]/60 bg-[#ff5666]/10"
              : "border-white/[0.08] bg-[#12181F]"
          }`}
        >
          <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-2">
            <h3 className="text-sm font-bold text-gray-100">후보 명단</h3>
            <span className="text-xs text-gray-500">{bench.length}명</span>
          </div>
          {pickingZone && (
            <p className="export-hide mb-2 rounded-md bg-[#20E878]/10 px-2 py-1.5 text-[11px] font-semibold text-[#20E878]">
              {pickingZone} 자리에 넣을 선수를 선택하세요
            </p>
          )}
          {bench.length === 0 ? (
            <p className="py-4 text-center text-xs text-gray-600">대기 중인 선수가 없습니다</p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-1">
              {bench.map((id) => {
                const g = groupOf(id);
                return (
                  <div
                    key={id}
                    onPointerDown={startDrag(id, "bench")}
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={() => setDrag(null)}
                    className={`flex cursor-grab touch-none items-center gap-2.5 rounded-lg border border-white/5 bg-white/5 px-2.5 py-2 transition active:cursor-grabbing ${
                      drag?.id === id && drag.moved ? "opacity-40" : "hover:bg-white/10"
                    }`}
                    title="경기장으로 드래그하거나 탭해서 배치"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#1A202A] text-base font-extrabold text-gray-200">
                      {numberOf.get(id)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-gray-100">{nameOf(id)}</span>
                      <span className="block text-[11px] font-extrabold" style={{ color: POS_HEX[g] }}>
                        {g}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <p className="export-hide mt-2.5 border-t border-white/10 pt-2 text-[10px] leading-relaxed text-gray-600">
            선수를 이곳으로 드래그하면 후보로 내려갑니다
          </p>
        </aside>
      </div>
    </div>
  );
}
