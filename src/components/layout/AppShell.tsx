"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { TAB_PATH, tabFromPath, type TabKey } from "./NavContext";

const NAV: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "dashboard", label: "대시보드", icon: LayoutDashboard },
  { key: "members", label: "회원", icon: Users },
  { key: "payments", label: "회비", icon: CircleDollarSign },
  { key: "matches", label: "경기", icon: Trophy },
  { key: "formation", label: "포메이션", icon: Workflow },
  { key: "stats", label: "통계", icon: BarChart3 },
];

const APP_VERSION = "v2.2.0";

/** 스토어 로드 전 콘텐츠 영역 스켈레톤 (셸/네비는 즉시 표시) */
function ContentSkeleton() {
  return (
    <div className="animate-pulse space-y-5" aria-label="불러오는 중" role="status">
      <div className="h-8 w-44 rounded-lg bg-gray-200" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 rounded-xl border border-gray-200 bg-white p-4">
            <div className="h-3 w-20 rounded bg-gray-100" />
            <div className="mt-3 h-6 w-28 rounded bg-gray-200" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-64 rounded-xl border border-gray-200 bg-white" />
        <div className="h-64 rounded-xl border border-gray-200 bg-white" />
      </div>
    </div>
  );
}

/** 스토어 준비 전에는 콘텐츠만 스켈레톤으로 대체 */
function ContentGate({ children }: { children: React.ReactNode }) {
  const { ready } = useAppStore();
  if (!ready) return <ContentSkeleton />;
  return <>{children}</>;
}

/** 공통 셸 레이아웃 — 사이드바/모바일 헤더는 라우트 전환과 무관하게 유지된다 */
export function AppShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { resetToSample } = useAppStore();
  const active = tabFromPath(pathname ?? "/");

  const confirmReset = () => {
    if (confirm("모든 데이터를 샘플로 초기화할까요?")) resetToSample();
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* 좌측 사이드바 (라이트 고정) */}
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-[#EAECF2] bg-white p-4 md:flex">
        {/* 로고 */}
        <Link href="/" className="mb-5 flex items-center gap-3 border-b border-gray-100 pb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-base font-bold text-white">
            H7
          </div>
          <div>
            <div className="text-lg font-bold leading-tight text-gray-900">하퍼세븐</div>
            <div className="text-[10px] font-medium tracking-[.18em] text-gray-400">HAPER SEVEN FC</div>
          </div>
        </Link>

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
            <Link
              key={key}
              href={TAB_PATH[key]}
              className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm transition ${
                active === key
                  ? "bg-[#EEEBFF] font-semibold text-[#5B4CF0]"
                  : "font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              }`}
            >
              <Icon size={18} className="shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        {/* 하단 */}
        <div className="space-y-1 border-t border-gray-100 pt-3">
          <button onClick={confirmReset} className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600">
            ⚙ 설정 · 샘플 초기화
          </button>
          <div className="text-[11px] text-gray-300">© 하퍼세븐 FC · {APP_VERSION}</div>
        </div>
      </aside>

      {/* 상단바 (모바일) */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-base font-bold text-gray-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
              H7
            </span>
            하퍼세븐
          </Link>
          <button onClick={confirmReset} className="text-xs text-gray-400">
            ⚙ 초기화
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
          {NAV.map(({ key, label, icon: Icon }) => (
            <Link
              key={key}
              href={TAB_PATH[key]}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                active === key ? "bg-[#EEEBFF] text-[#5B4CF0]" : "text-gray-500"
              }`}
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
        </nav>
      </header>

      {/* 본문 — 전 페이지 동일한 밝은 배경/여백 */}
      <main className="min-w-0 flex-1 bg-[#F5F6FA]">
        <div className="mx-auto w-full max-w-[1500px] px-6 py-7 lg:px-8">
          <ContentGate>{children}</ContentGate>
        </div>
      </main>
    </div>
  );
}
