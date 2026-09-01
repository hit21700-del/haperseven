"use client";
import React from "react";
import { Clock, ShieldOff } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { LogoBox, Wordmark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";

/** 가입 후 승인 대기 / 차단 상태 화면 */
export function PendingScreen() {
  const { profile, signOut } = useAuth();
  const blocked = profile?.status === "blocked";
  return (
    <main className="flex min-h-screen items-center justify-center bg-app px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 text-center shadow-sm dark:shadow-none">
        <div className="mb-5 flex items-center justify-center gap-3">
          <LogoBox size={44} />
          <Wordmark />
        </div>
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-3 text-fg-muted" aria-hidden="true">
          {blocked ? <ShieldOff size={22} /> : <Clock size={22} />}
        </span>
        <p className="text-base font-bold text-fg">{blocked ? "이용이 제한된 계정입니다" : "운영자 승인을 기다리는 중입니다"}</p>
        <p className="mt-2 text-sm text-fg-muted">
          {blocked
            ? "운영자에게 문의해 주세요."
            : `${profile?.display_name ?? profile?.email ?? "회원"}님, 운영자가 승인하면 이 화면이 자동으로 바뀝니다.`}
        </p>
        <Button variant="secondary" className="mt-5 w-full" onClick={() => void signOut()}>
          로그아웃
        </Button>
      </div>
    </main>
  );
}
