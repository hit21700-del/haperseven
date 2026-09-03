"use client";
import React, { useEffect, useRef, useState } from "react";
import type { QuarterLineup, FormationTemplate } from "@/types/formation";
import type { Member, Position } from "@/types/member";
import { ELEVEN_GRID, gridZones, detailToGroup, type Group } from "@/lib/formation/positions";
import { POS_HEX } from "@/lib/constants/positionColors";

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

const SNAP_EASING = "cubic-bezier(0.23,1,0.32,1)";
const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ────────────────────────────────────────────────────────────
   경기장 마킹 (센터라인/서클/페널티박스/골에어리어/아크)
   ──────────────────────────────────────────────────────────── */
function PitchMarkings() {
  return (
    <div className="pointer-events-none absolute inset-[3.5%] border border-white/30" aria-hidden="true">
      <div className="absolute left-1/2 top-0 h-[15%] w-[46%] -translate-x-1/2 border-x border-b border-white/30" />
      <div className="absolute left-1/2 top-0 h-[6.5%] w-[22%] -translate-x-1/2 border-x border-b border-white/30" />
      <div className="absolute left-1/2 top-[15%] h-[5%] w-[14%] -translate-x-1/2 overflow-hidden">
        <div className="absolute -top-[100%] h-[200%] w-full rounded-full border border-white/30" />
      </div>
      <div className="absolute bottom-0 left-1/2 h-[15%] w-[46%] -translate-x-1/2 border-x border-t border-white/30" />
      <div className="absolute bottom-0 left-1/2 h-[6.5%] w-[22%] -translate-x-1/2 border-x border-t border-white/30" />
      <div className="absolute bottom-[15%] left-1/2 h-[5%] w-[14%] -translate-x-1/2 overflow-hidden">
        <div className="absolute -bottom-[100%] h-[200%] w-full rounded-full border border-white/30" />
      </div>
      <div className="absolute left-0 top-1/2 w-full border-t border-white/30" />
      <div className="absolute left-1/2 top-1/2 aspect-square h-[18%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30" />
      <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50" />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   유니폼 칩 (등번호 + 이름표[이름 · 포지션])
   포지션 약어는 잔디 위가 아니라 어두운 이름표 안에 두어 대비를 확보한다.
   ──────────────────────────────────────────────────────────── */
function PlayerJersey({ number, name, slot, gk }: { number: number; name: string; slot: string; gk?: boolean }) {
  const group = gk ? "GK" : ((detailToGroup(slot) ?? "MF") as Group);
  return (
    <div className="flex flex-col items-center">
      <div className={`fm-jersey ${gk ? "fm-jersey-gk" : ""}`} aria-hidden="true">
        <span
          className={`absolute inset-0 z-10 flex items-center justify-center pt-1 text-[22px] font-extrabold leading-none ${
            gk ? "text-[#241a00]" : "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,.9)]"
          }`}
        >
          {number}
        </span>
      </div>
      <span className="z-10 -mt-1.5 flex max-w-[92px] items-baseline gap-1 whitespace-nowrap rounded-md border border-white/10 bg-[#04070B]/90 px-2 py-0.5 shadow-[0_2px_6px_rgba(0,0,0,.5)]">
        <span className="truncate text-[15px] font-bold leading-tight text-white sm:text-base">{name}</span>
        <span className="text-[11px] font-extrabold" style={{ color: POS_HEX[group] }}>
          {slot}
        </span>
      </span>
    </div>
  );
}

type DragState = {
  id: string;
  from: "pitch" | "bench";
  x: number;
  y: number;
  moved: boolean;
  startCX: number;
  startCY: number;
  hover: string | null;
  overBench: boolean;
};

/**
 * FC24 스타일 전술 보드 (한 쿼터).
 * - 포인터 드래그(터치 포함) + 키보드(Enter 로 선수 집기 → 빈 슬롯/다른 선수/후보에서 Enter 로 놓기)
 * - 후보 명단은 우측 사이드바, 드롭하면 후보로 이동
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
  /** 키보드로 집은 선수 (Enter 로 집고 Enter 로 놓기) */
  const [moving, setMoving] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [notice, setNotice] = useState("");
  const snapRef = useRef<{ id: string; x: number; y: number } | null>(null);
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
      setNotice(`이미 ${template.playerCount}명이 배치되어 있습니다. 먼저 다른 선수를 후보로 내려주세요.`);
      return;
    }
    if (curLabel) copy.delete(curLabel);
    copy.set(targetLabel, memberId);
    if (occupant && occupant !== memberId && curLabel) copy.set(curLabel, occupant); // 자리 교체
    commit(copy);
    setPickingZone(null);
    setMoving(null);
    setNotice(`${nameOf(memberId)} → ${targetLabel}`);
  };

  const removeMember = (memberId: string) => {
    const copy = new Map(placement);
    for (const [l, m] of copy) if (m === memberId) copy.delete(l);
    commit(copy);
    setMoving(null);
    setNotice(`${nameOf(memberId)} 후보로 이동`);
  };

  const placeFromBench = (memberId: string) => {
    if (pickingZone) return placeAt(memberId, pickingZone);
    const m = members.find((x) => x.id === memberId);
    const pref = (m?.preferredPosition ?? m?.positions.find((p) => p !== "ANY") ?? "MF") as Group;
    const zone = zones.find((z) => z.group === pref && !placement.has(z.label)) ?? zones.find((z) => !placement.has(z.label));
    if (zone) placeAt(memberId, zone.label);
  };

  /* ── 키보드: Enter 로 집기/놓기, Esc 취소 ── */
  const isKeyboardClick = (e: React.MouseEvent) => e.detail === 0; // 포인터 탭은 pointerup 에서 처리됨
  const onPlayerActivate = (memberId: string, label: string) => {
    if (moving && moving !== memberId) return placeAt(moving, label); // 자리 교체
    if (moving === memberId) {
      setMoving(null);
      setNotice("이동 취소");
      return;
    }
    setMoving(memberId);
    setNotice(`${nameOf(memberId)} 선택됨 — 놓을 자리에서 Enter`);
  };
  useEffect(() => {
    if (!moving && !pickingZone) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMoving(null);
        setPickingZone(null);
        setNotice("취소");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [moving, pickingZone]);

  /* ── Pointer Event 드래그 ── */
  const pctOf = (e: { clientX: number; clientY: number }) => {
    const rect = pitchRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 };
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
    if (drag) return; // 멀티터치 보호
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
    setDrag({ ...drag, x: cx, y: cy, moved, hover: inside ? nearestSlot(cx, cy) : null, overBench: inBench(e.clientX, e.clientY) });
  };

  const endDrag = () => {
    if (!drag) return;
    const d = drag;
    setDrag(null);
    if (!d.moved) {
      // 탭: 후보 → 자동 배치 / 필드 선수 → 집기(키보드와 동일한 모드)
      if (d.from === "bench") placeFromBench(d.id);
      else {
        let label = "";
        for (const [l, m] of placement) if (m === d.id) label = l;
        onPlayerActivate(d.id, label);
      }
      return;
    }
    if (d.overBench) {
      if (d.from === "pitch") removeMember(d.id);
      return;
    }
    if (d.hover) {
      snapRef.current = { id: d.id, x: d.x, y: d.y }; // 드롭 지점 → 슬롯으로 정착 모션
      placeAt(d.id, d.hover);
    }
  };

  // 드롭 직후: 드롭 지점에서 슬롯 중심으로 160ms 정착 애니메이션 (WAAPI, 감소 모션이면 생략)
  useEffect(() => {
    const snap = snapRef.current;
    if (!snap || !pitchRef.current) return;
    snapRef.current = null;
    if (reducedMotion()) return;
    const el = pitchRef.current.querySelector<HTMLElement>(`[data-mid="${snap.id}"]`);
    let label = "";
    for (const [l, m] of placement) if (m === snap.id) label = l;
    const p = SLOT_POS[label];
    if (!el || !p) return;
    const rect = pitchRef.current.getBoundingClientRect();
    const dx = ((snap.x - xAdj(p.x, p.y)) / 100) * rect.width;
    const dy = ((snap.y - p.y) / 100) * rect.height;
    el.animate(
      [{ transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px)` }, { transform: "translate(-50%, -50%)" }],
      { duration: 160, easing: SNAP_EASING },
    );
  });

  const dragging = (id: string) => drag?.id === id && drag.moved;
  const colorTransition = drag ? "" : "transition-colors duration-100";

  const grpOf = (lbl: string): Group => (lbl === "GK" ? "GK" : ((detailToGroup(lbl) ?? "MF") as Group));
  // 드래그 중 왼쪽 상단 "어디서 → 어디로" 표시용
  let dragFromLabel: string | null = null;
  if (drag) {
    for (const [l, m] of placement) if (m === drag.id) { dragFromLabel = l; break; }
    if (!dragFromLabel) dragFromLabel = groupOf(drag.id);
  }
  const dragToLabel = drag?.hover ?? null;
  const dragToOccupant = dragToLabel ? placement.get(dragToLabel) : undefined;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-pitch-bg p-4 sm:p-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_230px]">
        {/* ── 필드 영역 ── */}
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-gray-100">{formationName}</span>
              <span className="text-xs font-semibold text-pitch-green">{lineup.quarter}쿼터</span>
            </div>
            <div className="text-sm text-gray-400">
              출전 <b className="text-gray-100">{onPitchIds.size}</b>/{template.playerCount} · 후보{" "}
              <b className="text-gray-200">{bench.length}</b>명
            </div>
          </div>

          {/* 스크린리더/키보드 안내 */}
          <p className="sr-only" role="status" aria-live="polite">
            {notice}
          </p>

          {/* 경기장 */}
          <div
            ref={pitchRef}
            role="group"
            aria-label={`${lineup.quarter}쿼터 전술 보드. 선수에서 Enter 로 집고 빈 자리나 다른 선수에서 Enter 로 놓습니다.`}
            className="relative h-[640px] touch-none select-none overflow-hidden rounded-xl bg-pitch-bg sm:h-[720px]"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(ellipse_at_50%_0%,rgba(32,232,120,.05),transparent_70%)]" />
            <div className="fm-pitch absolute inset-x-0 bottom-2 top-3 [clip-path:polygon(9%_0,91%_0,100%_100%,0_100%)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,transparent,rgba(0,0,0,.4)_85%)]" />
              <PitchMarkings />
            </div>

            {/* 빈 슬롯 */}
            {zones.map((z) => {
              const p = SLOT_POS[z.label];
              if (!p || placement.has(z.label)) return null;
              const active = pickingZone === z.label || drag?.hover === z.label;
              return (
                <button
                  key={z.label}
                  type="button"
                  onClick={() => {
                    if (moving) return placeAt(moving, z.label);
                    setPickingZone(pickingZone === z.label ? null : z.label);
                  }}
                  aria-label={`${z.label} 빈 자리${moving ? ` — ${nameOf(moving)} 놓기` : ""}`}
                  aria-pressed={pickingZone === z.label}
                  className={`export-hide absolute z-10 flex h-8 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md text-[11px] font-bold ${colorTransition} ${
                    active
                      ? "bg-pitch-green text-[#062313]"
                      : "border border-dashed border-white/30 bg-black/30 text-white/70 hover:bg-black/50 hover:text-white"
                  }`}
                  style={{ left: `${xAdj(p.x, p.y)}%`, top: `${p.y}%` }}
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
              const isMoving = moving === mid;
              return (
                <div
                  key={mid}
                  data-mid={mid}
                  className={`group absolute -translate-x-1/2 -translate-y-1/2 ${
                    isDragging
                      ? "z-40 scale-110 opacity-95"
                      : targeted || isMoving
                        ? "z-30 scale-110 transition-transform duration-[120ms] ease-[cubic-bezier(0.23,1,0.32,1)]"
                        : "z-20 transition-transform duration-[120ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:scale-[1.03]"
                  }`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <button
                    type="button"
                    onPointerDown={startDrag(mid, "pitch")}
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={() => setDrag(null)}
                    onClick={(e) => isKeyboardClick(e) && onPlayerActivate(mid, label)}
                    aria-label={`${nameOf(mid)}, ${label}${isMoving ? " (이동 중)" : ""}`}
                    aria-pressed={isMoving}
                    className={`cursor-grab touch-none rounded-lg active:cursor-grabbing ${
                      isMoving
                        ? "ring-2 ring-pitch-green ring-offset-2 ring-offset-pitch-bg"
                        : targeted
                          ? "bg-pitch-green/25 ring-2 ring-pitch-green" // 교체 대상 하이라이트
                          : ""
                    }`}
                  >
                    <PlayerJersey number={numberOf.get(mid) ?? 0} name={nameOf(mid)} slot={label} gk={label === "GK"} />
                  </button>
                  {!isDragging && (
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => removeMember(mid)}
                      className="export-hide absolute -right-1 -top-1 z-30 flex h-6 w-6 items-center justify-center rounded-full bg-pos-fw text-sm font-bold text-white opacity-70 shadow transition-opacity hover:opacity-100 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-80"
                      aria-label={`${nameOf(mid)} 후보로 내리기`}
                    >
                      −
                    </button>
                  )}
                </div>
              );
            })}

            {/* 후보에서 끌어오는 중인 선수 */}
            {drag && drag.from === "bench" && drag.moved && (
              <div
                className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2 scale-110 opacity-95"
                style={{ left: `${drag.x}%`, top: `${drag.y}%` }}
                aria-hidden="true"
              >
                <PlayerJersey
                  number={numberOf.get(drag.id) ?? 0}
                  name={nameOf(drag.id)}
                  slot={drag.hover ?? groupOf(drag.id)}
                  gk={drag.hover === "GK"}
                />
              </div>
            )}

            {/* 왼쪽 상단: 드래그 중 "어디서 → 어디로" 바뀌는지 표시 */}
            {drag && drag.moved && (
              <div
                className="export-hide pointer-events-none absolute left-2 top-2 z-50 min-w-[128px] rounded-lg border border-white/15 bg-[#04070B]/90 px-3 py-2 shadow-[0_4px_16px_rgba(0,0,0,.5)]"
                aria-hidden="true"
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-9 text-[11px] font-extrabold" style={{ color: POS_HEX[grpOf(dragFromLabel ?? "MF")] }}>
                    {dragFromLabel ?? "?"}
                  </span>
                  <span className="max-w-[88px] truncate text-xs font-bold text-white">{nameOf(drag.id)}</span>
                </div>
                <div className="my-0.5 text-center text-[11px] leading-none text-white/50">▼</div>
                {dragToLabel ? (
                  <div className="flex items-center gap-1.5">
                    <span className="w-9 text-[11px] font-extrabold" style={{ color: POS_HEX[grpOf(dragToLabel)] }}>
                      {dragToLabel}
                    </span>
                    <span className="max-w-[88px] truncate text-xs font-bold text-white">
                      {dragToOccupant ? nameOf(dragToOccupant) : "빈 자리"}
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] font-semibold text-white/50">{drag.overBench ? "후보로 내리기" : "놓을 자리로 이동"}</div>
                )}
              </div>
            )}
          </div>

          {/* 범례 */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs">
            {LEGEND.map(({ group, label }) => (
              <span key={group} className="flex items-center gap-1.5 text-gray-400">
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
          aria-label="후보 명단"
          className={`h-fit rounded-xl border p-3 ${colorTransition} xl:sticky xl:top-4 ${
            drag?.overBench && drag.from === "pitch" ? "border-pos-fw/60 bg-pos-fw/10" : "border-white/[0.08] bg-pitch-surface"
          }`}
        >
          <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-2">
            <h3 className="text-sm font-bold text-gray-100">후보 명단</h3>
            <span className="text-xs text-gray-400">{bench.length}명</span>
          </div>
          {(pickingZone || moving) && (
            <p className="export-hide mb-2 rounded-md bg-pitch-green/10 px-2 py-1.5 text-[11px] font-semibold text-pitch-green">
              {moving ? `${nameOf(moving)} 이동 중 — 빈 자리나 다른 선수를 선택` : `${pickingZone} 자리에 넣을 선수를 선택`}
            </p>
          )}
          {bench.length === 0 ? (
            <p className="py-4 text-center text-xs text-gray-400">대기 중인 선수가 없습니다</p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-1">
              {bench.map((id) => {
                const g = groupOf(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onPointerDown={startDrag(id, "bench")}
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={() => setDrag(null)}
                    onClick={(e) => {
                      if (!isKeyboardClick(e)) return;
                      if (moving) return removeMember(moving); // 이동 중 선수를 후보로
                      placeFromBench(id);
                    }}
                    aria-label={`${nameOf(id)} ${g} — 경기장에 배치`}
                    className={`flex cursor-grab touch-none items-center gap-2.5 rounded-lg border border-white/5 bg-white/5 px-2.5 py-2 text-left ${colorTransition} active:scale-[0.98] active:cursor-grabbing ${
                      drag?.id === id && drag.moved ? "opacity-40" : "hover:bg-white/10"
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-pitch-surface2 text-base font-extrabold text-gray-100">
                      {numberOf.get(id)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-gray-100">{nameOf(id)}</span>
                      <span className="block text-[11px] font-extrabold" style={{ color: POS_HEX[g] }}>
                        {g}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <p className="export-hide mt-2.5 border-t border-white/10 pt-2 text-[11px] leading-relaxed text-gray-400">
            선수를 이곳으로 드래그하면 후보로 내려갑니다. 키보드: 선수에서 Enter → 자리에서 Enter.
          </p>
        </aside>
      </div>
    </div>
  );
}
