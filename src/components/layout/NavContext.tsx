"use client";
import { createContext, useContext } from "react";

export type TabKey = "dashboard" | "members" | "payments" | "matches" | "formation" | "stats";

/** 사이드바 외 다른 화면(대시보드 카드 등)에서 탭 이동을 호출하기 위한 컨텍스트 */
export const NavContext = createContext<(tab: TabKey) => void>(() => {});

export function useNav() {
  return useContext(NavContext);
}
