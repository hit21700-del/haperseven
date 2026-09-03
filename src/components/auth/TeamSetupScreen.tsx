"use client";
import React, { useState } from "react";
import { LogIn, PlusCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { LogoBox, Wordmark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { FormRow, TextInput } from "@/components/ui/Field";

/**
 * 로그인 후 아직 팀이 없는 계정의 팀 설정 화면
 *  - 팀 코드로 가입: 운영자에게 받은 분류코드 입력 → 승인 대기
 *  - 새 팀 만들기: 팀 이름 + 분류코드 → 만든 사람이 운영자
 */
export function TeamSetupScreen() {
  const { profile, joinTeam, createTeam, signOut } = useAuth();
  const [tab, setTab] = useState<"join" | "create">("join");
  const [joinCode, setJoinCode] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const err =
      tab === "join"
        ? await joinTeam(joinCode.trim())
        : await createTeam(teamName.trim(), teamCode.trim());
    setBusy(false);
    if (err) setError(err);
    // 성공하면 프로필이 갱신되어 게이트가 자동으로 다음 화면으로 넘긴다
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-app px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-3">
          <LogoBox size={48} />
          <Wordmark />
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm dark:shadow-none">
          <p className="text-base font-bold text-fg">
            {profile?.display_name ? `${profile.display_name}님, ` : ""}어느 팀에서 활동하시나요?
          </p>
          <p className="mt-1 text-sm text-fg-muted">팀 분류코드로 가입하거나, 새 팀을 만들어 시작하세요.</p>

          <div className="mt-4 grid grid-cols-2 rounded-lg border border-line bg-surface-2 p-0.5" role="tablist">
            {(
              [
                ["join", "팀 코드로 가입", LogIn],
                ["create", "새 팀 만들기", PlusCircle],
              ] as const
            ).map(([k, label, Icon]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => {
                  setTab(k);
                  setError(null);
                }}
                className={`flex min-h-9 items-center justify-center gap-1.5 rounded-md text-sm font-semibold transition-colors duration-100 ${
                  tab === k ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg"
                }`}
              >
                <Icon size={14} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-4 space-y-3">
            {tab === "join" ? (
              <FormRow label="팀 분류코드" hint="예: HSFC — 팀 운영자에게 받은 코드" error={error}>
                <TextInput
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="HSFC"
                  autoCapitalize="characters"
                  autoComplete="off"
                  aria-invalid={!!error}
                />
              </FormRow>
            ) : (
              <>
                <FormRow label="팀 이름">
                  <TextInput value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="예: 하퍼세븐FC" />
                </FormRow>
                <FormRow label="팀 분류코드" hint="영문/숫자 2~12자 — 팀원이 가입할 때 사용합니다" error={error}>
                  <TextInput
                    value={teamCode}
                    onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                    placeholder="HSFC"
                    autoCapitalize="characters"
                    autoComplete="off"
                    aria-invalid={!!error}
                  />
                </FormRow>
              </>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "처리 중…" : tab === "join" ? "가입 요청" : "팀 만들기"}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-fg-muted">
            {tab === "join"
              ? "가입 후 그 팀의 운영자가 승인하면 이용할 수 있습니다."
              : "새 팀을 만들면 내가 그 팀의 운영자가 됩니다."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void signOut()}
          className="mx-auto mt-4 block text-center text-xs text-fg-muted hover:text-fg"
        >
          다른 계정으로 로그인
        </button>
      </div>
    </main>
  );
}
