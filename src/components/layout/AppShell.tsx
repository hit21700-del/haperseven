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

const APP_VERSION = "v2.1.0";

export function AppShell() {
  const { ready, resetToSample } = useAppStore();
  const [tab, setTab] = useState<TabKey>("dashboard");

  if (!ready) {
    return <div className="flex h-screen items-center justify-center text-gray-400">불러오는 중...</div>;
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
        {/* 좌측 사이드바 (라이트 고정) */}
        <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-[#EAECF2] bg-white p-4 md:flex">
          {/* 로고 */}
          <div className="mb-5 flex items-center gap-3 border-b border-gray-100 pb-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-base font-bold text-white">
              H7
            </div>
            <div>
              <div className="text-lg font-bold leading-tight text-gray-900">하퍼세븐</div>
              <div className="text-[10px] font-medium tracking-[.18em] text-gray-400">HAPER SEVEN FC</div>
            </div>
          </div>

          {/* 사용자 카드 */}
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50">
              <ShieldCheck size={18} className="text-brand-600" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">운영자</div>
              <div className="flex items-center gap-1 text-[11px] text-gray-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> 관리자
              </div>
            </div>
          </div>

          {/* 네비게이션 */}
          <nav className="flex-1 space-y-1">
            {NAV.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm transition ${
                  tab === key
                    ? "bg-[#EEEBFF] font-semibold text-[#5B4CF0]"
                    : "font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                <Icon size={18} className="shrink-0" />
                {label}
              </button>
            ))}
          </nav>

          {/* 하단 */}
          <div className="space-y-1 border-t border-gray-100 pt-3">
            <button
              onClick={() => {
                if (confirm("모든 데이터를 샘플로 초기화할까요?")) resetToSample();
              }}
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600"
            >
              ⚙ 설정 · 샘플 초기화
            </button>
            <div className="text-[11px] text-gray-300">© 하퍼세븐 FC · {APP_VERSION}</div>
          </div>
        </aside>

        {/* 상단바 (모바일) */}
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="flex items-center gap-2 text-base font-bold text-gray-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
                H7
              </span>
              하퍼세븐
            </span>
            <button
              onClick={() => {
                if (confirm("모든 데이터를 샘플로 초기화할까요?")) resetToSample();
              }}
              className="text-xs text-gray-400"
            >
              ⚙ 초기화
            </button>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
            {NAV.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  tab === key ? "bg-[#EEEBFF] text-[#5B4CF0]" : "text-gray-500"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </nav>
        </header>

        {/* 본문 — 전 페이지 동일한 밝은 배경/여백 */}
        <main className="min-w-0 flex-1 bg-[#F5F6FA]">
          <div className="mx-auto w-full max-w-[1500px] px-6 py-7 lg:px-8">{renderPage()}</div>
        </main>
      </div>
    </NavContext.Provider>
  );
}
