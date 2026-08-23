"use client";
import React from "react";
import { Card } from "@/components/ui/Card";
import { PositionBadge, Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Field";
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
  copyQuarters,
  onCopyFrom,
}: {
  lineup: QuarterLineup;
  template: FormationTemplate;
  members: Member[];
  attendeeIds: string[];
  onChange: (updated: QuarterLineup) => void;
  /** 이 쿼터로 복사해올 수 있는 다른 쿼터 번호 목록 */
  copyQuarters?: number[];
  onCopyFrom?: (fromQuarter: number) => void;
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
    <Card className="!p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-bold text-gray-900">{lineup.quarter}쿼터</h3>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 text-xs">
            {(["GK", "DF", "MF", "FW"] as const).map((p) => (
              <span key={p} className={overfilled(p) ? "font-bold text-red-600" : "text-gray-500"}>
                {p} {counts[p]}/{template.positions[p]}
              </span>
            ))}
          </div>
          {onCopyFrom && (copyQuarters?.length ?? 0) > 0 && (
            <Select
              value=""
              onChange={(e) => {
                const from = Number(e.target.value);
                if (from) onCopyFrom(from);
              }}
              className="w-auto !px-2 !py-1 !text-xs text-gray-600"
              title="다른 쿼터 포메이션을 이 쿼터로 복사"
              aria-label={`${lineup.quarter}쿼터로 다른 쿼터 포메이션 불러오기`}
            >
              <option value="">↺ 불러오기</option>
              {copyQuarters!.map((q) => (
                <option key={q} value={q}>
                  {q}쿼터
                </option>
              ))}
            </Select>
          )}
        </div>
      </div>

      <div className="space-y-1">
        {attendeeIds.map((id) => {
          const cur = stateOf(id);
          return (
            <div key={id} className="flex items-center justify-between gap-2 rounded-md px-1 py-0.5 text-sm hover:bg-gray-50">
              <span className="flex items-center gap-2">
                {cur === "REST" ? <Badge tone="gray">휴식</Badge> : <PositionBadge position={cur} />}
                <span className={cur === "REST" ? "text-gray-500" : "font-semibold text-gray-800"}>{nameOf(id)}</span>
              </span>
              <Select
                value={cur}
                onChange={(e) => changePlayer(id, e.target.value as Position | "REST")}
                className="w-auto !px-1.5 !py-0.5 !text-xs"
                aria-label={`${nameOf(id)} ${lineup.quarter}쿼터 포지션`}
              >
                {POS_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o === "REST" ? "휴식" : o}
                  </option>
                ))}
              </Select>
            </div>
          );
        })}
        {attendeeIds.length === 0 && <p className="px-1 py-2 text-sm text-gray-500">참여 인원이 없습니다.</p>}
      </div>
    </Card>
  );
}
