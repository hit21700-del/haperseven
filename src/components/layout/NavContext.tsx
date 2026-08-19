"use client";
import { useCallback } from "react";
import { useRouter } from "next/navigation";

export type TabKey = "dashboard" | "members" | "payments" | "matches" | "formation" | "stats";

/** 탭 키 → 실제 라우트 경로 */
export const TAB_PATH: Record<TabKey, string> = {
  dashboard: "/",
  members: "/members",
  payments: "/payments",
  matches: "/matches",
  formation: "/formation",
  stats: "/stats",
};

/** 경로 → 탭 키 (사이드바 활성 표시용) */
export function tabFromPath(pathname: string): TabKey {
  const entry = (Object.entries(TAB_PATH) as [TabKey, string][]).find(
    ([, path]) => path !== "/" && pathname.startsWith(path),
  );
  return entry?.[0] ?? "dashboard";
}

/**
 * 화면 간 이동 훅. (기존 Context 기반 API와 동일한 시그니처 유지)
 * 대시보드 카드 등에서 `const go = useNav(); go("payments")` 형태로 사용.
 */
export function useNav() {
  const router = useRouter();
  return useCallback((tab: TabKey) => router.push(TAB_PATH[tab]), [router]);
}
