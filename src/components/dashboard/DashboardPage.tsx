"use client";
import React, { useMemo, useState, useEffect } from "react";
import { useAppStore } from "@/lib/store/AppStore";
import { MemberTypeBadge } from "@/components/ui/Badge";
import { PeriodFilter } from "@/components/common/PeriodFilter";
import { useNav } from "@/components/layout/NavContext";
import type { Period } from "@/lib/stats/period";
import { periodLabel } from "@/lib/stats/period";
import { formatWon } from "@/lib/utils/format";
import { summarizeAll, unpaidMembers, totals } from "@/lib/payments/paymentService";
import { aggregate, topN, recentMatchSummary, type PlayerAggregate } from "@/lib/stats/statsService";
import { readJSON, STORAGE_KEYS } from "@/lib/repository/storage";

/** 장식용 스파크라인 */
function Spark({ up = false }: { up?: boolean }) {
  const pts = up ? "0,16 12,12 22,13 32,7 42,9 56,3" : "0,12 12,8 22,11 32,6 42,10 56,7";
  return (
    <svg width="56" height="20" viewBox="0 0 56 20" className="shrink-0">
      <polyline points={pts} fill="none" stroke="#c7d2fe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 컬러 아이콘 지표 카드 */
function StatCardX({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  valueColor = "text-gray-800",
  sub,
  subColor = "text-gray-400",
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  value: React.ReactNode;
  valueColor?: string;
  sub?: React.ReactNode;
  subColor?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_2px_12px_rgba(80,70,160,0.06)]">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${iconBg} ${iconColor}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-gray-500">{label}</div>
          <div className={`mt-0.5 text-[26px] font-extrabold leading-tight ${valueColor}`}>{value}</div>
        </div>
      </div>
      {sub && <div className={`mt-2 text-xs font-medium ${subColor}`}>{sub}</div>}
    </div>
  );
}

/** 카드 헤더 (아이콘 + 제목 + 우측 액션) */
function CardHead({ icon, title, action }: { icon: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-sm text-brand-600">{icon}</span>
        <h2 className="text-base font-bold text-gray-800">{title}</h2>
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

const cardCls = "rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_2px_12px_rgba(80,70,160,0.06)]";

export function DashboardPage() {
  const { members, matches, paymentEntries } = useAppStore();
  const go = useNav();
  const [period, setPeriod] = useState<Period>({ type: "year", year: 2025 });

  const summaries = useMemo(
    () => summarizeAll(members, paymentEntries, matches, period),
    [members, paymentEntries, matches, period],
  );
  const t = useMemo(() => totals(summaries), [summaries]);
  const unpaid = useMemo(() => unpaidMembers(summaries), [summaries]);

  const aggs = useMemo(() => aggregate(members, matches, period), [members, matches, period]);
  const topAttend = topN(aggs, "attendCount");
  const topGoals = topN(aggs, "goals");
  const topAssists = topN(aggs, "assists");
  const recent = useMemo(() => recentMatchSummary(matches), [matches]);
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? id;

  const activeCount = members.filter((m) => m.isActive).length || 1;
  const unpaidPct = Math.round((t.unpaidCount / activeCount) * 1000) / 10;

  // 현재 총 회비(잔고) — 회비 화면에서 수정한 값 사용
  const [teamBalance, setTeamBalance] = useState(8_825_526);
  useEffect(() => {
    setTeamBalance(readJSON<number>(STORAGE_KEYS.teamBalance, 8_825_526));
  }, []);

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">대시보드</h1>
          <p className="mt-0.5 text-sm text-gray-400">{periodLabel(period)} 기준</p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {/* 지표 카드 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCardX
          icon="👥"
          iconBg="bg-red-50"
          iconColor="text-red-500"
          label="회비 미납자 수"
          value={`${t.unpaidCount}명`}
          valueColor="text-red-500"
          sub={`전체 회원 대비 ${unpaidPct}%`}
          subColor="text-red-400"
        />
        <StatCardX
          icon="🪙"
          iconBg="bg-green-50"
          iconColor="text-green-500"
          label="총 납부 금액"
          value={formatWon(t.totalPaid)}
          valueColor="text-green-600"
          sub="전년 대비 —"
        />
        <StatCardX
          icon="🧾"
          iconBg="bg-brand-50"
          iconColor="text-brand-600"
          label="총 회비 (잔고)"
          value={formatWon(teamBalance)}
          valueColor="text-brand-600"
          sub="회비 화면에서 수정 가능"
        />
        <StatCardX
          icon="◔"
          iconBg="bg-orange-50"
          iconColor="text-orange-500"
          label="납부율"
          value={`${t.paymentRate}%`}
          valueColor="text-orange-500"
          sub="전년 대비 —"
        />
      </div>

      {/* 미납자 목록 + 최근 경기 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={cardCls}>
          <CardHead icon="⚠" title="회비 미납자 목록" />
          {unpaid.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">미납자가 없습니다 🎉</p>
          ) : (
            <ul className="max-h-72 space-y-0.5 overflow-y-auto pr-1">
              {unpaid.map((s) => (
                <li
                  key={s.member.id}
                  className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-gray-50"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">{s.member.name}</span>
                    <MemberTypeBadge type={s.member.memberType} />
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="font-semibold text-red-500">{formatWon(s.unpaid)} 미납</span>
                    <span className="text-gray-300">›</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <FooterLink onClick={() => go("payments")}>전체 미납자 보기</FooterLink>
        </div>

        <div className={cardCls}>
          <CardHead
            icon="🏆"
            title="최근 경기 요약"
            action={
              <button onClick={() => go("matches")} className="text-gray-300 hover:text-brand-600">
                ›
              </button>
            }
          />
          {recent.match ? (
            <>
              <div className="mb-3 flex items-center gap-2 text-sm">
                <span className="text-gray-400">📅</span>
                <span className="font-semibold text-gray-700">{recent.match.title ?? "경기"}</span>
                <span className="text-gray-400">({recent.match.date})</span>
              </div>
              <div className="grid grid-cols-3 gap-2 rounded-xl bg-gray-50 p-3 text-center">
                {[
                  { k: "참석", v: `${recent.attendCount}명` },
                  { k: "득점", v: recent.totalGoals },
                  { k: "어시스트", v: recent.totalAssists },
                ].map((x) => (
                  <div key={x.k}>
                    <div className="text-xs text-gray-400">{x.k}</div>
                    <div className="text-lg font-bold text-gray-800">{x.v}</div>
                  </div>
                ))}
              </div>
              <div className="py-5 text-center">
                <div className="text-3xl">📋</div>
                <div className="mt-2 text-sm font-medium text-gray-500">
                  {recent.match.stats.filter((s) => s.goals > 0 || s.assists > 0).length > 0
                    ? recent.match.stats
                        .filter((s) => s.goals > 0 || s.assists > 0)
                        .map((s) => `${nameOf(s.memberId)} ${s.goals}G ${s.assists}A`)
                        .join(" · ")
                    : "기록된 득점/어시스트 없음"}
                </div>
                <div className="mt-1 text-xs text-gray-400">경기 기록이 등록되면 요약이 표시됩니다.</div>
              </div>
            </>
          ) : (
            <p className="py-10 text-center text-sm text-gray-400">경기 기록이 없습니다.</p>
          )}
        </div>
      </div>

      {/* TOP 5 랭킹 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <RankCard icon="📅" title="최다 출석 TOP 5" rows={topAttend} unit={(a) => `${a.attendCount}회`} field="attendCount" go={go} />
        <RankCard icon="◎" title="최다 득점 TOP 5" rows={topGoals} unit={(a) => `${a.goals}골`} field="goals" go={go} />
        <RankCard icon="👟" title="최다 어시스트 TOP 5" rows={topAssists} unit={(a) => `${a.assists}A`} field="assists" go={go} />
      </div>
    </div>
  );
}

function RankCard({
  icon,
  title,
  rows,
  unit,
  field,
  go,
}: {
  icon: string;
  title: string;
  rows: PlayerAggregate[];
  unit: (a: PlayerAggregate) => string;
  field: "attendCount" | "goals" | "assists";
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
                  i < 3 ? "bg-brand-100 text-brand-600" : "bg-gray-100 text-gray-400"
                }`}
              >
                {i + 1}
              </span>
              <span className="flex-1 truncate font-medium text-gray-700">{a.name}</span>
              <Spark up={field !== "attendCount"} />
              <span className="w-10 text-right font-semibold text-gray-800">{unit(a)}</span>
            </li>
          ))}
        </ol>
      )}
      <FooterLink onClick={() => go("stats")}>전체 통계 보기</FooterLink>
    </div>
  );
}
