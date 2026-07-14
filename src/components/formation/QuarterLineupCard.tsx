"use client";
import React from "react";
import { Card } from "@/components/ui/Card";
import { PositionBadge, Badge } from "@/components/ui/Badge";
import type { QuarterLineup, FormationTemplate } from "@/types/formation";
import type { Member, Position } from "@/types/member";

const POS_OPTIONS: (Position | "REST")[] = ["GK", "DF", "MF", "FW", "REST"];

/** 쿼터별 라인업 카드 (셀렉트박스로 수정 가능) */
export function QuarterLineupCard({
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
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? id;

  // 현재 이 쿼터에서 각 선수의 상태
  const stateOf = (id: string): Position | "REST" => {
    const p = lineup.players.find((x) => x.memberId === id);
    if (!p) return "REST";
    return p.isGK ? "GK" : (p.position as Position);
  };

  const changePlayer = (memberId: string, value: Position | "REST") => {
    const players = lineup.players.filter((p) => p.memberId !== memberId);
    let rests = lineup.rests.filter((r) => r !== memberId);
    if (value === "REST") {
      rests = [...rests, memberId];
    } else {
      players.push({ memberId, position: value, isGK: value === "GK" });
    }
    onChange({ ...lineup, players, rests });
  };

  // 포지션별 그룹핑(표시용)
  const byPos = (pos: Position) => lineup.players.filter((p) => (pos === "GK" ? p.isGK : !p.isGK && p.position === pos));
  const counts = {
    GK: byPos("GK").length,
    DF: byPos("DF").length,
    MF: byPos("MF").length,
    FW: byPos("FW").length,
  };
  const overfilled = (pos: "GK" | "DF" | "MF" | "FW") => counts[pos] > template.positions[pos];

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">{lineup.quarter}쿼터</h3>
        <div className="flex gap-1 text-xs">
          {(["GK", "DF", "MF", "FW"] as const).map((p) => (
            <span key={p} className={overfilled(p) ? "text-red-500" : "text-gray-500"}>
              {p} {counts[p]}/{template.positions[p]}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        {attendeeIds.map((id) => {
          const cur = stateOf(id);
          return (
            <div key={id} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2">
                {cur === "REST" ? <Badge tone="gray">휴식</Badge> : <PositionBadge position={cur} />}
                <span className={cur === "REST" ? "text-gray-400" : ""}>{nameOf(id)}</span>
              </span>
              <select
                value={cur}
                onChange={(e) => changePlayer(id, e.target.value as Position | "REST")}
                className="rounded border border-gray-300 px-1 py-0.5 text-xs"
              >
                {POS_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o === "REST" ? "휴식" : o}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
