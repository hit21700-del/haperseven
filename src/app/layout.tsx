import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppStoreProvider } from "@/lib/store/AppStore";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/components/layout/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  metadataBase: new URL("https://haperseven.onrender.com"),
  title: {
    default: "하퍼세븐 | 축구팀 관리",
    template: "%s | 하퍼세븐",
  },
  description: "축구팀 하퍼세븐(Harper Seven) 회원/회비/경기/포메이션 관리 웹앱",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "하퍼세븐",
    title: "하퍼세븐 | 축구팀 관리",
    description: "회원 · 회비 · 경기 · 포메이션까지, Harper Seven 운영의 모든 것",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Harper Seven 팀 관리" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "하퍼세븐 | 축구팀 관리",
    description: "회원 · 회비 · 경기 · 포메이션까지, Harper Seven 운영의 모든 것",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#111318" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0D12" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* 첫 페인트 전에 다크 클래스 적용 (테마 깜빡임 방지) */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <AppStoreProvider>{children}</AppStoreProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
