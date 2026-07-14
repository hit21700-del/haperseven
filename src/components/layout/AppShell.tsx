"use client";
import React, { useState } from "react";
import { useAppStore } from "@/lib/store/AppStore";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { MembersPage } from "@/components/members/MembersPage";
import { PaymentsPage } from "@/components/payments/PaymentsPage";
import { MatchesPage } from "@/components/matches/MatchesPage";
import { FormationPage } from "@/components/formation/FormationPage";
import { StatsPage } from "@/components/stats/StatsPage";
import { NavContext, type TabKey } from "./NavContext";

const NAV: { key: TabKey; label: string; icon: string }[] = [
  { key: "dashboard", label: "대시보드", icon: "▦" },
  { key: "members", label: "회원", icon: "👤" },
  { key: "payments", label: "회비", icon: "₩" },
  { key: "matches", label: "경기", icon: "⚽" },
  { key: "formation", label: "포메이션", icon: "✦" },
  { key: "stats", label: "통계", icon: "📊" },
];

const APP_VERSION = "v1.0.0";

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

  const NavButton = ({ n }: { n: (typeof NAV)[number] }) => {
    const active = tab === n.key;
    return (
      <button
        onClick={() => setTab(n.key)}
        className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition ${
          active
            ? "bg-gradient-to-r from-brand-600 to-accent-400 font-semibold text-white shadow-md shadow-brand-500/30"
            : "font-medium text-gray-500 hover:bg-brand-50 hover:text-brand-600"
        }`}
      >
        <span className="flex h-5 w-5 items-center justify-center text-base">{n.icon}</span>
        {n.label}
      </button>
    );
  };

  return (
    <NavContext.Provider value={setTab}>
      <div className="flex min-h-screen flex-col md:flex-row">
        {/* 좌측 사이드바 (라이트) */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-100 bg-white md:flex">
          {/* 로고 */}
          <div className="flex items-center gap-2.5 px-5 pb-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-accent-400 text-sm font-extrabold text-white shadow-md shadow-brand-500/30">
              H7
            </div>
            <div>
              <div className="text-[17px] font-extrabold leading-none text-gray-800">하퍼세븐</div>
              <div className="mt-0.5 text-[10px] font-semibold tracking-wide text-gray-400">HAPER SEVEN FC</div>
            </div>
          </div>

          {/* 사용자 카드 */}
          <div className="mx-4 mb-4 mt-2 flex items-center gap-2.5 rounded-xl bg-gray-50 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm text-brand-600">
              👤
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-gray-800">운영자</div>
              <div className="flex items-center gap-1 text-[11px] text-gray-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> 온라인
              </div>
            </div>
            <span className="text-gray-300">⌄</span>
          </div>

          {/* 네비게이션 */}
          <nav className="flex-1 space-y-1.5 px-3">
            {NAV.map((n) => (
              <NavButton key={n.key} n={n} />
            ))}
          </nav>

          {/* 프로모 카드 */}
          <div className="mx-4 mb-3 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-accent-400 p-4 text-white shadow-lg shadow-brand-500/30">
            <div className="text-sm font-bold leading-snug">
              우리의 플레이,
              <br />
              함께 완성해요
            </div>
            <p className="mt-1 text-[11px] text-white/80">하퍼세븐과 함께 더 강해지세요.</p>
            <div className="mt-3 text-3xl">⚽</div>
          </div>

          {/* 하단 */}
          <div className="space-y-1 px-4 pb-4">
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
        <header className="sticky top-0 z-30 border-b border-gray-100 bg-white md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="flex items-center gap-2 text-base font-extrabold text-gray-800">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-accent-400 text-xs text-white">
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
            {NAV.map((n) => (
              <button
                key={n.key}
                onClick={() => setTab(n.key)}
                className={`flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs ${
                  tab === n.key
                    ? "bg-gradient-to-r from-brand-600 to-accent-400 font-semibold text-white"
                    : "text-gray-500"
                }`}
              >
                <span>{n.icon}</span>
                {n.label}
              </button>
            ))}
          </nav>
        </header>

        {/* 본문 */}
        <main className="flex-1 p-4 md:p-7">
          <div className="mx-auto max-w-6xl">{renderPage()}</div>
        </main>
      </div>
    </NavContext.Provider>
  );
}
