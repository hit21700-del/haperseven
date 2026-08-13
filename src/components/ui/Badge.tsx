import React from "react";
import type { MemberType, TeamColor } from "@/types/member";
import { TEAM_LABEL } from "@/types/member";

type Tone = "green" | "red" | "yellow" | "gray" | "blue" | "purple";

const TONE_CLASS: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-600",
  red: "bg-red-50 text-red-500",
  yellow: "bg-amber-50 text-amber-600",
  gray: "bg-gray-100 text-gray-500",
  blue: "bg-sky-50 text-sky-600",
  purple: "bg-purple-50 text-purple-600",
};

export function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASS[tone]}`}>{children}</span>
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

/** 자체전 팀 배지 (화이트=화이트 칩 / 블랙=다크 칩). 감독이면 ⭐ */
export function TeamBadge({ team, coach }: { team?: TeamColor; coach?: boolean }) {
  if (!team) return <span className="text-xs text-gray-300">-</span>;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
        team === "WHITE" ? "border border-gray-300 bg-white text-gray-800" : "bg-gray-900 text-white"
      }`}
    >
      {coach && <span title="감독">⭐</span>}
      {TEAM_LABEL[team]}
    </span>
  );
}

/** 포지션 배지 (FW 레드 / MF 그린 / DF 블루 / GK 옐로) */
export function PositionBadge({ position }: { position: string }) {
  const cls =
    position === "GK"
      ? "bg-amber-50 text-amber-600"
      : position === "DF"
        ? "bg-sky-50 text-sky-600"
        : position === "MF"
          ? "bg-emerald-50 text-emerald-600"
          : position === "FW"
            ? "bg-red-50 text-red-500"
            : "bg-gray-100 text-gray-500";
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{position}</span>;
}
