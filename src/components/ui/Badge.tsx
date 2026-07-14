import React from "react";
import type { MemberType, TeamColor } from "@/types/member";
import { TEAM_LABEL } from "@/types/member";

type Tone = "green" | "red" | "yellow" | "gray" | "blue" | "purple";

const TONE_CLASS: Record<Tone, string> = {
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
  yellow: "bg-yellow-100 text-yellow-700",
  gray: "bg-gray-100 text-gray-600",
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
};

export function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASS[tone]}`}>{children}</span>
  );
}

/** 회비 납부 상태 배지 (요구사항 8: 완료 초록 / 미납 빨강 / 일부 노랑 / 휴식·탈퇴 회색) */
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

/** 자체전 팀 배지 (화이트=인디고 / 블랙=다크). 감독이면 ⭐ */
export function TeamBadge({ team, coach }: { team?: TeamColor; coach?: boolean }) {
  if (!team) return <span className="text-xs text-gray-300">-</span>;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
        team === "WHITE" ? "bg-indigo-100 text-indigo-700" : "bg-gray-800 text-white"
      }`}
    >
      {coach && <span title="감독">⭐</span>}
      {TEAM_LABEL[team]}
    </span>
  );
}

/** 포지션 배지 */
export function PositionBadge({ position }: { position: string }) {
  const tone: Tone =
    position === "GK" ? "purple" : position === "DF" ? "blue" : position === "MF" ? "green" : position === "FW" ? "red" : "gray";
  return <Badge tone={tone}>{position}</Badge>;
}
