"use client";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ThemePref = "light" | "dark" | "system";
type Resolved = "light" | "dark";

const STORAGE_KEY = "haperseven:theme";

const ThemeContext = createContext<{
  pref: ThemePref;
  resolved: Resolved;
  setPref: (p: ThemePref) => void;
}>({ pref: "system", resolved: "light", setPref: () => {} });

/** 첫 페인트 전에 <html class="dark"> 를 맞추는 인라인 스크립트 (layout.tsx 에서 사용) */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");var d=t==="dark"||((!t||t==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

function systemDark() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>("system");
  const [resolved, setResolved] = useState<Resolved>("light");

  // 저장된 선호 로드 + 시스템 변경 감지
  useEffect(() => {
    let stored: ThemePref = "system";
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s === "light" || s === "dark" || s === "system") stored = s;
    } catch {}
    setPrefState(stored);
    const apply = (p: ThemePref) => {
      const dark = p === "dark" || (p === "system" && systemDark());
      document.documentElement.classList.toggle("dark", dark);
      setResolved(dark ? "dark" : "light");
    };
    apply(stored);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const cur = (localStorage.getItem(STORAGE_KEY) as ThemePref | null) ?? "system";
      if (cur === "system") apply("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p);
    try {
      localStorage.setItem(STORAGE_KEY, p);
    } catch {}
    const dark = p === "dark" || (p === "system" && systemDark());
    document.documentElement.classList.toggle("dark", dark);
    setResolved(dark ? "dark" : "light");
  }, []);

  return <ThemeContext.Provider value={{ pref, resolved, setPref }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
