"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { LogoBox, Wordmark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { FormRow, TextInput } from "@/components/ui/Field";

/** 로그인 / 가입 화면 — 카카오·구글 SSO + 이메일/비밀번호 */
export function LoginPage() {
  const router = useRouter();
  const { mode, loading, session, signInWithPassword, signUpWithPassword, signInWithOAuth } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // 이미 로그인됐거나 로컬 모드면 홈으로
  useEffect(() => {
    if (mode === "local" || (!loading && session)) router.replace("/");
  }, [mode, loading, session, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) return setError("이메일과 비밀번호를 입력하세요.");
    if (tab === "signup" && !name.trim()) return setError("이름을 입력하세요.");
    setBusy(true);
    const err =
      tab === "signin"
        ? await signInWithPassword(email.trim(), password)
        : await signUpWithPassword(email.trim(), password, name.trim());
    setBusy(false);
    if (err) return setError(err);
    if (tab === "signup") setDone(true);
  };

  const oauth = async (provider: "kakao" | "google") => {
    setError(null);
    setBusy(true);
    const err = await signInWithOAuth(provider);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-app px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-3">
          <LogoBox size={48} />
          <Wordmark />
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm dark:shadow-none">
          {done ? (
            <div className="text-center">
              <p className="text-base font-bold text-fg">가입 요청이 접수됐습니다</p>
              <p className="mt-2 text-sm text-fg-muted">
                운영자가 승인하면 이용할 수 있습니다. 승인되면 이 화면이 자동으로 바뀝니다.
              </p>
              <Button className="mt-4 w-full" onClick={() => router.replace("/")}>
                확인
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-2 rounded-lg border border-line bg-surface-2 p-0.5" role="tablist">
                {(
                  [
                    ["signin", "로그인"],
                    ["signup", "가입"],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={tab === k}
                    onClick={() => {
                      setTab(k);
                      setError(null);
                    }}
                    className={`min-h-9 rounded-md text-sm font-semibold transition-colors duration-100 ${
                      tab === k ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* SSO */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => oauth("kakao")}
                  disabled={busy}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#FEE500] text-sm font-semibold text-[#191919] transition hover:brightness-95 disabled:opacity-50"
                >
                  <KakaoIcon />
                  카카오로 {tab === "signin" ? "로그인" : "시작하기"}
                </button>
                <button
                  type="button"
                  onClick={() => oauth("google")}
                  disabled={busy}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface text-sm font-semibold text-fg transition hover:bg-surface-2 disabled:opacity-50"
                >
                  <GoogleIcon />
                  Google로 {tab === "signin" ? "로그인" : "시작하기"}
                </button>
              </div>

              <div className="my-4 flex items-center gap-3 text-xs text-fg-muted">
                <span className="h-px flex-1 bg-line" />
                또는 이메일로
                <span className="h-px flex-1 bg-line" />
              </div>

              <form onSubmit={submit} className="space-y-3">
                {tab === "signup" && (
                  <FormRow label="이름 (회원 명단과 같은 이름)">
                    <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" autoComplete="name" />
                  </FormRow>
                )}
                <FormRow label="이메일">
                  <TextInput
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </FormRow>
                <FormRow label="비밀번호" hint={tab === "signup" ? "6자 이상" : undefined} error={error}>
                  <TextInput
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={tab === "signin" ? "current-password" : "new-password"}
                    aria-invalid={!!error}
                  />
                </FormRow>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "처리 중…" : tab === "signin" ? "로그인" : "가입 요청"}
                </Button>
              </form>

              <p className="mt-4 text-center text-xs text-fg-muted">
                {tab === "signin" ? "처음이신가요? 가입 후 운영자 승인이 필요합니다." : "가입 후 운영자가 승인하면 이용할 수 있습니다."}
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#191919"
        d="M12 3C6.48 3 2 6.58 2 10.99c0 2.84 1.87 5.34 4.69 6.76-.2.74-.75 2.72-.86 3.14-.13.52.19.51.4.37.17-.11 2.66-1.8 3.74-2.53.66.1 1.34.15 2.03.15 5.52 0 10-3.58 10-7.99S17.52 3 12 3z"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.5 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.7 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-2.8-.4-4H24v7.6h12.7c-.3 2.1-1.6 5.2-4.6 7.3l7.1 5.5c4.2-3.9 7.3-9.7 7.3-16.4z" />
      <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-2.9-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.5 0 20.1 0 24s1 7.5 2.6 10.7l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.1-5.5c-2 1.4-4.7 2.3-8.5 2.3-6.3 0-11.6-4.2-13.5-10l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}
