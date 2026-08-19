"use client";
import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store/AppStore";
import { Badge, MemberTypeBadge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { PeriodFilter } from "@/components/common/PeriodFilter";
import { useNav } from "@/components/layout/NavContext";
import type { Period } from "@/lib/stats/period";
import { periodLabel } from "@/lib/stats/period";
import { formatWon, currentYear, todayISO } from "@/lib/utils/format";
import { summarizeAll, unpaidMembers, totals } from "@/lib/payments/paymentService";
import {
  aggregate,
  topN,
  teamRecord,
  matchResult,
  upcomingMatch,
  type PlayerAggregate,
} from "@/lib/stats/statsService";
import { readJSON, STORAGE_KEYS } from "@/lib/repository/storage";
import type { Match } from "@/types/match";

const cardCls = "rounded-xl border border-gray-200 bg-white p-5 shadow-sm";

const RESULT_CHIP: Record<"W" | "D" | "L", string> = {
  W: "bg-emerald-500 text-white",
  D: "bg-gray-300 text-gray-700",
  L: "bg-red-400 text-white",
};
const RESULT_LABEL: Record<"W" | "D" | "L", string> = { W: "승", D: "무", L: "패" };

function CardHead({ icon, title, action }: { icon: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-sm text-brand-600">{icon}</span>
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function FooterLink({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-3 flex w-full items-center justify-center gap-1 border-t border-gray-100 pt-3 text-xs font-semibold text-brand-600 hover:text-brand-700"
    >
      {children} ›
    </button>
  );
}

/** 경기 표시명 */
function matchName(m: Match): string {
  if (m.matchType === "SCRIMMAGE") return m.title ?? "자체전 (화이트 vs 블랙)";
  return m.opponent ? `하퍼세븐 vs ${m.opponent}` : m.title ?? "경기";
}

export function DashboardPage() {
  const { members, matches, paymentEntries } = useAppStore();
  const go = useNav();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>({ type: "year", year: currentYear() });

  const today = todayISO();
  const next = useMemo(() => upcomingMatch(matches, today), [matches, today]);
  const record = useMemo(() => teamRecord(matches, period), [matches, period]);

  // 최근 경기: 지났거나 스코어가 있는 경기 최신순 3건
  const recentMatches = useMemo(
    () =>
      matches
        .filter((m) => m.score || m.date < today)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 3),
    [matches, today],
  );

  const aggs = useMemo(() => aggregate(members, matches, period), [members, matches, period]);
  const topAttend = topN(aggs, "attendCount");
  const topGoals = topN(aggs, "goals");
  const topAssists = topN(aggs, "assists");
  const topMom = topN(aggs, "momCount", 1);

  const summaries = useMemo(
    () => summarizeAll(members, paymentEntries, matches, period),
    [members, paymentEntries, matches, period],
  );
  const t = useMemo(() => totals(summaries), [summaries]);
  const unpaid = useMemo(() => unpaidMembers(summaries), [summaries]);

  const activeCount = members.filter((m) => m.isActive).length;
  const nextAttend = next?.attendance.filter((a) => a.status === "ATTEND" || a.status === "LATE").length ?? 0;
  const nextUnchecked = next ? Math.max(0, activeCount - next.attendance.length) : 0;
  const dday = next ? Math.round((new Date(next.date).getTime() - new Date(today).getTime()) / 86400000) : 0;

  const [teamBalance, setTeamBalance] = useState(8_825_526);
  useEffect(() => {
    setTeamBalance(readJSON<number>(STORAGE_KEYS.teamBalance, 8_825_526));
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader
        title="대시보드"
        description={`하퍼세븐의 현재 운영 현황입니다 · ${periodLabel(period)} 기준`}
        action={<PeriodFilter value={period} onChange={setPeriod} />}
      />

      {/* 퀵 액션 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(
          [
            ["＋", "경기 등록", () => go("matches")],
            ["✓", "출석 입력", () => go("matches")],
            ["⚽", "라인업 작성", () => go("formation")],
            ["🏁", "결과 입력", () => go("matches")],
          ] as [string, string, () => void][]
        ).map(([icon, label, onClick]) => (
          <button
            key={label}
            onClick={onClick}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-brand-300 hover:text-brand-600"
          >
            <span className="text-brand-600">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* 다음 경기 + 시즌 기록 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={`${cardCls} lg:col-span-2`}>
          <CardHead
            icon="📅"
            title="다음 경기"
            action={
              next && (
                <Badge tone={dday <= 3 ? "red" : "blue"}>{dday === 0 ? "오늘" : dday === 1 ? "내일" : `D-${dday}`}</Badge>
              )
            }
          />
          {next ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xl font-bold text-gray-900">{matchName(next)}</div>
                  <div className="mt-1 text-sm text-gray-500">
                    {next.date} {next.time && `· ${next.time}`} {next.location && `· 📍 ${next.location}`}
                    {next.matchType === "SCRIMMAGE" && (
                      <Badge tone="purple">자체전</Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-brand-600">
                    {nextAttend}
                    <span className="text-base font-medium text-gray-400">/{activeCount}</span>
                  </div>
                  <div className="text-xs text-gray-400">참석 · 미체크 {nextUnchecked}명</div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => go("matches")}
                  className="flex-1 rounded-lg border border-gray-200 bg-white py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  ✓ 출석 입력
                </button>
                <button
                  onClick={() => router.push(`/formation?match=${next.id}`)}
                  className="flex-1 rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  ⚽ 라인업 짜기
                </button>
              </div>
            </>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm text-gray-400">예정된 경기가 없습니다.</p>
              <button
                onClick={() => go("matches")}
                className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                ＋ 경기 등록
              </button>
            </div>
          )}
        </div>

        <div className={cardCls}>
          <CardHead icon="🏆" title="시즌 기록" />
          {record.games > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{record.games}</div>
                  <div className="text-xs text-gray-400">경기</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    <span className="text-emerald-600">{record.win}</span>
                    <span className="mx-0.5 text-gray-300">-</span>
                    <span className="text-gray-500">{record.draw}</span>
                    <span className="mx-0.5 text-gray-300">-</span>
                    <span className="text-red-500">{record.loss}</span>
                  </div>
                  <div className="text-xs text-gray-400">승-무-패</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {record.goalsFor}
                    <span className="mx-0.5 text-sm text-gray-300">:</span>
                    {record.goalsAgainst}
                  </div>
                  <div className="text-xs text-gray-400">득실</div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-center gap-1.5">
                <span className="mr-1 text-xs text-gray-400">최근</span>
                {record.recent.map((r, i) => (
                  <span
                    key={i}
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${RESULT_CHIP[r]}`}
                  >
                    {RESULT_LABEL[r]}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="py-6 text-center text-sm text-gray-400">
              경기 결과(스코어)를 입력하면
              <br />
              승무패가 집계됩니다.
            </p>
          )}
          {topMom.length > 0 && (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm">
              <span className="text-amber-700">🏅 최다 MOM</span>
              <span className="font-bold text-amber-700">
                {topMom[0].name} {topMom[0].momCount}회
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 최근 경기 + 회비 요약 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={cardCls}>
          <CardHead icon="⚽" title="최근 경기" />
          {recentMatches.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">경기 기록이 없습니다.</p>
          ) : (
            <ul className="space-y-1">
              {recentMatches.map((m) => {
                const r = (m.matchType ?? "MATCH") === "MATCH" ? matchResult(m) : null;
                const goals = m.stats.reduce((s, x) => s + x.goals, 0);
                const attend = m.attendance.filter((a) => a.status === "ATTEND" || a.status === "LATE").length;
                return (
                  <li key={m.id}>
                    <button
                      onClick={() => go("matches")}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm hover:bg-gray-50"
                    >
                      {r ? (
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${RESULT_CHIP[r]}`}
                        >
                          {RESULT_LABEL[r]}
                        </span>
                      ) : (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm">
                          ⚽
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-gray-800">{matchName(m)}</span>
                        <span className="block text-xs text-gray-400">{m.date}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        {m.score ? (
                          <span className="text-base font-bold text-gray-900">
                            {m.score.us} : {m.score.them}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">
                            참석 {attend} · {goals}골
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <FooterLink onClick={() => go("matches")}>전체 경기 보기</FooterLink>
        </div>

        <div className={cardCls}>
          <CardHead icon="🧾" title="회비 현황" />
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className={`text-2xl font-bold ${t.unpaidCount > 0 ? "text-red-500" : "text-gray-900"}`}>
                {t.unpaidCount}명
              </div>
              <div className="text-xs text-gray-400">미납자</div>
            </div>
            <div>
              <div className="text-lg font-bold leading-8 text-emerald-600">{formatWon(t.totalPaid)}</div>
              <div className="text-xs text-gray-400">총 납부</div>
            </div>
            <div>
              <div className="text-lg font-bold leading-8 text-brand-600">{formatWon(teamBalance)}</div>
              <div className="text-xs text-gray-400">잔고</div>
            </div>
          </div>
          {unpaid.length > 0 && (
            <ul className="mt-3 max-h-36 space-y-0.5 overflow-y-auto border-t border-gray-100 pt-2">
              {unpaid.map((s) => (
                <li key={s.member.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">{s.member.name}</span>
                    <MemberTypeBadge type={s.member.memberType} />
                  </span>
                  <span className="font-semibold text-red-500">{formatWon(s.unpaid)}</span>
                </li>
              ))}
            </ul>
          )}
          <FooterLink onClick={() => go("payments")}>회비 관리 열기</FooterLink>
        </div>
      </div>

      {/* TOP 5 랭킹 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <RankCard icon="📅" title="최다 출석 TOP 5" rows={topAttend} unit={(a) => `${a.attendCount}회`} go={go} />
        <RankCard icon="⚽" title="최다 득점 TOP 5" rows={topGoals} unit={(a) => `${a.goals}골`} go={go} />
        <RankCard icon="👟" title="최다 어시스트 TOP 5" rows={topAssists} unit={(a) => `${a.assists}A`} go={go} />
      </div>
    </div>
  );
}

function RankCard({
  icon,
  title,
  rows,
  unit,
  go,
}: {
  icon: string;
  title: string;
  rows: PlayerAggregate[];
  unit: (a: PlayerAggregate) => string;
  go: (t: "stats") => void;
}) {
  return (
    <div className={cardCls}>
      <CardHead icon={icon} title={title} />
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">데이터 없음</p>
      ) : (
        <ol className="space-y-1.5">
          {rows.map((a, i) => (
            <li key={a.memberId} className="flex items-center gap-2 text-sm">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  i < 3 ? "bg-brand-50 text-brand-600" : "bg-gray-100 text-gray-400"
                }`}
              >
                {i + 1}
              </span>
              <span className="flex-1 truncate font-medium text-gray-700">{a.name}</span>
              <span className="w-12 text-right font-semibold text-gray-800">{unit(a)}</span>
            </li>
          ))}
        </ol>
      )}
      <FooterLink onClick={() => go("stats")}>전체 통계 보기</FooterLink>
    </div>
  );
}
