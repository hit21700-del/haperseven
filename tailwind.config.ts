import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 하퍼세븐 브랜드 보라 (라이트 SaaS 테마)
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
        accent: {
          300: "#B3AAFF",
          400: "#8F82F7",
          500: "#6D5FF3",
        },
        // 포메이션(FC24 다크) 서피스
        pitch: {
          bg: "#0B0F14",
          surface: "#12161D",
          surface2: "#1A202A",
        },
        // 포지션 컬러
        pos: {
          fw: "#ff5666",
          mf: "#31ef76",
          df: "#45a1ff",
          gk: "#ffc928",
        },
      },
    },
  },
  plugins: [],
};

export default config;
