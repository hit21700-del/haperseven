import React from "react";
import type { MemberType, TeamColor } from "@/types/member";
import { TEAM_LABEL } from "@/types/member";

type Tone = "green" | "red" | "yellow" | "gray" | "blue" | "purple";

/* 12px 텍스트 기준 AA 통과 쌍 — 상태(성공/위험/경고)에만 사용. 다크에서는 반투명 배경 + 밝은 텍스트 */
const TONE_CLASS: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  red: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  yellow: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  gray: "bg-surface-3 text-fg-2",
  blue: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  purple: "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
};

export function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASS[tone]}`}>
      {children}
    </span>
  );
}

/** 회비 납부 상태 배지 (완료 초록 / 미납 빨강 / 일부 노랑 / 면제 회색) */
export function PaymentStatusBadge({ status }: { status: "완료" | "일부" | "미납" | "면제" }) {
  const tone: Tone = status === "완료" ? "green" : status === "미납" ? "red" : status === "일부" ? "yellow" : "gray";
  return <Badge tone={tone}>{status}</Badge>;
}

/** 회원 구분 배지 — 카테고리이므로 상태색과 충돌하지 않도록 중립색 */
export function MemberTypeBadge({ type }: { type: MemberType }) {
  const inactive = type === "휴식" || type === "탈퇴";
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full bg-surface-3 px-2 py-0.5 text-xs font-medium ${
        inactive ? "text-fg-muted" : "text-fg-2"
      }`}
    >
      {type}
    </span>
  );
}

/** 출석 상태 배지 */
export function AttendanceBadge({ status }: { status: "ATTEND" | "ABSENT" | "LATE" | "INJURED" }) {
  const map = {
    ATTEND: { label: "참석", tone: "green" as Tone },
    ABSENT: { label: "불참", tone: "gray" as Tone },
    LATE: { label: "지각", tone: "yellow" as Tone },
    INJURED: { label: "부상", tone: "red" as Tone },
  };
  const { label, tone } = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}

/** 자체전 팀 배지 — 팀 색 자체가 의미라 테마와 무관하게 흰/검정 고정. 감독이면 ⭐ */
export function TeamBadge({ team, coach }: { team?: TeamColor; coach?: boolean }) {
  if (!team) return <span className="text-xs text-fg-muted">-</span>;
  return (
    <span
      className={`inline-flex items-center gap-0.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        team === "WHITE" ? "border border-gray-300 bg-white text-gray-900" : "border border-white/20 bg-black text-white"
      }`}
    >
      {coach && (
        <span title="감독" aria-label="감독">
          ⭐
        </span>
      )}
      {TEAM_LABEL[team]}
    </span>
  );
}

/** 포지션 배지 — 라이트 화면에서는 중립색 + 굵은 텍스트 (색상 구분은 전술 보드에서만) */
export function PositionBadge({ position }: { position: string }) {
  return (
    <span className="inline-block whitespace-nowrap rounded-full bg-surface-3 px-2 py-0.5 text-xs font-bold tracking-wide text-fg-2">
      {position}
    </span>
  );
}
