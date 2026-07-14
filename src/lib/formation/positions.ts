// ─────────────────────────────────────────────────────────────
// 세부 포지션(CB/LB/RB/CM/ST/LW…) ↔ 그룹(GK/DF/MF/FW) / 좌우중(side) 매핑
// 그리고 포메이션 템플릿의 세부 슬롯 라벨 생성
// ─────────────────────────────────────────────────────────────
import type { Position } from "@/types/member";
import type { FormationTemplate } from "@/types/formation";

export type Group = "GK" | "DF" | "MF" | "FW";
export type Side = "L" | "C" | "R";

/** 세부 포지션 토큰 → 그룹 */
export function detailToGroup(token: string): Position | null {
  const t = token.replace(/[^A-Za-z]/g, "").toUpperCase();
  if (!t) return null;
  if (t === "GK") return "GK";
  if (/^(CB|LB|RB|LWB|RWB|LCB|RCB|SW|WB)$/.test(t)) return "DF";
  if (/^(MF|CM|DM|CDM|CAM|AM|LM|RM|LCM|RCM|LAM|RAM|LDM|RDM|DMF|AMF|CMF|CDMF)$/.test(t)) return "MF";
  if (/^(ST|CF|LW|RW|LS|RS|SS|FW|LWF|RWF|LF|RF)$/.test(t)) return "FW";
  return null;
}

/** 세부 포지션/슬롯 라벨 → 좌(L)/중(C)/우(R) */
export function sideOf(token: string): Side {
  const t = token.replace(/[^A-Za-z]/g, "").toUpperCase();
  if (["LB", "LWB", "LM", "LW", "LS", "LF", "LWF", "LDM", "LAM"].includes(t)) return "L";
  if (["RB", "RWB", "RM", "RW", "RS", "RF", "RWF", "RDM", "RAM"].includes(t)) return "R";
  return "C"; // CB, LCB, RCB, CM, LCM, RCM, ST, CF, DM, AM, MF, SW …
}

/** 그룹별 슬롯 라벨(표시용·배치용). 좌→중→우 순서 */
export function slotLabels(group: Group, count: number): string[] {
  const tables: Record<Group, Record<number, string[]>> = {
    GK: { 1: ["GK"] },
    DF: {
      1: ["CB"],
      2: ["LB", "RB"],
      3: ["LB", "CB", "RB"],
      4: ["LB", "LCB", "RCB", "RB"],
      5: ["LWB", "LCB", "CB", "RCB", "RWB"],
    },
    MF: {
      1: ["CM"],
      2: ["LM", "RM"],
      3: ["LM", "CM", "RM"],
      4: ["LM", "LCM", "RCM", "RM"],
      5: ["LM", "LCM", "CM", "RCM", "RM"],
    },
    FW: { 1: ["CF"], 2: ["LS", "RS"], 3: ["LW", "CF", "RW"] },
  };
  return tables[group][count] ?? Array.from({ length: count }, () => group);
}

export type Slot = { group: Group; label: string; side: Side };

/**
 * 11인제 자유 편집용 전체 포지션 그리드 (위=공격 → 아래=GK).
 * 자동 배정 결과를 이 칸들 위에 올리고, 드래그로 어느 칸이든 자유롭게 옮길 수 있다.
 */
export const ELEVEN_GRID: string[][] = [
  ["LW", "LS", "CF", "RS", "RW"], // 최전방
  ["LAM", "CAM", "RAM"], // 공격형 MF
  ["LM", "LCM", "CM", "RCM", "RM"], // 중앙 MF
  ["LWB", "LDM", "CDM", "RDM", "RWB"], // 수비형 MF / 윙백
  ["LB", "LCB", "CB", "RCB", "RB"], // 수비
  ["GK"], // GK
];

/** 그리드의 모든 칸을 {label, group, side} 로 평탄화 */
export function gridZones(): { label: string; group: Group; side: Side }[] {
  const out: { label: string; group: Group; side: Side }[] = [];
  for (const row of ELEVEN_GRID) {
    for (const label of row) {
      const g = (detailToGroup(label) ?? "MF") as Group;
      out.push({ label, group: g, side: sideOf(label) });
    }
  }
  return out;
}

/** 포메이션 템플릿 → 전체 세부 슬롯 목록(GK→DF→MF→FW) */
export function buildSlots(template: FormationTemplate): Slot[] {
  const slots: Slot[] = [];
  (["GK", "DF", "MF", "FW"] as Group[]).forEach((g) => {
    slotLabels(g, template.positions[g]).forEach((label) => slots.push({ group: g, label, side: sideOf(label) }));
  });
  return slots;
}

/**
 * 같은 그룹 안에서 선수들을 세부 슬롯에 좌우중(side) 기준으로 매칭한다.
 * (예: CB 선호 선수는 LCB/RCB 같은 중앙 슬롯, LB 선호는 LB 슬롯)
 * @returns memberId -> slotLabel
 */
export function matchPlayersToSlots(
  players: { id: string; side: Side }[],
  slots: { label: string; side: Side }[],
): Map<string, string> {
  const result = new Map<string, string>();
  const pAvail = [...players];
  const sAvail = [...slots];
  const removeP = (id: string) => {
    const i = pAvail.findIndex((p) => p.id === id);
    if (i >= 0) pAvail.splice(i, 1);
  };
  const removeS = (label: string) => {
    const i = sAvail.findIndex((s) => s.label === label);
    if (i >= 0) sAvail.splice(i, 1);
  };
  // 1) 같은 side 끼리 우선 매칭
  for (const side of ["C", "L", "R"] as Side[]) {
    const ps = pAvail.filter((p) => p.side === side);
    const ss = sAvail.filter((s) => s.side === side);
    const n = Math.min(ps.length, ss.length);
    for (let i = 0; i < n; i++) {
      result.set(ps[i].id, ss[i].label);
      removeP(ps[i].id);
      removeS(ss[i].label);
    }
  }
  // 2) 남은 선수는 남은 슬롯 아무 곳에
  for (let i = 0; i < pAvail.length && i < sAvail.length; i++) {
    result.set(pAvail[i].id, sAvail[i].label);
  }
  return result;
}
