import type { Metadata } from "next";
import "./globals.css";
import { AppStoreProvider } from "@/lib/store/AppStore";

export const metadata: Metadata = {
  title: "하퍼세븐 | 축구팀 관리",
  description: "축구팀 하퍼세븐 회원/회비/경기/포메이션 관리 웹앱",
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
