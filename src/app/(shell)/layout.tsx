"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShellLayout } from "@/components/layout/AppShell";
import { PendingScreen } from "@/components/auth/PendingScreen";
import { useAuth } from "@/lib/auth/AuthProvider";

/** 인증 게이트: cloud 모드에서 로그인·승인 상태에 따라 화면을 분기 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { mode, loading, session, isApproved } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (mode === "cloud" && !loading && !session) router.replace("/login");
  }, [mode, loading, session, router]);

  if (mode === "cloud") {
    if (loading || !session) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-app text-sm text-fg-muted" role="status">
          로그인 확인 중…
        </div>
      );
    }
    if (!isApproved) return <PendingScreen />;
  }
  return <AppShellLayout>{children}</AppShellLayout>;
}

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
