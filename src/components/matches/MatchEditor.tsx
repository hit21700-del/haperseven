"use client";
import React from "react";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Table, THead, TH, TD, TR } from "@/components/ui/Table";
import { AttendanceBadge, MemberTypeBadge } from "@/components/ui/Badge";
import { TextInput, Select } from "@/components/ui/Field";
import type { Match, AttendanceStatus, AttendanceRecord, MatchStat } from "@/types/match";
import type { Member } from "@/types/member";

const STATUSES: AttendanceStatus[] = ["ATTEND", "LATE", "INJURED", "ABSENT"];
const STATUS_LABEL: Record<AttendanceStatus, string> = { ATTEND: "참석", LATE: "지각", INJURED: "부상", ABSENT: "불참" };

/** 경기 출석/스탯 편집기 */
export function MatchEditor({
  match,
  members,
  onChange,
}: {
  match: Match;
  members: Member[];
  onChange: (m: Match) => void;
}) {
  const attOf = (id: string): AttendanceRecord | undefined => match.attendance.find((a) => a.memberId === id);
  const statOf = (id: string): MatchStat | undefined => match.stats.find((s) => s.memberId === id);

  const setAttendance = (memberId: string, status: AttendanceStatus) => {
    const exists = attOf(memberId);
    const attendance = exists
      ? match.attendance.map((a) => (a.memberId === memberId ? { ...a, status } : a))
      : [...match.attendance, { memberId, status }];
    onChange({ ...match, attendance });
  };

  const setStat = (memberId: string, patch: Partial<MatchStat>) => {
    const exists = statOf(memberId);
    const stats = exists
      ? match.stats.map((s) => (s.memberId === memberId ? { ...s, ...patch } : s))
      : [...match.stats, { memberId, goals: 0, assists: 0, ...patch }];
    onChange({ ...match, stats });
  };

  const setMemo = (memberId: string, memo: string) => {
    const exists = attOf(memberId);
    const attendance = exists
      ? match.attendance.map((a) => (a.memberId === memberId ? { ...a, memo } : a))
      : [...match.attendance, { memberId, status: "ATTEND" as AttendanceStatus, memo }];
    onChange({ ...match, attendance });
  };

  const activeMembers = members.filter((m) => m.isActive);
  const attendCount = match.attendance.filter((a) => a.status === "ATTEND" || a.status === "LATE").length;

  return (
    <Card>
      <SectionTitle>
        출석 · 스탯 입력{" "}
        <span className="ml-2 text-sm font-normal text-gray-500">(참석 {attendCount}명)</span>
      </SectionTitle>
      <Table>
        <THead>
          <TR>
            <TH>이름</TH>
            <TH>구분</TH>
            <TH>출석</TH>
            <TH>득점</TH>
            <TH>어시</TH>
            <TH>메모</TH>
          </TR>
        </THead>
        <tbody>
          {activeMembers.map((m) => {
            const att = attOf(m.id);
            const stat = statOf(m.id);
            return (
              <TR key={m.id}>
                <TD className="font-medium">{m.name}</TD>
                <TD>
                  <MemberTypeBadge type={m.memberType} />
                </TD>
                <TD>
                  <Select
                    value={att?.status ?? ""}
                    onChange={(e) => setAttendance(m.id, e.target.value as AttendanceStatus)}
                    className="w-24"
                  >
                    <option value="">미체크</option>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </Select>
                </TD>
                <TD>
                  <TextInput
                    type="number"
                    min={0}
                    value={stat?.goals ?? 0}
                    onChange={(e) => setStat(m.id, { goals: Number(e.target.value) })}
                    className="w-16"
                  />
                </TD>
                <TD>
                  <TextInput
                    type="number"
                    min={0}
                    value={stat?.assists ?? 0}
                    onChange={(e) => setStat(m.id, { assists: Number(e.target.value) })}
                    className="w-16"
                  />
                </TD>
                <TD>
                  <TextInput
                    value={att?.memo ?? ""}
                    onChange={(e) => setMemo(m.id, e.target.value)}
                    placeholder="메모"
                    className="w-32"
                  />
                </TD>
              </TR>
            );
          })}
        </tbody>
      </Table>
    </Card>
  );
}
