"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShellLayout } from "@/components/layout/AppShell";
import { PendingScreen } from "@/components/auth/PendingScreen";
import { TeamSetupScreen } from "@/components/auth/TeamSetupScreen";
import { useAuth } from "@/lib/auth/AuthProvider";

function CenterMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-4 text-sm text-fg-muted" role="status">
      {children}
    </div>
  );
}

/** 인증 게이트: cloud 모드에서 로그인·팀 설정·승인 상태에 따라 화면을 분기 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { mode, loading, session, profile, profileLoading, profileError, needsTeamSetup, isApproved, refreshProfile } =
    useAuth();
  const router = useRouter();

  useEffect(() => {
    if (mode === "cloud" && !loading && !session) router.replace("/login");
  }, [mode, loading, session, router]);

  if (mode === "cloud") {
    if (loading || !session) return <CenterMessage>로그인 확인 중…</CenterMessage>;
    // 프로필을 아직 못 받았으면 로딩 — '승인 대기' 화면이 잘못 깜빡이는 것을 막는다
    if (profileLoading && !profile) return <CenterMessage>계정 정보를 불러오는 중…</CenterMessage>;
    // 조회 실패로 상태를 알 수 없음 — 재시도 (승인된 사용자를 대기 화면에 가두지 않는다)
    if (profileError && !profile) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-app px-4 text-center">
          <p className="text-sm font-semibold text-fg">계정 정보를 불러오지 못했습니다</p>
          <p className="text-sm text-fg-muted">네트워크 상태를 확인한 뒤 다시 시도해 주세요.</p>
          <button
            type="button"
            onClick={() => void refreshProfile()}
            className="mt-1 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-fg hover:bg-brand-hover"
          >
            다시 시도
          </button>
        </main>
      );
    }
    if (needsTeamSetup) return <TeamSetupScreen />;
    if (!isApproved) return <PendingScreen />;
  }
  return <AppShellLayout>{children}</AppShellLayout>;
}

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
