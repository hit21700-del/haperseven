"use client";
import React from "react";
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
    <div className="w-full overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[600px] bg-[#12161D] text-sm">
        <thead className="bg-white/5 text-left text-[13px] font-semibold text-gray-400">
          <tr className="border-b border-white/5 last:border-b-0">
            <th className="whitespace-nowrap px-4 py-3">이름</th>
            <th className="whitespace-nowrap px-4 py-3">구분</th>
            <th className="whitespace-nowrap px-4 py-3">총 출전</th>
            <th className="whitespace-nowrap px-4 py-3">필드</th>
            <th className="whitespace-nowrap px-4 py-3">GK</th>
            <th className="whitespace-nowrap px-4 py-3">휴식</th>
            <th className="whitespace-nowrap px-4 py-3">비고</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => {
            const under = s.totalQuarters < minGuaranteed;
            return (
              <tr key={s.memberId} className="border-b border-white/5 last:border-b-0">
                <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-300">{nameOf(s.memberId)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">{typeOf(s.memberId)}</td>
                <td className={`whitespace-nowrap px-4 py-3 font-semibold ${under ? "text-rose-400" : "text-gray-300"}`}>{s.totalQuarters}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-300">{s.fieldQuarters}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-300">{s.gkQuarters}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-300">{s.restQuarters}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  {under ? (
                    <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs text-rose-400">{minGuaranteed}쿼터 미만</span>
                  ) : (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-gray-300">충족</span>
                  )}
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr className="border-b border-white/5 last:border-b-0">
              <td className="whitespace-nowrap px-4 py-3 text-gray-500">배정 결과가 없습니다.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
