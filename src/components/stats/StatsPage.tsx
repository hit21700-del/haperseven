"use client";
import React, { useMemo, useState } from "react";
import { CalendarDays, Footprints, Goal, Medal } from "lucide-react";
import { useAppStore } from "@/lib/store/AppStore";
import { Card, SectionTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, THead, TH, TD, TR } from "@/components/ui/Table";
import { PeriodFilter } from "@/components/common/PeriodFilter";
import type { Period } from "@/lib/stats/period";
import { periodLabel } from "@/lib/stats/period";
import { aggregate, topN, teamRecord, type PlayerAggregate } from "@/lib/stats/statsService";
import { currentYear } from "@/lib/utils/format";

type SortKey = "attendCount" | "goals" | "assists" | "momCount";

const RESULT_CHIP: Record<"W" | "D" | "L", { label: string; cls: string }> = {
  W: { label: "승", cls: "bg-emerald-700 text-white" },
  D: { label: "무", cls: "bg-surface-3 text-fg-2" },
  L: { label: "패", cls: "bg-red-600 text-white" },
};

/** 랭킹 카드 — 상위 3명 (1위 강조, 2·3위 작은 행) */
function RankingCard({
  icon,
  title,
  entries,
  valueKey,
  unit,
}: {
  icon: React.ReactNode;
  title: string;
  entries: PlayerAggregate[];
  valueKey: SortKey;
  unit: string;
}) {
  const [first, ...rest] = entries;
  return (
    <Card>
      <div className="flex items-center gap-1.5 text-[13px] font-medium text-fg-muted">
        <span className="flex shrink-0 items-center text-brand" aria-hidden="true">
          {icon}
        </span>
        {title}
      </div>
      {first ? (
        <>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <div className="min-w-0 truncate text-lg font-bold text-fg">{first.name}</div>
            <div className="shrink-0 whitespace-nowrap text-lg font-bold text-brand">
              {first[valueKey]}
              <span className="ml-0.5 text-xs font-medium text-fg-muted">{unit}</span>
            </div>
          </div>
          {rest.length > 0 && (
            <div className="mt-2 space-y-1 border-t border-line-soft pt-2">
              {rest.map((a, i) => (
                <div key={a.memberId} className="flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0 truncate text-fg-muted">
                    <span className="mr-1 font-semibold text-fg-muted">{i + 2}</span>
                    {a.name}
                  </div>
                  <div className="shrink-0 whitespace-nowrap font-semibold text-fg-2">
                    {a[valueKey]}
                    {unit}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <EmptyState compact title="아직 기록이 없습니다" description="경기에서 출석·득점을 입력하면 집계됩니다." />
      )}
    </Card>
  );
}

function RecordStat({ label, value, cls = "text-fg" }: { label: string; value: React.ReactNode; cls?: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2 text-center">
      <div className="text-[11px] font-medium text-fg-muted">{label}</div>
      <div className={`mt-0.5 whitespace-nowrap text-base font-bold ${cls}`}>{value}</div>
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
        { icon: <Goal size={14} />, title: "득점왕", key: "goals" as SortKey, unit: "골" },
        { icon: <Footprints size={14} />, title: "도움왕", key: "assists" as SortKey, unit: "개" },
        { icon: <CalendarDays size={14} />, title: "출석왕", key: "attendCount" as SortKey, unit: "회" },
        { icon: <Medal size={14} />, title: "MOM왕", key: "momCount" as SortKey, unit: "회" },
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
                    <span className="text-emerald-700 dark:text-emerald-400">{record.win}</span>
                    <span className="text-fg-muted"> - {record.draw} - </span>
                    <span className="text-red-600 dark:text-red-400">{record.loss}</span>
                  </>
                }
              />
              <RecordStat label="득점" value={record.goalsFor} cls="text-emerald-700 dark:text-emerald-400" />
              <RecordStat label="실점" value={record.goalsAgainst} cls="text-red-600 dark:text-red-400" />
              <RecordStat label="경기당 득점" value={(record.goalsFor / record.games).toFixed(1)} cls="text-brand" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-fg-muted">최근 5경기</span>
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
          <EmptyState
            compact
            title="아직 팀 기록이 없습니다"
            description="경기 결과(스코어)를 입력하면 승무패가 집계됩니다."
          />
        )}
      </Card>

      <Card>
        <SectionTitle
          action={
            <div className="flex flex-wrap gap-1 text-sm">
              {(
                [
                  ["goals", "득점순"],
                  ["assists", "도움순"],
                  ["attendCount", "출석순"],
                  ["momCount", "MOM순"],
                ] as [SortKey, string][]
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSortKey(k)}
                  aria-pressed={sortKey === k}
                  className={`px-3 py-1 font-semibold ${sortKey === k ? "rounded-lg bg-brand text-brand-fg hover:bg-brand-hover" : "rounded-lg border border-line bg-surface text-fg-2 hover:bg-surface-2"}`}
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
              <TH>도움</TH>
              <TH>MOM</TH>
              <TH>공격포인트</TH>
            </TR>
          </THead>
          <tbody>
            {sorted.map((a, i) => (
              <TR key={a.memberId}>
                <TD className="font-bold text-brand">{i + 1}</TD>
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
                {/* ui/Table 의 TD 는 colSpan 을 받지 않으므로 빈 행만 raw td 사용 */}
                <td colSpan={7} className="px-4 py-3 text-fg-2">
                  <EmptyState
                    compact
                    title="해당 기간 기록이 없습니다"
                    description="기간을 바꾸거나 경기에서 출석·득점을 입력하면 집계됩니다."
                  />
                </td>
              </TR>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
