import type { Config } from "tailwindcss";
import { POS_HEX } from "./src/lib/constants/positionColors";

/** CSS 변수(RGB 트리플렛) 기반 색 — globals.css 의 :root / .dark 에서 값이 바뀐다 */
const v = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/app/**/*.{js,ts,jsx,tsx,mdx}", "./src/components/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  // hover: 스타일을 호버 가능한 포인터 기기에서만 적용 (터치 sticky hover 방지)
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      colors: {
        // ── 시맨틱 토큰 (라이트/다크 자동 전환) ──
        app: v("--c-app"),
        surface: { DEFAULT: v("--c-surface"), 2: v("--c-surface-2"), 3: v("--c-surface-3") },
        line: { DEFAULT: v("--c-line"), soft: v("--c-line-soft") },
        fg: { DEFAULT: v("--c-fg"), 2: v("--c-fg-2"), muted: v("--c-fg-muted") },
        // 브랜드 = 로고의 모노크롬 (라이트: 검정 / 다크: 흰색)
        brand: {
          DEFAULT: v("--c-brand"),
          fg: v("--c-brand-fg"),
          hover: v("--c-brand-hover"),
          50: "rgb(var(--c-brand) / 0.06)",
          100: "rgb(var(--c-brand) / 0.12)",
          200: "rgb(var(--c-brand) / 0.2)",
          300: "rgb(var(--c-brand) / 0.35)",
          400: "rgb(var(--c-brand) / 0.5)",
          500: v("--c-brand"),
          600: v("--c-brand"),
          700: v("--c-brand-hover"),
        },
        // 포메이션(전술 보드) — 테마와 무관하게 항상 다크
        pitch: { bg: "#0B1117", surface: "#12181F", surface2: "#1A202A", green: "#20E878" },
        // 포지션 컬러 (단일 원천: src/lib/constants/positionColors.ts)
        pos: { fw: POS_HEX.FW, mf: POS_HEX.MF, df: POS_HEX.DF, gk: POS_HEX.GK },
      },
      keyframes: {
        "modal-in": { from: { opacity: "0", transform: "scale(0.96)" }, to: { opacity: "1", transform: "scale(1)" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "toast-in": { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "modal-in": "modal-in 200ms cubic-bezier(0.23,1,0.32,1) both",
        "fade-in": "fade-in 180ms cubic-bezier(0.23,1,0.32,1) both",
        "toast-in": "toast-in 300ms cubic-bezier(0.23,1,0.32,1) both",
        "spin-fast": "spin 0.7s linear infinite",
        "pulse-fast": "pulse 1.4s cubic-bezier(0.4,0,0.6,1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
