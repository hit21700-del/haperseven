import React from "react";
import type { MemberType, TeamColor } from "@/types/member";
import { TEAM_LABEL } from "@/types/member";

type Tone = "green" | "red" | "yellow" | "gray" | "blue" | "purple";

const TONE_CLASS: Record<Tone, string> = {
  green: "border border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  red: "border border-rose-400/30 bg-rose-500/10 text-rose-300",
  yellow: "border border-amber-400/30 bg-amber-500/10 text-amber-300",
  gray: "border border-slate-400/30 bg-slate-500/10 text-slate-300",
  blue: "border border-sky-400/30 bg-sky-500/10 text-sky-300",
  purple: "border border-purple-400/30 bg-purple-500/10 text-purple-300",
};

export function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-block rounded-sm px-1.5 py-0.5 text-xs font-bold ${TONE_CLASS[tone]}`}>{children}</span>
  );
}

/** 회비 납부 상태 배지 (완료 초록 / 미납 빨강 / 일부 노랑 / 면제 회색) */
export function PaymentStatusBadge({ status }: { status: "완료" | "일부" | "미납" | "면제" }) {
  const tone: Tone = status === "완료" ? "green" : status === "미납" ? "red" : status === "일부" ? "yellow" : "gray";
  return <Badge tone={tone}>{status}</Badge>;
}

/** 회원 구분 배지 */
export function MemberTypeBadge({ type }: { type: MemberType }) {
  const tone: Tone =
    type === "스텝" || type === "회장"
      ? "purple"
      : type.startsWith("정회원")
        ? "blue"
        : type === "학생"
          ? "green"
          : type === "준회원"
            ? "yellow"
            : type === "용병"
              ? "gray"
              : "gray";
  return <Badge tone={tone}>{type}</Badge>;
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

/** 자체전 팀 배지 (화이트=밝은 실버 / 블랙=다크). 감독이면 ⭐ */
export function TeamBadge({ team, coach }: { team?: TeamColor; coach?: boolean }) {
  if (!team) return <span className="text-xs text-slate-500">-</span>;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-sm px-2 py-0.5 text-xs font-bold ${
        team === "WHITE"
          ? "border border-slate-300/60 bg-white/90 text-slate-900"
          : "border border-white/30 bg-black text-white"
      }`}
    >
      {coach && <span title="감독">⭐</span>}
      {TEAM_LABEL[team]}
    </span>
  );
}

/** 포지션 배지 (FW 로즈 / MF 라임 / DF 스카이 / GK 옐로) */
export function PositionBadge({ position }: { position: string }) {
  const cls =
    position === "GK"
      ? "border-amber-300/40 bg-amber-500/10 text-yellow-300"
      : position === "DF"
        ? "border-sky-400/30 bg-sky-500/10 text-sky-300"
        : position === "MF"
          ? "border-lime-400/30 bg-lime-500/10 text-lime-300"
          : position === "FW"
            ? "border-rose-400/30 bg-rose-500/10 text-rose-300"
            : "border-slate-400/30 bg-slate-500/10 text-slate-300";
  return <span className={`inline-block rounded-sm border px-1.5 py-0.5 text-xs font-bold ${cls}`}>{position}</span>;
}
