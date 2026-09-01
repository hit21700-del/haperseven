"use client";
// ─────────────────────────────────────────────────────────────
// 인증 컨텍스트 — Supabase 세션 + 프로필(역할/승인 상태)
//   Supabase 미설정(localStorage 모드)이면 mode="local" 로 모든 게이트를 통과시킨다.
// ─────────────────────────────────────────────────────────────
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchMyProfile, type Profile } from "@/lib/repository/cloudRepository";

type AuthState = {
  mode: "local" | "cloud";
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  /** 승인된 계정 (읽기 가능) */
  isApproved: boolean;
  /** 운영자 (쓰기 가능). local 모드는 항상 true */
  canWrite: boolean;
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  signUpWithPassword: (email: string, password: string, name: string) => Promise<string | null>;
  signInWithOAuth: (provider: "kakao" | "google") => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const cloud = isSupabaseConfigured();
  const [loading, setLoading] = useState(cloud);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    try {
      setProfile(await fetchMyProfile(userId));
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (!cloud) return;
    const sb = getSupabase();
    let active = true;
    sb.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      await loadProfile(s?.user.id);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [cloud, loadProfile]);

  // 내 프로필 변경(승인/역할) 실시간 반영 — 승인 대기 화면이 자동으로 풀린다
  useEffect(() => {
    if (!cloud || !session?.user.id) return;
    const sb = getSupabase();
    const ch = sb
      .channel(`profile-${session.user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${session.user.id}` },
        () => void loadProfile(session.user.id),
      )
      .subscribe();
    return () => {
      void sb.removeChannel(ch);
    };
  }, [cloud, session?.user.id, loadProfile]);

  const value = useMemo<AuthState>(() => {
    const isApproved = !cloud || profile?.status === "approved";
    const canWrite = !cloud || (profile?.status === "approved" && profile.role === "operator");
    return {
      mode: cloud ? "cloud" : "local",
      loading,
      session,
      profile,
      isApproved,
      canWrite,
      async signInWithPassword(email, password) {
        const { error } = await getSupabase().auth.signInWithPassword({ email, password });
        return error ? translateAuthError(error.message) : null;
      },
      async signUpWithPassword(email, password, name) {
        const { error } = await getSupabase().auth.signUp({ email, password, options: { data: { name } } });
        return error ? translateAuthError(error.message) : null;
      },
      async signInWithOAuth(provider) {
        const { error } = await getSupabase().auth.signInWithOAuth({
          provider,
          options: { redirectTo: `${window.location.origin}/` },
        });
        return error ? translateAuthError(error.message) : null;
      },
      async signOut() {
        await getSupabase().auth.signOut();
        setProfile(null);
        setSession(null);
      },
      async refreshProfile() {
        await loadProfile(session?.user.id);
      },
    };
  }, [cloud, loading, session, profile, loadProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth 는 AuthProvider 안에서 사용해야 합니다.");
  return ctx;
}

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (m.includes("user already registered")) return "이미 가입된 이메일입니다. 로그인해 주세요.";
  if (m.includes("password should be at least")) return "비밀번호는 6자 이상이어야 합니다.";
  if (m.includes("email not confirmed")) return "이메일 인증이 필요합니다. 운영자에게 문의하세요.";
  if (m.includes("provider is not enabled") || m.includes("unsupported provider"))
    return "이 로그인 방식은 아직 설정되지 않았습니다. 운영자에게 문의하세요.";
  if (m.includes("rate limit")) return "요청이 너무 많습니다. 잠시 후 다시 시도하세요.";
  return msg;
}
