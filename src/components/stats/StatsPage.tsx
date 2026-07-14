"use client";
import React, { useMemo, useState } from "react";
import { useAppStore } from "@/lib/store/AppStore";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Table, THead, TH, TD, TR } from "@/components/ui/Table";
import { PeriodFilter } from "@/components/common/PeriodFilter";
import type { Period } from "@/lib/stats/period";
import { periodLabel } from "@/lib/stats/period";
import { aggregate } from "@/lib/stats/statsService";

type SortKey = "attendCount" | "goals" | "assists";

export function StatsPage() {
  const { members, matches } = useAppStore();
  const [period, setPeriod] = useState<Period>({ type: "year", year: 2025 });
  const [sortKey, setSortKey] = useState<SortKey>("goals");

  const aggs = useMemo(() => aggregate(members, matches, period), [members, matches, period]);
  const sorted = useMemo(() => [...aggs].sort((a, b) => b[sortKey] - a[sortKey] || b.goals - a.goals), [aggs, sortKey]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">통계</h1>
          <p className="text-sm text-gray-500">{periodLabel(period)} 누적</p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      <Card>
        <SectionTitle
          action={
            <div className="flex gap-1 text-sm">
              {(
                [
                  ["goals", "득점순"],
                  ["assists", "어시순"],
                  ["attendCount", "출석순"],
                ] as [SortKey, string][]
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setSortKey(k)}
                  className={`rounded-lg px-3 py-1 ${sortKey === k ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        >
          회원별 누적 기록
        </SectionTitle>
        <Table>
          <THead>
            <TR>
              <TH>순위</TH>
              <TH>이름</TH>
              <TH>출석</TH>
              <TH>득점</TH>
              <TH>어시스트</TH>
              <TH>공격포인트</TH>
            </TR>
          </THead>
          <tbody>
            {sorted.map((a, i) => (
              <TR key={a.memberId}>
                <TD className="font-bold text-brand-600">{i + 1}</TD>
                <TD className="font-medium">{a.name}</TD>
                <TD>{a.attendCount}</TD>
                <TD>{a.goals}</TD>
                <TD>{a.assists}</TD>
                <TD className="font-semibold">{a.goals + a.assists}</TD>
              </TR>
            ))}
            {sorted.length === 0 && (
              <TR>
                <TD className="text-gray-400">해당 기간 기록이 없습니다.</TD>
              </TR>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
