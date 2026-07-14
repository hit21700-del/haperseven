import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ilgoli/FEDA 스타일 — 인디고/퍼플 액센트
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
        // 좌측 사이드바(다크) 배경
        sidebar: "#15152a",
        sidebar2: "#1e1e3a",
      },
    },
  },
  plugins: [],
};

export default config;
