"use client";
import React, { useMemo, useState } from "react";
import { useAppStore } from "@/lib/store/AppStore";
import { Card, SectionTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, THead, TH, TD, TR } from "@/components/ui/Table";
import { PeriodFilter } from "@/components/common/PeriodFilter";
import type { Period } from "@/lib/stats/period";
import { periodLabel } from "@/lib/stats/period";
import { aggregate, topN, teamRecord, type PlayerAggregate } from "@/lib/stats/statsService";
import { currentYear } from "@/lib/utils/format";

type SortKey = "attendCount" | "goals" | "assists" | "momCount";

const RESULT_CHIP: Record<"W" | "D" | "L", { label: string; cls: string }> = {
  W: { label: "승", cls: "bg-emerald-500 text-white" },
  D: { label: "무", cls: "bg-gray-300 text-gray-700" },
  L: { label: "패", cls: "bg-red-400 text-white" },
};

/** 랭킹 카드 — 상위 3명 (1위 강조, 2·3위 작은 행) */
function RankingCard({
  icon,
  title,
  entries,
  valueKey,
  unit,
}: {
  icon: string;
  title: string;
  entries: PlayerAggregate[];
  valueKey: SortKey;
  unit: string;
}) {
  const [first, ...rest] = entries;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="text-[13px] font-medium text-gray-500">
        <span className="mr-1">{icon}</span>
        {title}
      </div>
      {first ? (
        <>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <div className="min-w-0 truncate text-lg font-bold text-gray-900">{first.name}</div>
            <div className="shrink-0 text-lg font-bold text-brand-600">
              {first[valueKey]}
              <span className="ml-0.5 text-xs font-medium text-gray-400">{unit}</span>
            </div>
          </div>
          {rest.length > 0 && (
            <div className="mt-2 space-y-1 border-t border-gray-100 pt-2">
              {rest.map((a, i) => (
                <div key={a.memberId} className="flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0 truncate text-gray-500">
                    <span className="mr-1 font-semibold text-gray-400">{i + 2}</span>
                    {a.name}
                  </div>
                  <div className="shrink-0 font-semibold text-gray-700">
                    {a[valueKey]}
                    {unit}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="mt-2 text-sm text-gray-400">기록 없음</div>
      )}
    </div>
  );
}

function RecordStat({ label, value, cls = "text-gray-900" }: { label: string; value: React.ReactNode; cls?: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2 text-center">
      <div className="text-[11px] font-medium text-gray-500">{label}</div>
      <div className={`mt-0.5 text-base font-bold ${cls}`}>{value}</div>
    </div>
  );
}

export function StatsPage() {
  const { members, matches } = useAppStore();
  const [period, setPeriod] = useState<Period>({ type: "year", year: currentYear() });
  const [sortKey, setSortKey] = useState<SortKey>("goals");

  const aggs = useMemo(() => aggregate(members, matches, period), [members, matches, period]);
  const sorted = useMemo(() => [...aggs].sort((a, b) => b[sortKey] - a[sortKey] || b.goals - a.goals), [aggs, sortKey]);
  const record = useMemo(() => teamRecord(matches, period), [matches, period]);

  const rankings = useMemo(
    () =>
      [
        { icon: "⚽", title: "득점왕", key: "goals" as SortKey, unit: "골" },
        { icon: "👟", title: "도움왕", key: "assists" as SortKey, unit: "개" },
        { icon: "📅", title: "출석왕", key: "attendCount" as SortKey, unit: "회" },
        { icon: "🏅", title: "MOM왕", key: "momCount" as SortKey, unit: "회" },
      ].map((r) => ({ ...r, entries: topN(aggs, r.key, 3) })),
    [aggs],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="통계"
        description={`${periodLabel(period)} 누적`}
        action={<PeriodFilter value={period} onChange={setPeriod} />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {rankings.map((r) => (
          <RankingCard key={r.key} icon={r.icon} title={r.title} entries={r.entries} valueKey={r.key} unit={r.unit} />
        ))}
      </div>

      <Card>
        <SectionTitle>팀 기록 (매칭 경기)</SectionTitle>
        {record.games > 0 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              <RecordStat label="경기수" value={record.games} />
              <RecordStat
                label="승-무-패"
                value={
                  <>
                    <span className="text-emerald-600">{record.win}</span>
                    <span className="text-gray-400"> - {record.draw} - </span>
                    <span className="text-red-500">{record.loss}</span>
                  </>
                }
              />
              <RecordStat label="득점" value={record.goalsFor} cls="text-emerald-600" />
              <RecordStat label="실점" value={record.goalsAgainst} cls="text-red-500" />
              <RecordStat label="경기당 득점" value={(record.goalsFor / record.games).toFixed(1)} cls="text-brand-600" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">최근 5경기</span>
              <div className="flex gap-1">
                {record.recent.map((r, i) => (
                  <span
                    key={i}
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${RESULT_CHIP[r].cls}`}
                  >
                    {RESULT_CHIP[r].label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">경기 결과(스코어)를 입력하면 팀 기록이 집계됩니다</p>
        )}
      </Card>

      <Card>
        <SectionTitle
          action={
            <div className="flex flex-wrap gap-1 text-sm">
              {(
                [
                  ["goals", "득점순"],
                  ["assists", "어시순"],
                  ["attendCount", "출석순"],
                  ["momCount", "MOM순"],
                ] as [SortKey, string][]
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setSortKey(k)}
                  className={`px-3 py-1 font-semibold ${sortKey === k ? "rounded-lg bg-brand-600 text-white hover:bg-brand-700" : "rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}
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
              <TH>MOM</TH>
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
                <TD>{a.momCount > 0 ? `${a.momCount}회` : "-"}</TD>
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
