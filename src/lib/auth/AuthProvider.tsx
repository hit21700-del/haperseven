"use client";
// ─────────────────────────────────────────────────────────────
// 인증 컨텍스트 — Supabase 세션 + 프로필(역할/승인 상태) + 소속 팀
//   Supabase 미설정(localStorage 모드)이면 mode="local" 로 모든 게이트를 통과시킨다.
// ─────────────────────────────────────────────────────────────
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  fetchMyProfile,
  fetchMyTeam,
  ensureProfile,
  setupCreateTeam,
  setupJoinTeam,
  type Profile,
  type Team,
} from "@/lib/repository/cloudRepository";

type AuthState = {
  mode: "local" | "cloud";
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  /** 내 소속 팀 (cloud + 팀 배정 후에만 값이 있다) */
  team: Team | null;
  /** 프로필을 조회하는 중 (로그인 직후 잠깐) */
  profileLoading: boolean;
  /** 프로필 조회에 실패함 (네트워크 오류 등) — 승인 대기와 구분한다 */
  profileError: boolean;
  /** 로그인은 됐지만 아직 팀을 만들거나 가입하지 않은 상태 */
  needsTeamSetup: boolean;
  /** 승인된 계정 (읽기 가능) */
  isApproved: boolean;
  /** 운영자 (쓰기 가능). local 모드는 항상 true */
  canWrite: boolean;
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  signUpWithPassword: (email: string, password: string, name: string) => Promise<string | null>;
  signInWithOAuth: (provider: "kakao" | "google") => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** 새 팀 만들기 (만든 사람 = 운영자). 오류 메시지 반환, 성공 시 null */
  createTeam: (name: string, code: string) => Promise<string | null>;
  /** 팀 분류코드로 가입 (승인 대기). 오류 메시지 반환, 성공 시 null */
  joinTeam: (code: string) => Promise<string | null>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const cloud = isSupabaseConfigured();
  const [loading, setLoading] = useState(cloud);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [profileLoading, setProfileLoading] = useState(cloud);
  const [profileError, setProfileError] = useState(false);

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      setTeam(null);
      setProfileError(false);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    try {
      let p = await fetchMyProfile(userId);
      // 프로필이 없으면(트리거 유실 / 운영자가 계정 삭제) 되살리고 한 번 더 조회
      if (!p) {
        try {
          await ensureProfile();
          p = await fetchMyProfile(userId);
        } catch {
          /* 되살리기 실패는 아래 조회 결과로 처리 */
        }
      }
      setProfile(p);
      setTeam(p?.team_id ? await fetchMyTeam() : null);
      setProfileError(false);
    } catch {
      // 조회 실패: 기존 프로필 상태는 유지하고(승인된 사용자가 갑자기 튕기지 않도록) 오류만 표시
      setProfileError(true);
    } finally {
      setProfileLoading(false);
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

  // 내 프로필 변경(승인/역할/팀) 실시간 반영 — 승인 대기 화면이 자동으로 풀린다
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

  // 승인 대기 중인 계정: 실시간 이벤트가 유실될 수 있으므로 탭 포커스/재연결 시 프로필 재조회
  useEffect(() => {
    if (!cloud || !session?.user.id) return;
    const pending = profile?.status !== "approved" || !profile?.team_id;
    if (!pending) return;
    const onWake = () => {
      if (document.visibilityState === "visible") void loadProfile(session.user.id);
    };
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onWake);
    document.addEventListener("visibilitychange", onWake);
    return () => {
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, [cloud, session?.user.id, profile?.status, profile?.team_id, loadProfile]);

  const value = useMemo<AuthState>(() => {
    const needsTeamSetup = cloud && !!session && !!profile && !profile.team_id;
    const isApproved = !cloud || (profile?.status === "approved" && !!profile.team_id);
    const canWrite = !cloud || (profile?.status === "approved" && profile.role === "operator" && !!profile.team_id);
    return {
      mode: cloud ? "cloud" : "local",
      loading,
      session,
      profile,
      team,
      profileLoading,
      profileError,
      needsTeamSetup,
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
          // 오류(사용자 취소·설정 오류)가 로그인 화면으로 돌아와 표시되도록 /login 으로 복귀
          options: { redirectTo: `${window.location.origin}/login` },
        });
        return error ? translateAuthError(error.message) : null;
      },
      async signOut() {
        await getSupabase().auth.signOut();
        setProfile(null);
        setTeam(null);
        setSession(null);
      },
      async refreshProfile() {
        await loadProfile(session?.user.id);
      },
      async createTeam(name, code) {
        try {
          await setupCreateTeam(name, code);
          await loadProfile(session?.user.id);
          return null;
        } catch (e) {
          return translateTeamError(e);
        }
      },
      async joinTeam(code) {
        try {
          await setupJoinTeam(code);
          await loadProfile(session?.user.id);
          return null;
        } catch (e) {
          return translateTeamError(e);
        }
      },
    };
  }, [cloud, loading, session, profile, team, profileLoading, profileError, loadProfile]);

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

function translateTeamError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("code_taken")) return "이미 사용 중인 분류코드입니다. 다른 코드를 입력하세요.";
  if (msg.includes("team_not_found")) return "해당 분류코드의 팀을 찾을 수 없습니다. 코드를 확인하세요.";
  if (msg.includes("already_in_team")) return "이미 팀에 소속돼 있습니다. 새로고침해 주세요.";
  if (msg.includes("invalid_code")) return "분류코드는 영문/숫자 2~12자여야 합니다.";
  if (msg.includes("team_name_required")) return "팀 이름을 입력하세요.";
  if (msg.includes("not_authenticated")) return "로그인이 필요합니다.";
  return "처리하지 못했습니다. 잠시 후 다시 시도하세요.";
}
