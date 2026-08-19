import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppStoreProvider } from "@/lib/store/AppStore";

export const metadata: Metadata = {
  metadataBase: new URL("https://haperseven.onrender.com"),
  title: {
    default: "하퍼세븐 | 축구팀 관리",
    template: "%s | 하퍼세븐",
  },
  description: "축구팀 하퍼세븐 회원/회비/경기/포메이션 관리 웹앱",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "하퍼세븐",
    title: "하퍼세븐 | 축구팀 관리",
    description: "회원 · 회비 · 경기 · 포메이션까지, 하퍼세븐 FC 운영의 모든 것",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "하퍼세븐 FC 팀 관리" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "하퍼세븐 | 축구팀 관리",
    description: "회원 · 회비 · 경기 · 포메이션까지, 하퍼세븐 FC 운영의 모든 것",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#5B4CF0",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AppStoreProvider>{children}</AppStoreProvider>
      </body>
    </html>
  );
}
