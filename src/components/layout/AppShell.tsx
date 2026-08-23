"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CircleDollarSign,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Trophy,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { useAppStore } from "@/lib/store/AppStore";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { TAB_PATH, tabFromPath, type TabKey } from "./NavContext";

const NAV: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "dashboard", label: "대시보드", icon: LayoutDashboard },
  { key: "members", label: "회원", icon: Users },
  { key: "payments", label: "회비", icon: CircleDollarSign },
  { key: "matches", label: "경기", icon: Trophy },
  { key: "formation", label: "포메이션", icon: Workflow },
  { key: "stats", label: "통계", icon: BarChart3 },
];

const APP_VERSION = "v2.3.0";

/** 스토어 로드 전 콘텐츠 영역 스켈레톤 (셸/네비는 즉시 표시) */
function ContentSkeleton() {
  return (
    <div className="animate-pulse-fast space-y-5" aria-label="불러오는 중" role="status">
      <div className="h-8 w-44 rounded-lg bg-gray-200" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 rounded-xl border border-line bg-white p-4">
            <div className="h-3 w-20 rounded bg-gray-100" />
            <div className="mt-3 h-6 w-28 rounded bg-gray-200" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-64 rounded-xl border border-line bg-white" />
        <div className="h-64 rounded-xl border border-line bg-white" />
      </div>
    </div>
  );
}

/** 스토어 준비 전에는 콘텐츠만 스켈레톤으로 대체, 준비되면 페이드 인 */
function ContentGate({ children }: { children: React.ReactNode }) {
  const { ready } = useAppStore();
  if (!ready) return <ContentSkeleton />;
  return <div className="animate-fade-in">{children}</div>;
}

/** 공통 셸 레이아웃 — 데스크톱 사이드바 / 모바일 상단 로고 + 하단 탭바 */
export function AppShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { resetToSample } = useAppStore();
  const toast = useToast();
  const active = tabFromPath(pathname ?? "/");
  const [resetOpen, setResetOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-600 focus:shadow-lg"
      >
        본문으로 건너뛰기
      </a>

      {/* 좌측 사이드바 (데스크톱) */}
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-line bg-white p-4 md:flex">
        <Link href="/" className="mb-5 flex items-center gap-3 border-b border-gray-100 pb-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-base font-bold text-white" aria-hidden="true">
            H7
          </span>
          <span>
            <span className="block text-lg font-bold leading-tight text-gray-900">하퍼세븐</span>
            <span className="block text-[11px] font-medium tracking-[.18em] text-gray-500">HAPER SEVEN FC</span>
          </span>
        </Link>

        <div className="mb-5 flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50" aria-hidden="true">
            <ShieldCheck size={18} className="text-brand-600" />
          </span>
          <span>
            <span className="block text-sm font-bold text-gray-900">운영자</span>
            <span className="flex items-center gap-1 text-[11px] text-gray-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" /> 관리자
            </span>
          </span>
        </div>

        <nav className="flex-1 space-y-1" aria-label="주 메뉴">
          {NAV.map(({ key, label, icon: Icon }) => (
            <Link
              key={key}
              href={TAB_PATH[key]}
              aria-current={active === key ? "page" : undefined}
              className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm transition-colors duration-100 ${
                active === key
                  ? "bg-brand-50 font-semibold text-brand-600"
                  : "font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon size={18} className="shrink-0" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="space-y-1 border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className="flex items-center gap-2 rounded px-1 py-1 text-xs text-gray-500 hover:text-gray-800"
          >
            <Settings size={14} aria-hidden="true" /> 설정 · 샘플 초기화
          </button>
          <div className="px-1 text-[11px] text-gray-500">© 하퍼세븐 FC · {APP_VERSION}</div>
        </div>
      </aside>

      {/* 상단바 (모바일) — 로고만, 안전영역 고려 */}
      <header className="sticky top-0 z-30 border-b border-line bg-white pt-[env(safe-area-inset-top)] md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-base font-bold text-gray-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white" aria-hidden="true">
              H7
            </span>
            하퍼세븐
          </Link>
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className="inline-grid h-10 w-10 place-items-center rounded-lg text-gray-500 hover:bg-gray-100"
            aria-label="설정 · 샘플 초기화"
          >
            <Settings size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* 본문 */}
      <main id="main" className="min-w-0 flex-1 bg-app pb-[calc(env(safe-area-inset-bottom)+4.5rem)] md:pb-0">
        <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          <ContentGate>{children}</ContentGate>
        </div>
      </main>

      {/* 하단 탭바 (모바일) — 6개 탭 모두 한 화면에, 안전영역 패딩 */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="주 메뉴"
      >
        {NAV.map(({ key, label, icon: Icon }) => (
          <Link
            key={key}
            href={TAB_PATH[key]}
            aria-current={active === key ? "page" : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium ${
              active === key ? "text-brand-600" : "text-gray-500"
            }`}
          >
            <Icon size={20} aria-hidden="true" strokeWidth={active === key ? 2.25 : 2} />
            {label}
          </Link>
        ))}
      </nav>

      <ConfirmDialog
        open={resetOpen}
        title="샘플 데이터로 초기화"
        message="회원·회비·경기·포메이션 기록이 모두 지워지고 기본 샘플로 바뀝니다. 되돌릴 수 없습니다."
        confirmLabel="초기화"
        onConfirm={() => {
          resetToSample();
          setResetOpen(false);
          toast("샘플 데이터로 초기화했습니다.", "info");
        }}
        onCancel={() => setResetOpen(false)}
      />
    </div>
  );
}
