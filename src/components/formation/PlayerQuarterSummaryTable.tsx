"use client";
import React from "react";
import { Table, THead, TH, TD, TR } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import type { PlayerQuarterSummary } from "@/types/formation";
import type { Member } from "@/types/member";

/** 선수별 출전 쿼터 요약 테이블 */
export function PlayerQuarterSummaryTable({
  summary,
  members,
  minGuaranteed = 3,
}: {
  summary: PlayerQuarterSummary[];
  members: Member[];
  minGuaranteed?: number;
}) {
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? id;
  const typeOf = (id: string) => members.find((m) => m.id === id)?.memberType ?? "";
  const sorted = [...summary].sort((a, b) => b.totalQuarters - a.totalQuarters);

  return (
    <Table>
      <THead>
        <TR>
          <TH>이름</TH>
          <TH>구분</TH>
          <TH>총 출전</TH>
          <TH>필드</TH>
          <TH>GK</TH>
          <TH>휴식</TH>
          <TH>비고</TH>
        </TR>
      </THead>
      <tbody>
        {sorted.map((s) => {
          const under = s.totalQuarters < minGuaranteed;
          return (
            <TR key={s.memberId}>
              <TD className="font-medium">{nameOf(s.memberId)}</TD>
              <TD className="text-xs text-gray-500">{typeOf(s.memberId)}</TD>
              <TD className={`font-semibold ${under ? "text-red-600" : ""}`}>{s.totalQuarters}</TD>
              <TD>{s.fieldQuarters}</TD>
              <TD>{s.gkQuarters}</TD>
              <TD>{s.restQuarters}</TD>
              <TD>{under ? <Badge tone="red">{minGuaranteed}쿼터 미만</Badge> : <Badge tone="green">충족</Badge>}</TD>
            </TR>
          );
        })}
        {sorted.length === 0 && (
          <TR>
            <TD className="text-gray-400">배정 결과가 없습니다.</TD>
          </TR>
        )}
      </tbody>
    </Table>
  );
}
