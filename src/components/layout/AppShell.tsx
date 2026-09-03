"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CircleDollarSign,
  LayoutDashboard,
  LogOut,
  Monitor,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  Trophy,
  User,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { useAppStore } from "@/lib/store/AppStore";
import { useAuth } from "@/lib/auth/AuthProvider";
import { TeamIdentity } from "@/components/brand/TeamIdentity";
import { TAB_PATH, tabFromPath, type TabKey } from "./NavContext";
import { useTheme, type ThemePref } from "./ThemeProvider";

const NAV: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "dashboard", label: "대시보드", icon: LayoutDashboard },
  { key: "members", label: "회원", icon: Users },
  { key: "payments", label: "회비", icon: CircleDollarSign },
  { key: "matches", label: "경기", icon: Trophy },
  { key: "formation", label: "포메이션", icon: Workflow },
  { key: "stats", label: "통계", icon: BarChart3 },
];

const APP_VERSION = "v3.0.0";

const THEME_OPTIONS: { value: ThemePref; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "라이트", icon: Sun },
  { value: "dark", label: "다크", icon: Moon },
  { value: "system", label: "시스템", icon: Monitor },
];

/** 테마 선택 세그먼트 (라이트 / 다크 / 시스템) */
function ThemeSwitch() {
  const { pref, setPref } = useTheme();
  return (
    <div className="grid grid-cols-3 rounded-lg border border-line bg-surface-2 p-0.5" role="group" aria-label="화면 테마">
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setPref(value)}
          aria-pressed={pref === value}
          className={`flex min-h-8 items-center justify-center gap-1 rounded-md text-[11px] font-medium transition-colors duration-100 ${
            pref === value ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg"
          }`}
        >
          <Icon size={13} aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}

/** 모바일용 테마 토글 — 라이트 ↔ 다크 */
function ThemeToggleButton() {
  const { resolved, setPref } = useTheme();
  const Icon = resolved === "dark" ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={() => setPref(resolved === "dark" ? "light" : "dark")}
      className="inline-grid h-10 w-10 place-items-center rounded-lg text-fg-muted hover:bg-surface-3 hover:text-fg"
      aria-label={resolved === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}

/** 스토어 로드 전 콘텐츠 영역 스켈레톤 (셸/네비는 즉시 표시) */
function ContentSkeleton() {
  return (
    <div className="animate-pulse-fast space-y-5" aria-label="불러오는 중" role="status">
      <div className="h-8 w-44 rounded-lg bg-surface-3" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 rounded-xl border border-line bg-surface p-4">
            <div className="h-3 w-20 rounded bg-surface-2" />
            <div className="mt-3 h-6 w-28 rounded bg-surface-3" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-64 rounded-xl border border-line bg-surface" />
        <div className="h-64 rounded-xl border border-line bg-surface" />
      </div>
    </div>
  );
}

function ContentGate({ children }: { children: React.ReactNode }) {
  const { ready } = useAppStore();
  if (!ready) return <ContentSkeleton />;
  return <div className="animate-fade-in">{children}</div>;
}

/** 사용자 카드 — cloud 모드면 실제 계정, local 모드면 운영자 */
function UserCard() {
  const { mode, profile } = useAuth();
  const name = mode === "cloud" ? profile?.display_name ?? profile?.email ?? "계정" : "운영자";
  const roleLabel = mode === "cloud" ? (profile?.role === "operator" ? "운영자" : "회원") : "관리자";
  const Icon = mode === "cloud" && profile?.role !== "operator" ? User : ShieldCheck;
  return (
    <Link
      href="/settings"
      className="mb-5 flex items-center gap-3 rounded-xl border border-line-soft bg-surface-2 px-3 py-2.5 hover:bg-surface-3"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50" aria-hidden="true">
        <Icon size={18} className="text-brand" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-fg">{name}</span>
        <span className="flex items-center gap-1 text-[11px] text-fg-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" /> {roleLabel}
        </span>
      </span>
    </Link>
  );
}

/** 공통 셸 레이아웃 — 데스크톱 사이드바 / 모바일 상단 로고 + 하단 탭바 */
export function AppShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { mode, signOut } = useAuth();
  const active = tabFromPath(pathname ?? "/");
  const onSettings = pathname?.startsWith("/settings");

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-fg focus:shadow-lg"
      >
        본문으로 건너뛰기
      </a>

      {/* 좌측 사이드바 (데스크톱) */}
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-line bg-surface p-4 md:flex">
        <Link href="/" className="mb-5 flex items-center gap-3 border-b border-line-soft pb-5">
          <TeamIdentity />
        </Link>

        <UserCard />

        <nav className="flex-1 space-y-1" aria-label="주 메뉴">
          {NAV.map(({ key, label, icon: Icon }) => (
            <Link
              key={key}
              href={TAB_PATH[key]}
              aria-current={active === key ? "page" : undefined}
              className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm transition-colors duration-100 ${
                active === key ? "bg-brand font-semibold text-brand-fg" : "font-medium text-fg-2 hover:bg-surface-2 hover:text-fg"
              }`}
            >
              <Icon size={18} className="shrink-0" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="space-y-3 border-t border-line-soft pt-3">
          <ThemeSwitch />
          <div className="flex items-center justify-between">
            <Link
              href="/settings"
              aria-current={onSettings ? "page" : undefined}
              className={`flex items-center gap-2 rounded px-1 py-1 text-xs hover:text-fg ${onSettings ? "font-semibold text-fg" : "text-fg-muted"}`}
            >
              <Settings size={14} aria-hidden="true" /> 설정 · 계정
            </Link>
            {mode === "cloud" && (
              <button
                type="button"
                onClick={() => void signOut()}
                className="flex items-center gap-1 rounded px-1 py-1 text-xs text-fg-muted hover:text-fg"
              >
                <LogOut size={14} aria-hidden="true" /> 로그아웃
              </button>
            )}
          </div>
          <div className="px-1 text-[11px] text-fg-muted">© Harper Seven · {APP_VERSION}</div>
        </div>
      </aside>

      {/* 상단바 (모바일) */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface pt-[env(safe-area-inset-top)] md:hidden">
        <div className="flex items-center justify-between px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <TeamIdentity size="sm" />
          </Link>
          <div className="flex items-center">
            <ThemeToggleButton />
            <Link
              href="/settings"
              className={`inline-grid h-10 w-10 place-items-center rounded-lg hover:bg-surface-3 ${onSettings ? "text-fg" : "text-fg-muted"}`}
              aria-label="설정 · 계정"
            >
              <Settings size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      {/* 본문 */}
      <main id="main" className="min-w-0 flex-1 bg-app pb-[calc(env(safe-area-inset-bottom)+4.5rem)] md:pb-0">
        <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          <ContentGate>{children}</ContentGate>
        </div>
      </main>

      {/* 하단 탭바 (모바일) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="주 메뉴"
      >
        {NAV.map(({ key, label, icon: Icon }) => (
          <Link
            key={key}
            href={TAB_PATH[key]}
            aria-current={active === key ? "page" : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium ${
              active === key ? "text-fg" : "text-fg-muted"
            }`}
          >
            <Icon size={20} aria-hidden="true" strokeWidth={active === key ? 2.5 : 2} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
