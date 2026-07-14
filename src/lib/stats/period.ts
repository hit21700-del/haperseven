// ─────────────────────────────────────────────────────────────
// 기간(Period) 필터 유틸 — 대시보드/통계 공통
// ─────────────────────────────────────────────────────────────

export type PeriodType = "month" | "quarter" | "year" | "range";

export type Period = {
  type: PeriodType;
  year: number;
  month?: number; // 1~12 (type=month)
  quarter?: number; // 1~4 (type=quarter)
  from?: string; // YYYY-MM-DD (type=range)
  to?: string; // YYYY-MM-DD (type=range)
};

/** 분기 → 포함 월 목록 */
export function quarterMonths(q: number): number[] {
  const start = (q - 1) * 3 + 1;
  return [start, start + 1, start + 2];
}

/** 해당 기간에 포함되는 월(1~12) 목록 (year 일치 기준) */
export function monthsInPeriod(p: Period): number[] {
  switch (p.type) {
    case "month":
      return p.month ? [p.month] : [];
    case "quarter":
      return p.quarter ? quarterMonths(p.quarter) : [];
    case "year":
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    case "range": {
      if (!p.from || !p.to) return [];
      const f = new Date(p.from);
      const t = new Date(p.to);
      const months = new Set<number>();
      // year 와 겹치는 월만 수집
      for (let m = 1; m <= 12; m++) {
        const d = new Date(p.year, m - 1, 15);
        if (d >= f && d <= t) months.add(m);
      }
      return [...months];
    }
  }
}

/** 특정 날짜(ISO)가 기간에 포함되는지 */
export function dateInPeriod(dateStr: string, p: Period): boolean {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  if (p.type === "range") {
    if (!p.from || !p.to) return true;
    return d >= new Date(p.from) && d <= new Date(p.to);
  }
  if (d.getFullYear() !== p.year) return false;
  const month = d.getMonth() + 1;
  if (p.type === "month") return month === p.month;
  if (p.type === "quarter") return p.quarter ? quarterMonths(p.quarter).includes(month) : false;
  return true; // year
}

/** 기간 라벨(화면 표시용) */
export function periodLabel(p: Period): string {
  switch (p.type) {
    case "month":
      return `${p.year}년 ${p.month}월`;
    case "quarter":
      return `${p.year}년 ${p.quarter}분기`;
    case "year":
      return `${p.year}년 전체`;
    case "range":
      return `${p.from ?? "?"} ~ ${p.to ?? "?"}`;
  }
}
