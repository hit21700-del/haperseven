import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 브랜드 인디고/블루 (레트로 다크 테마와 병용)
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
        },
        accent: {
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
        },
        sidebar: "#15152a",
        sidebar2: "#1e1e3a",
      },
      boxShadow: {
        chrome: "inset 0 1px 0 rgba(255,255,255,.65), inset 0 -1px 0 rgba(0,0,0,.8), 0 8px 24px rgba(0,0,0,.35)",
        blueGlow: "0 0 0 1px rgba(92,148,255,.35), 0 0 22px rgba(24,92,255,.45)",
        panel: "0 18px 48px rgba(3,8,24,.44)",
      },
    },
  },
  plugins: [],
};

export default config;
