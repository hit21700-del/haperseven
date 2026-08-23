import type { Config } from "tailwindcss";
import { POS_HEX } from "./src/lib/constants/positionColors";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // hover: 스타일을 호버 가능한 포인터 기기에서만 적용 (터치 sticky hover 방지)
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      colors: {
        // 하퍼세븐 브랜드 보라 (globals.css --brand 와 동일 값)
        brand: {
          50: "#F0EEFF",
          100: "#E4E1FF",
          200: "#CDC7FF",
          300: "#B3AAFF",
          400: "#8F82F7",
          500: "#6D5FF3",
          600: "#5B4CF0",
          700: "#4C3EE5",
          800: "#3A2BC7",
        },
        // 앱 배경 / 보더 시맨틱 토큰
        app: "#F5F6FA",
        line: "#E4E7EC",
        // 포메이션(전술 보드) 서피스
        pitch: {
          bg: "#0B1117",
          surface: "#12181F",
          surface2: "#1A202A",
          green: "#20E878",
        },
        // 포지션 컬러 (단일 원천: src/lib/constants/positionColors.ts)
        pos: {
          fw: POS_HEX.FW,
          mf: POS_HEX.MF,
          df: POS_HEX.DF,
          gk: POS_HEX.GK,
        },
      },
      keyframes: {
        "modal-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "toast-in": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
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
