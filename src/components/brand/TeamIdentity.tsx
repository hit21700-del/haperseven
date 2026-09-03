"use client";
import React from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { LogoBox, Wordmark } from "@/components/brand/Logo";
import type { Team } from "@/lib/repository/cloudRepository";

/** 팀 로고: 하퍼세븐 마스크 로고 / 업로드 이미지 / 이름 첫 글자 배지 */
export function TeamLogo({ team, size = 44 }: { team: Team | null; size?: number }) {
  if (!team || team.logo_url === "/logo-mark.png") return <LogoBox size={size} />;
  if (team.logo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={team.logo_url}
        width={size}
        height={size}
        alt=""
        aria-hidden="true"
        className="shrink-0 rounded-xl border border-line-soft object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-xl bg-brand font-bold text-brand-fg"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {team.name.trim().charAt(0) || "T"}
    </span>
  );
}

/**
 * 앱 셸용 팀 아이덴티티 — cloud 모드에서 소속 팀의 로고·이름·분류코드를 보여준다.
 * local 모드(또는 팀 로드 전)는 기존 하퍼세븐 브랜딩을 유지.
 */
export function TeamIdentity({ size = "md" }: { size?: "sm" | "md" }) {
  const { mode, team } = useAuth();
  const px = size === "md" ? 44 : 32;
  if (mode === "local" || !team) {
    return (
      <>
        <LogoBox size={px} />
        <Wordmark size={size} />
      </>
    );
  }
  return (
    <>
      <TeamLogo team={team} size={px} />
      <span className="min-w-0">
        <span className={`block truncate font-bold leading-tight text-fg ${size === "md" ? "text-lg" : "text-base"}`}>
          {team.name}
        </span>
        <span className="block text-[10px] font-semibold uppercase tracking-[.22em] text-fg-muted">{team.code}</span>
      </span>
    </>
  );
}
