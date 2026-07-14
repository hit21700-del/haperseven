// ─────────────────────────────────────────────────────────────
// 포메이션 자동 배정 알고리즘 (UI 와 완전 분리된 순수 함수)
//
// 우선순위:
//   1. 안전/불가능 조건
//   2. 관리자 수동 수정 (호출부에서 chatRules/forced 로 전달)
//   3. 채팅으로 입력한 명시 조건 (chatRules)
//   4. 고정 GK 조건
//   5. 회원 구분별 우선순위
//   6. 기본 3쿼터 보장
//   7. 포지션 밸런스
//   8. 나이/체력 균형
// ─────────────────────────────────────────────────────────────
import type { Member, Position } from "@/types/member";
import type { AttendanceRecord } from "@/types/match";
import type {
  FormationTemplate,
  FormationPlan,
  FormationBaseRules,
  QuarterLineup,
  PlayerQuarterSummary,
  RuleViolation,
} from "@/types/formation";
import { DEFAULT_BASE_RULES } from "@/types/formation";
import type { ChatFormationRule } from "@/types/chat";
import { getPriority } from "@/lib/constants/memberPriority";
import { applyChatFormationRules } from "./applyChatFormationRules";
import { getEligibleAttendees, checkCapacity, fieldSlotsOf, type FieldGroup } from "./formationRules";
import { buildSlots, sideOf, detailToGroup, matchPlayersToSlots, type Group, type Side } from "./positions";

export type GenerateFormationParams = {
  members: Member[];
  attendance: AttendanceRecord[];
  formationTemplate: FormationTemplate;
  quarterCount?: number;
  rules?: Partial<FormationBaseRules>;
  chatRules?: ChatFormationRule[];
};

/** 선수별 누적 상태 */
type PlayerState = {
  fieldQuarters: number;
  gkQuarters: number;
  restQuarters: number;
  /** 직전까지 연속 출전 쿼터 수(현재 진행중 streak) */
  consecutive: number;
};

export function generateFormationPlan(params: GenerateFormationParams): FormationPlan {
  const quarterCount = params.quarterCount ?? 4;
  const rules: FormationBaseRules = { ...DEFAULT_BASE_RULES, ...params.rules };
  const template = params.formationTemplate;

  const warnings: string[] = [];
  const ruleViolations: RuleViolation[] = [];
  const reasons: string[] = [];

  // 1~2. 참석자 필터 (탈퇴/휴식/부상/불참 제외)
  const attendees = getEligibleAttendees(params.members, params.attendance);

  if (attendees.length === 0) {
    warnings.push("배정 가능한 참석자가 없습니다. 출석 체크를 먼저 진행해주세요.");
    return { quarters: [], summary: [], warnings, ruleViolations, reasons };
  }

  // 3. 채팅 규칙 → 정규화된 제약
  const c = applyChatFormationRules(params.members, params.chatRules ?? []);
  warnings.push(...c.conflicts);
  c.notes.forEach((n) => reasons.push(`메모: ${n}`));

  // 우선순위(작을수록 우선). 채팅 override 반영
  const priorityOf = (m: Member) => c.priorityOverride.get(m.memberType) ?? getPriority(m.memberType);

  // 개인 최대/최소 출전 쿼터 계산 (회원구분별 상한 포함)
  const maxQ = (m: Member): number => {
    let v = Infinity;
    if (c.maxQuarters.has(m.id)) v = Math.min(v, c.maxQuarters.get(m.id)!);
    if (c.maxQuartersByType.has(m.memberType)) v = Math.min(v, c.maxQuartersByType.get(m.memberType)!);
    return v;
  };
  const minQ = (m: Member): number => c.minQuarters.get(m.id) ?? 0;

  // GK 관련 헬퍼
  const gkBannedAt = (id: string, q: number) =>
    c.banPosition.some((b) => b.memberId === id && b.position === "GK" && (b.quarter === undefined || b.quarter === q));
  const forcedToGKAt = (m: Member, q: number) =>
    (c.forcedPosition.get(m.id) ?? []).some(
      (p) => p.position === "GK" && (p.quarter === undefined || p.quarter === q),
    );
  const fieldBannedAt = (id: string, g: FieldGroup, q: number) =>
    c.banPosition.some((b) => b.memberId === id && b.position === g && (b.quarter === undefined || b.quarter === q));

  // 4. 고정 GK 여부 / GK 순환 여부
  const fixedGKs = attendees.filter((m) => m.fixedGK);
  const gkRotation = c.gkRotation ?? (fixedGKs.length === 0 ? rules.gkRotation : false);
  if (fixedGKs.length > 0) {
    reasons.push(`고정 GK ${fixedGKs.map((m) => m.name).join(", ")} 을(를) GK 우선 배치합니다.`);
  } else if (gkRotation) {
    reasons.push("고정 GK 가 없어 GK 가능자를 쿼터별로 순환 배정합니다.");
  }

  // 안전 조건: 용량(전원 최소 쿼터 보장) 검사
  const cap = checkCapacity(attendees.length, template, quarterCount, rules);
  if (!cap.feasible) {
    warnings.push(
      `현재 참석 인원 ${attendees.length}명 / 쿼터당 ${template.playerCount}명 / 총 출전 슬롯 ${cap.totalSlots}개이므로 ` +
        `전원 ${rules.minGuaranteedQuarters}쿼터 보장은 불가능합니다. 우선순위 기준으로 배정합니다.`,
    );
  }
  const overThreshold = attendees.length > rules.priorityThreshold;
  if (overThreshold) {
    reasons.push(
      `참석 ${attendees.length}명 > 기준 ${rules.priorityThreshold}명: 전원 3쿼터가 어려워 우선순위(정회원·학생·스텝·회장 > 정회원(월2회) > 준회원 > 용병)가 낮은 순서로 2쿼터부터 차등 배정합니다.`,
    );
  }
  if (attendees.length < template.playerCount) {
    warnings.push(
      `참석 인원(${attendees.length}명)이 포메이션 정원(${template.playerCount}명)보다 적어 일부 포지션이 비어있을 수 있습니다.`,
    );
  }

  // 선수 상태 초기화
  const state = new Map<string, PlayerState>();
  attendees.forEach((m) => state.set(m.id, { fieldQuarters: 0, gkQuarters: 0, restQuarters: 0, consecutive: 0 }));
  const st = (m: Member) => state.get(m.id)!;

  const forcedRestCount = (m: Member) => {
    let n = 0;
    for (let q = 1; q <= quarterCount; q++) if (c.forcedRest.has(`${m.id}@${q}`)) n++;
    return n;
  };

  // 랜덤 동점 처리(매 생성마다 다른 배정). GK·과포화 포지션 배정에 사용
  const rnd = () => Math.random() - 0.5;
  const gNeed = template.positions.GK;
  const availQ = (m: Member) => quarterCount - forcedRestCount(m); // 강제휴식 제외, 출전 가능 쿼터
  const fieldSoftCap = rules.minGuaranteedQuarters; // 3
  const byPriority = [...attendees].sort(
    (a, b) => priorityOf(a) - priorityOf(b) || (b.age ?? 0) - (a.age ?? 0),
  );

  // 우선순위 기반 출전 쿼터 배분 헬퍼(필드 슬롯을 floor→3→상한 순으로 채움)
  const allocateByPriority = (
    target: Map<string, number>,
    hardCap: (m: Member) => number,
    floor: (m: Member) => number,
    totalSlots: number,
    skip?: (m: Member) => boolean,
  ) => {
    let left = totalSlots;
    attendees.forEach((m) => {
      if (!target.has(m.id)) target.set(m.id, 0);
    });
    for (const m of byPriority) {
      if (skip?.(m)) continue;
      const give = Math.max(0, Math.min(floor(m), left));
      target.set(m.id, give);
      left -= give;
    }
    for (const m of byPriority) {
      if (left <= 0) break;
      if (skip?.(m)) continue;
      const want = Math.min(fieldSoftCap, hardCap(m));
      while (target.get(m.id)! < want && left > 0) {
        target.set(m.id, target.get(m.id)! + 1);
        left--;
      }
    }
    let progressed = true;
    while (left > 0 && progressed) {
      progressed = false;
      for (const m of byPriority) {
        if (left <= 0) break;
        if (skip?.(m)) continue;
        if (target.get(m.id)! < hardCap(m)) {
          target.set(m.id, target.get(m.id)! + 1);
          left--;
          progressed = true;
        }
      }
    }
  };

  const totalSlots = template.playerCount * quarterCount;

  // ── 1) '총 출전 쿼터(total)'를 우선순위로 배분 ──────────────────
  // 전원 3쿼터(휴식 1)를 먼저 확보하고, 남는 슬롯만 일부에게 4쿼터로 준다.
  // → 누군가 4쿼터 뛰느라 다른 사람이 2쿼터(휴식 2)로 밀리는 일을 막는다.
  const totalHardCap = (m: Member) => Math.max(0, Math.min(availQ(m), maxQ(m)));
  const totalFloor = (m: Member) => Math.min(totalHardCap(m), Math.max(Math.min(2, fieldSoftCap), Math.max(0, minQ(m))));
  const totalTarget = new Map<string, number>();
  allocateByPriority(totalTarget, totalHardCap, totalFloor, totalSlots);

  // ── 2) GK 스케줄 — '풀출전(휴식 0) 선수'에게 GK 를 집중 배정 ──────
  // GK 는 그 선수의 비필드(=휴식 대신) 쿼터. 풀출전(total==출전가능) 선수에게만 주면
  // 나머지는 3필드+1휴식을 유지(GK 와 휴식이 한 선수에게 겹치지 않음).
  const gkByQuarter: string[][] = [];
  const gkCount = new Map<string, number>();
  attendees.forEach((m) => gkCount.set(m.id, 0));
  const noGKCapable = !attendees.some((m) => m.canPlayGK || m.fixedGK);
  if (noGKCapable && gNeed > 0) {
    reasons.push(
      "GK 가능자가 지정되지 않아 '풀출전(휴식 없는) 선수' 중에서 GK 를 랜덤 배정합니다. (회원 수정에서 GK 가능 여부 설정 또는 필드뷰에서 직접 지정 가능)",
    );
  }
  // 풀출전(휴식 0): 총 출전 == 출전가능. 이런 선수만 GK 로 써야 GK 와 휴식이 겹치지 않는다.
  const isFull = (m: Member) => (totalTarget.get(m.id) ?? 0) >= availQ(m) && availQ(m) > 0;
  // 전담 GK: 고정 GK 이거나, GK 가능한데 필드 포지션이 없는(순수 키퍼) 선수 → 매 쿼터 GK 고정
  const isFieldGroup = (p: Position) => p === "DF" || p === "MF" || p === "FW";
  const isDedicatedGK = (m: Member) => m.fixedGK || (m.canPlayGK && !m.positions.some(isFieldGroup));

  for (let q = 1; q <= quarterCount; q++) {
    const chosen: Member[] = [];
    const avail = attendees.filter((m) => !c.forcedRest.has(`${m.id}@${q}`) && !gkBannedAt(m.id, q));
    const byGk = (pool: Member[]) => pool.sort((a, b) => gkCount.get(a.id)! - gkCount.get(b.id)! || rnd());
    const take = (pool: Member[]) => {
      for (const m of pool) {
        if (chosen.length >= gNeed) break;
        if (!chosen.includes(m)) chosen.push(m);
      }
    };
    // (1) 채팅 강제 GK / (2) 전담 GK(고정 GK·순수 키퍼) → 매 쿼터 GK 고정
    take(avail.filter((m) => forcedToGKAt(m, q)));
    take(byGk(avail.filter((m) => isDedicatedGK(m))));
    // (3) 풀출전 + GK 가능자 → 순환 (휴식 없는 사람만)
    if (chosen.length < gNeed) take(byGk(avail.filter((m) => (m.canPlayGK || m.fixedGK) && isFull(m))));
    // (4) 가능자 없으면 → 풀출전(휴식 0) 선수에게 집중 → 나머지는 3쿼터 유지
    if (chosen.length < gNeed) take(byGk(avail.filter((m) => isFull(m))));
    // (5) 그래도 부족(인원이 정원에 비해 적거나, 전원 3쿼터 불가) → 아무나
    if (chosen.length < gNeed) {
      const before = chosen.length;
      take(byGk([...avail]));
      if (chosen.length > before && !noGKCapable)
        warnings.push(`${q}쿼터: GK 가능자가 부족하여 일부 선수를 GK 로 임시 배정했습니다.`);
    }
    if (chosen.length < gNeed)
      ruleViolations.push({ code: "GK_SHORTAGE", quarter: q, message: `${q}쿼터 GK 를 채우지 못했습니다.` });
    chosen.forEach((m) => gkCount.set(m.id, gkCount.get(m.id)! + 1));
    gkByQuarter.push(chosen.map((m) => m.id));
  }
  attendees.forEach((m) => (st(m).gkQuarters = gkCount.get(m.id)!));

  // 쿼터별 '필드 출전 가능' 여부: GK 도 아니고 강제휴식도 아닌 쿼터
  const fieldEligible = new Map<string, boolean[]>();
  attendees.forEach((m) => {
    const arr: boolean[] = [];
    for (let q = 1; q <= quarterCount; q++)
      arr.push(!gkByQuarter[q - 1].includes(m.id) && !c.forcedRest.has(`${m.id}@${q}`));
    fieldEligible.set(m.id, arr);
  });
  const remainingEligibleFrom = (m: Member, q: number) => {
    let n = 0;
    for (let k = q; k <= quarterCount; k++) if (fieldEligible.get(m.id)![k - 1]) n++;
    return n;
  };

  // ── 3) 필드 목표 = 총 출전 − GK (휴식 = 출전가능 − 총 출전) ──────
  const fieldTarget = new Map<string, number>();
  attendees.forEach((m) => fieldTarget.set(m.id, Math.max(0, (totalTarget.get(m.id) ?? 0) - gkCount.get(m.id)!)));

  // ── 주/부 포지션 분배 준비 ──
  // 선호포지션 순서(첫=주, 둘째=부) 기준. 필드 3쿼터 이상이면 주 2회 + 부 1회,
  // 2쿼터 이하면 주 포지션만. (슬롯이 모자라면 가능한 범위에서 best-effort)
  const fieldGroupsOf = (m: Member): FieldGroup[] =>
    m.positions.filter((p): p is FieldGroup => p === "DF" || p === "MF" || p === "FW");
  const remPrimary = new Map<string, number>();
  const remSecondary = new Map<string, number>();
  attendees.forEach((m) => {
    const groups = fieldGroupsOf(m);
    const ft = fieldTarget.get(m.id)!;
    const hasSecondary = groups.length >= 2 && groups[1] !== groups[0];
    const sec = ft >= fieldSoftCap && hasSecondary ? 1 : 0; // 3쿼터 이상일 때만 부 포지션 1회
    remSecondary.set(m.id, sec);
    remPrimary.set(m.id, ft - sec);
  });

  const quarters: QuarterLineup[] = [];

  // ── 3) 쿼터별 배정 ─────────────────────────────────────────
  for (let q = 1; q <= quarterCount; q++) {
    const need = fieldSlotsOf(template);
    const lineup: QuarterLineup["players"] = [];
    const gkIds = gkByQuarter[q - 1];

    // GK 먼저 배치(이미 스케줄됨)
    gkIds.forEach((id) => lineup.push({ memberId: id, position: "GK", isGK: true }));

    // 필드 후보: GK 아님 + 이번 쿼터 필드 출전 가능 + 남은 필드 목표 > 0
    const fieldRemaining = (m: Member) => fieldTarget.get(m.id)! - st(m).fieldQuarters;
    const candidates = attendees.filter(
      (m) => !gkIds.includes(m.id) && fieldEligible.get(m.id)![q - 1] && fieldRemaining(m) > 0,
    );

    // 긴박도(slack)=남은 필드가능쿼터 - 남은 필드목표. 작을수록 먼저 포함
    const selScore = (m: Member): number => {
      const slack = remainingEligibleFrom(m, q) - fieldRemaining(m);
      let sc = slack * 100;
      const fp = (c.forcedPosition.get(m.id) ?? []).some(
        (p) => (p.quarter === undefined || p.quarter === q) && p.position !== "GK",
      );
      if (fp) sc -= 100_000; // 강제 포지션 → 반드시 포함
      // GK 를 보는 선수는 나머지 쿼터를 모두 필드로 채워 '휴식'이 생기지 않도록 최우선 선발
      // (GK = 그 선수의 휴식 대신. GK 와 휴식을 한 선수에게 같이 주지 않는다)
      if (gkCount.get(m.id)! > 0) sc -= 50_000;
      sc += priorityOf(m) * 5; // 동률 시 우선순위
      const limit = c.avoidConsecutive.get(m.id);
      if (limit !== undefined && st(m).consecutive >= limit) sc += 500;
      return sc;
    };

    const fieldSlotsCount = need.DF + need.MF + need.FW;
    const picked = [...candidates].sort((a, b) => selScore(a) - selScore(b)).slice(0, fieldSlotsCount);

    // ── 필드 포지션 배정 (단계별·공평 배정) ──
    // 희소한 포지션(예: FW 2자리에 FW 선호 4명)은 특정 선수가 독식하지 않도록
    // "아직 주 포지션을 덜 받은 선수(remPrimary 큰 순)"에게 우선 배정해 쿼터별로 돌려준다.
    const remaining: Record<FieldGroup, number> = { DF: need.DF, MF: need.MF, FW: need.FW };
    const assignedIds = new Set<string>();
    const place = (m: Member, g: FieldGroup) => {
      lineup.push({ memberId: m.id, position: g, isGK: false });
      st(m).fieldQuarters++;
      remaining[g]--;
      assignedIds.add(m.id);
    };
    const primaryG = (m: Member): FieldGroup | undefined => fieldGroupsOf(m)[0];
    const secondaryG = (m: Member): FieldGroup | undefined => fieldGroupsOf(m)[1];
    const groupOrder: FieldGroup[] = ["DF", "MF", "FW"];

    // 0) 강제 포지션(채팅)
    for (const m of picked) {
      const forced = (c.forcedPosition.get(m.id) ?? []).find(
        (p) => (p.quarter === undefined || p.quarter === q) && p.position !== "GK" && p.position !== "ANY",
      );
      if (!forced) continue;
      const g = forced.position as FieldGroup;
      if (remaining[g] > 0 && !fieldBannedAt(m.id, g, q)) {
        place(m, g);
        if (g === primaryG(m) && (remPrimary.get(m.id) ?? 0) > 0) remPrimary.set(m.id, remPrimary.get(m.id)! - 1);
        else if (g === secondaryG(m) && (remSecondary.get(m.id) ?? 0) > 0) remSecondary.set(m.id, remSecondary.get(m.id)! - 1);
      }
    }

    // 1) 주 포지션 배정 — 같은 포지션 경쟁 시 '주 포지션 덜 받은 사람' 우선,
    //    동점(=같은 처지)이면 랜덤. (FW 2자리에 FW 4명이면 매번 다른 2명이 선발)
    for (const g of groupOrder) {
      const cand = picked
        .filter(
          (m) =>
            !assignedIds.has(m.id) && primaryG(m) === g && (remPrimary.get(m.id) ?? 0) > 0 && !fieldBannedAt(m.id, g, q),
        )
        .sort((a, b) => remPrimary.get(b.id)! - remPrimary.get(a.id)! || rnd());
      for (const m of cand) {
        if (remaining[g] <= 0) break;
        place(m, g);
        remPrimary.set(m.id, remPrimary.get(m.id)! - 1);
      }
    }

    // 2) 부 포지션 배정 — 동일하게 덜 받은 사람 우선 + 동점 랜덤
    for (const g of groupOrder) {
      const cand = picked
        .filter(
          (m) =>
            !assignedIds.has(m.id) &&
            secondaryG(m) === g &&
            (remSecondary.get(m.id) ?? 0) > 0 &&
            !fieldBannedAt(m.id, g, q),
        )
        .sort((a, b) => remSecondary.get(b.id)! - remSecondary.get(a.id)! || rnd());
      for (const m of cand) {
        if (remaining[g] <= 0) break;
        place(m, g);
        remSecondary.set(m.id, remSecondary.get(m.id)! - 1);
      }
    }

    // 3) 남은 선수 — 선호(주→부) 우선, 없으면 빈 슬롯 아무 곳 (순서 랜덤)
    for (const m of [...picked].sort(() => rnd())) {
      if (assignedIds.has(m.id)) continue;
      const pg = primaryG(m);
      const sg = secondaryG(m);
      const order: FieldGroup[] = [];
      if (pg) order.push(pg);
      if (sg) order.push(sg);
      groupOrder.forEach((x) => order.push(x));
      const seen = new Set<FieldGroup>();
      const dedup = order.filter((x) => (seen.has(x) ? false : (seen.add(x), true)));
      let placed = false;
      for (const g of dedup) {
        if (remaining[g] > 0 && !fieldBannedAt(m.id, g, q)) {
          place(m, g);
          if (g === pg && (remPrimary.get(m.id) ?? 0) > 0) remPrimary.set(m.id, remPrimary.get(m.id)! - 1);
          else if (g === sg && (remSecondary.get(m.id) ?? 0) > 0) remSecondary.set(m.id, remSecondary.get(m.id)! - 1);
          placed = true;
          break;
        }
      }
      if (!placed) {
        for (const g of groupOrder) {
          if (remaining[g] > 0) {
            place(m, g);
            warnings.push(`${q}쿼터: ${m.name}의 금지 포지션 조건을 모두 만족하지 못해 ${g}로 배정했습니다.`);
            break;
          }
        }
      }
    }

    // ── 세부 슬롯(좌우중) 배정 ──
    // 같은 그룹 안에서 선호 세부 포지션(CB/LB/RB/LM/ST…)에 맞는 자리를 지정한다.
    // 예: CB 선호 → 중앙(LCB/RCB), LB 선호 → 좌측(LB)
    const allSlots = buildSlots(template);
    const memberById = new Map(attendees.map((m) => [m.id, m]));
    const desiredSide = (memberId: string, g: Group): Side => {
      const det = (memberById.get(memberId)?.preferredDetail ?? []).find((t) => detailToGroup(t) === g);
      return det ? sideOf(det) : "C";
    };
    for (const g of ["GK", "DF", "MF", "FW"] as Group[]) {
      const groupSlots = allSlots.filter((s) => s.group === g);
      // 우선순위 높은 선수가 선호 자리를 먼저 차지하도록 정렬(예: 중앙 슬롯이 부족하면 회장/스텝 우선)
      const groupPlayers = lineup
        .filter((p) => (p.isGK ? "GK" : (p.position as Group)) === g)
        .sort((a, b) => priorityOf(memberById.get(a.memberId)!) - priorityOf(memberById.get(b.memberId)!));
      const matched = matchPlayersToSlots(
        groupPlayers.map((p) => ({ id: p.memberId, side: desiredSide(p.memberId, g) })),
        groupSlots,
      );
      for (const p of groupPlayers) p.slot = matched.get(p.memberId);
    }

    // 휴식자 / 연속 출전 streak
    const onPitchSet = new Set(lineup.map((p) => p.memberId));
    const resting = attendees.filter((m) => !onPitchSet.has(m.id));
    resting.forEach((m) => st(m).restQuarters++);
    attendees.forEach((m) => {
      if (onPitchSet.has(m.id)) st(m).consecutive++;
      else st(m).consecutive = 0;
    });

    quarters.push({ quarter: q, players: lineup, rests: resting.map((m) => m.id) });
  }

  // ── 요약 / 위반 검사 ──────────────────────────────────────
  const summary: PlayerQuarterSummary[] = attendees.map((m) => {
    const s = st(m);
    return {
      memberId: m.id,
      totalQuarters: s.fieldQuarters + s.gkQuarters,
      fieldQuarters: s.fieldQuarters,
      gkQuarters: s.gkQuarters,
      restQuarters: s.restQuarters,
    };
  });

  // 최소 보장 미달 검사 (용량이 충분할 때만 '위반'으로 본다)
  if (cap.feasible) {
    for (const m of attendees) {
      const s = st(m);
      const total = s.fieldQuarters + s.gkQuarters;
      const want = Math.min(rules.minGuaranteedQuarters, maxQ(m), quarterCount);
      if (total < want) {
        ruleViolations.push({
          code: "MIN_QUARTERS_NOT_MET",
          memberId: m.id,
          message: `${m.name} 출전 ${total}쿼터로 최소 ${want}쿼터 보장에 미달합니다.`,
        });
      }
    }
  }

  reasons.push(
    `기본 규칙: 전원 최소 ${rules.minGuaranteedQuarters}쿼터 출전(휴식 최대 1쿼터)을 우선 보장합니다. GK 는 풀출전(휴식 없는) 선수에게만 배정해 'GK + 휴식'이 한 선수에게 겹치지 않게 합니다. 참석 인원이 너무 많아(정원×4 ÷ 3 초과) 전원 3쿼터가 물리적으로 불가능할 때만 일부가 2쿼터가 됩니다.`,
  );

  return { quarters, summary, warnings, ruleViolations, reasons };
}
