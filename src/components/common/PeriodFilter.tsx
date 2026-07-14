"use client";
import React from "react";
import { Select, TextInput } from "@/components/ui/Field";
import type { Period, PeriodType } from "@/lib/stats/period";
import { currentYear } from "@/lib/utils/format";

/** 월별/분기별/연도별/기간 직접선택 필터 */
export function PeriodFilter({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const years = [currentYear(), currentYear() - 1, currentYear() - 2, 2025, 2024, 2023].filter(
    (v, i, a) => a.indexOf(v) === i,
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={value.type}
        onChange={(e) => onChange({ ...value, type: e.target.value as PeriodType })}
        className="w-28"
      >
        <option value="month">월별</option>
        <option value="quarter">분기별</option>
        <option value="year">연도별</option>
        <option value="range">기간 선택</option>
      </Select>

      {value.type !== "range" && (
        <Select
          value={value.year}
          onChange={(e) => onChange({ ...value, year: Number(e.target.value) })}
          className="w-28"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}년
            </option>
          ))}
        </Select>
      )}

      {value.type === "month" && (
        <Select
          value={value.month ?? 1}
          onChange={(e) => onChange({ ...value, month: Number(e.target.value) })}
          className="w-24"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {m}월
            </option>
          ))}
        </Select>
      )}

      {value.type === "quarter" && (
        <Select
          value={value.quarter ?? 1}
          onChange={(e) => onChange({ ...value, quarter: Number(e.target.value) })}
          className="w-24"
        >
          {[1, 2, 3, 4].map((q) => (
            <option key={q} value={q}>
              {q}분기
            </option>
          ))}
        </Select>
      )}

      {value.type === "range" && (
        <div className="flex items-center gap-1">
          <TextInput
            type="date"
            value={value.from ?? ""}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className="w-40"
          />
          <span className="text-gray-400">~</span>
          <TextInput
            type="date"
            value={value.to ?? ""}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className="w-40"
          />
        </div>
      )}
    </div>
  );
}
