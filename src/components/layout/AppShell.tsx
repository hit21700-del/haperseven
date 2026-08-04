"use client";
import React, { useState } from "react";
import {
  BarChart3,
  CircleDollarSign,
  LayoutDashboard,
  ShieldCheck,
  Trophy,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { useAppStore } from "@/lib/store/AppStore";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { MembersPage } from "@/components/members/MembersPage";
import { PaymentsPage } from "@/components/payments/PaymentsPage";
import { MatchesPage } from "@/components/matches/MatchesPage";
import { FormationPage } from "@/components/formation/FormationPage";
import { StatsPage } from "@/components/stats/StatsPage";
import { NavContext, type TabKey } from "./NavContext";

const NAV: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "dashboard", label: "대시보드", icon: LayoutDashboard },
  { key: "members", label: "회원", icon: Users },
  { key: "payments", label: "회비", icon: CircleDollarSign },
  { key: "matches", label: "경기", icon: Trophy },
  { key: "formation", label: "포메이션", icon: Workflow },
  { key: "stats", label: "통계", icon: BarChart3 },
];

const APP_VERSION = "v2.0.0";

export function AppShell() {
  const { ready, resetToSample } = useAppStore();
  const [tab, setTab] = useState<TabKey>("dashboard");

  if (!ready) {
    return <div className="flex h-screen items-center justify-center text-slate-400">불러오는 중...</div>;
  }

  const renderPage = () => {
    switch (tab) {
      case "dashboard":
        return <DashboardPage />;
      case "members":
        return <MembersPage />;
      case "payments":
        return <PaymentsPage />;
      case "matches":
        return <MatchesPage />;
      case "formation":
        return <FormationPage />;
      case "stats":
        return <StatsPage />;
    }
  };

  return (
    <NavContext.Provider value={setTab}>
      <div className="flex min-h-screen flex-col md:flex-row">
        {/* 좌측 사이드바 (레트로 다크) */}
        <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-white/20 bg-gradient-to-b from-[#07132e] via-[#02091d] to-[#01040d] p-4 md:flex">
          {/* 로고 */}
          <div className="mb-6 flex items-center gap-3 border-b border-white/10 pb-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-md border border-blue-300/60 bg-gradient-to-br from-blue-500 to-blue-900 text-lg font-black text-white shadow-blueGlow">
              H7
            </div>
            <div>
              <div className="text-xl font-black tracking-tight text-white">하퍼세븐</div>
              <div className="text-[10px] tracking-[.22em] text-slate-400">HAPER SEVEN FC</div>
            </div>
          </div>

          {/* 사용자 카드 */}
          <div className="retro-panel mb-6 rounded-md p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20">
                <ShieldCheck size={21} className="text-blue-300" />
              </div>
              <div>
                <div className="font-bold text-white">운영자</div>
                <div className="text-xs text-emerald-400">● 관리자</div>
              </div>
            </div>
          </div>

          {/* 네비게이션 */}
          <nav className="flex-1 space-y-2">
            {NAV.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex w-full items-center gap-3 rounded-md px-4 py-3 text-left font-bold transition ${
                  tab === key ? "chrome-button" : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>

          {/* 하단 */}
          <div className="space-y-1 border-t border-white/10 pt-3">
            <button
              onClick={() => {
                if (confirm("모든 데이터를 샘플로 초기화할까요?")) resetToSample();
              }}
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-white"
            >
              ⚙ 설정 · 샘플 초기화
            </button>
            <div className="text-[11px] text-slate-500">© 하퍼세븐 FC · {APP_VERSION}</div>
          </div>
        </aside>

        {/* 상단바 (모바일) */}
        <header className="sticky top-0 z-30 border-b border-white/15 bg-gradient-to-b from-[#07132e] to-[#02091d] md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="flex items-center gap-2 text-base font-black text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-blue-300/60 bg-gradient-to-br from-blue-500 to-blue-900 text-xs text-white">
                H7
              </span>
              하퍼세븐
            </span>
            <button
              onClick={() => {
                if (confirm("모든 데이터를 샘플로 초기화할까요?")) resetToSample();
              }}
              className="text-xs text-slate-400"
            >
              ⚙ 초기화
            </button>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
            {NAV.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold ${
                  tab === key ? "chrome-button" : "text-slate-400"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </nav>
        </header>

        {/* 본문 */}
        <main className="min-w-0 flex-1 bg-[radial-gradient(circle_at_50%_0%,rgba(35,75,171,.17),transparent_35%)] px-4 py-5 sm:px-6 xl:px-10">
          <div className="mx-auto max-w-[1500px]">{renderPage()}</div>
        </main>
      </div>
    </NavContext.Provider>
  );
}
