// ─────────────────────────────────────────────────────────────
// 포메이션 자동 배정 알고리즘 단위 테스트 (vitest)
//   실행: npm test
// ─────────────────────────────────────────────────────────────
import { describe, it, expect } from "vitest";
import { generateFormationPlan } from "../generateFormationPlan";
import type { Member, MemberType, Position } from "@/types/member";
import type { AttendanceRecord } from "@/types/match";
import type { FormationTemplate } from "@/types/formation";
import type { ChatFormationRule } from "@/types/chat";

// 테스트용 회원 생성 헬퍼
let seq = 0;
function mk(name: string, type: MemberType, opts: Partial<Member> = {}): Member {
  seq += 1;
  return {
    id: `t${seq}`,
    name,
    memberType: type,
    feeAmount: 0,
    feePeriod: "6개월",
    positions: opts.positions ?? ["MF"],
    preferredPosition: opts.preferredPosition,
    canPlayGK: opts.canPlayGK ?? false,
    fixedGK: opts.fixedGK ?? false,
    isActive: opts.isActive ?? true,
    age: opts.age,
    monthlyPaymentStatus: {},
    ...opts,
  };
}

function attendAll(members: Member[]): AttendanceRecord[] {
  return members.map((m) => ({ memberId: m.id, status: "ATTEND" as const }));
}

// 7인제(2-3-1) 템플릿: 정원 7
const T7: FormationTemplate = { id: "t7", name: "7인제 2-3-1", playerCount: 7, positions: { GK: 1, DF: 2, MF: 3, FW: 1 } };
// 6인제(2-2-1)
const T6: FormationTemplate = { id: "t6", name: "6인제 2-2-1", playerCount: 6, positions: { GK: 1, DF: 2, MF: 2, FW: 1 } };

describe("generateFormationPlan", () => {
  it("참석자만 배정하고 탈퇴/휴식/부상/불참은 제외한다", () => {
    const members = [
      mk("A", "정회원"),
      mk("B", "정회원"),
      mk("C", "휴식", { isActive: false }),
      mk("D", "정회원"),
    ];
    const attendance: AttendanceRecord[] = [
      { memberId: members[0].id, status: "ATTEND" },
      { memberId: members[1].id, status: "ATTEND" },
      { memberId: members[2].id, status: "ATTEND" }, // 휴식 → 제외
      { memberId: members[3].id, status: "INJURED" }, // 부상 → 제외
    ];
    const plan = generateFormationPlan({ members, attendance, formationTemplate: T6 });
    const ids = new Set(plan.summary.map((s) => s.memberId));
    expect(ids.has(members[2].id)).toBe(false);
    expect(ids.has(members[3].id)).toBe(false);
    expect(ids.size).toBe(2);
  });

  it("고정 GK 가 있으면 매 쿼터 GK 로 배치된다", () => {
    const gk = mk("키퍼", "스텝", { fixedGK: true, canPlayGK: true, positions: ["GK"] });
    const members = [gk, mk("A", "정회원"), mk("B", "정회원"), mk("C", "정회원"), mk("D", "정회원"), mk("E", "정회원"), mk("F", "정회원")];
    const plan = generateFormationPlan({ members, attendance: attendAll(members), formationTemplate: T7 });
    const gkSummary = plan.summary.find((s) => s.memberId === gk.id)!;
    expect(gkSummary.gkQuarters).toBe(4);
    // 모든 쿼터의 GK 가 고정 GK 인지
    for (const q of plan.quarters) {
      const gkPlayer = q.players.find((p) => p.isGK);
      expect(gkPlayer?.memberId).toBe(gk.id);
    }
  });

  it("고정 GK 가 없으면 GK 가능자들이 순환 배정된다", () => {
    const members = [
      mk("A", "정회원", { canPlayGK: true }),
      mk("B", "정회원", { canPlayGK: true }),
      mk("C", "정회원"),
      mk("D", "정회원"),
      mk("E", "정회원"),
      mk("F", "정회원"),
      mk("G", "정회원"),
    ];
    const plan = generateFormationPlan({ members, attendance: attendAll(members), formationTemplate: T7 });
    // GK 로 뛴 사람은 canPlayGK=true 인 A 또는 B 여야 함
    const gkIds = new Set(plan.quarters.map((q) => q.players.find((p) => p.isGK)?.memberId));
    expect([...gkIds].every((id) => id === members[0].id || id === members[1].id)).toBe(true);
    // 두 명이 나눠서 GK 를 봤는지(순환)
    expect(gkIds.size).toBeGreaterThanOrEqual(1);
  });

  it("참석 인원이 정원 이하이면 전원 4쿼터(최소 3쿼터 이상) 출전한다", () => {
    const members = Array.from({ length: 7 }, (_, i) => mk(`P${i}`, "정회원", { canPlayGK: i === 0 }));
    const plan = generateFormationPlan({ members, attendance: attendAll(members), formationTemplate: T7 });
    for (const s of plan.summary) {
      expect(s.totalQuarters).toBeGreaterThanOrEqual(3);
    }
    // 최소보장 위반이 없어야 함
    expect(plan.ruleViolations.filter((v) => v.code === "MIN_QUARTERS_NOT_MET").length).toBe(0);
  });

  it("13명 초과 시 용량 경고를 표시한다", () => {
    const members = Array.from({ length: 16 }, (_, i) => mk(`P${i}`, "정회원", { canPlayGK: i < 3 }));
    const T11: FormationTemplate = { id: "t11", name: "11인제", playerCount: 11, positions: { GK: 1, DF: 4, MF: 4, FW: 2 } };
    const plan = generateFormationPlan({ members, attendance: attendAll(members), formationTemplate: T11 });
    // 16명*3=48 > 44 → 보장 불가 경고
    expect(plan.warnings.some((w) => w.includes("보장은 불가능"))).toBe(true);
  });

  it("우선순위: 인원 초과 시 스텝/정회원이 용병보다 더 많이 출전한다", () => {
    const steps = Array.from({ length: 8 }, (_, i) => mk(`정${i}`, "정회원", { canPlayGK: i === 0 }));
    const mercs = Array.from({ length: 8 }, (_, i) => mk(`용${i}`, "용병"));
    const members = [...steps, ...mercs];
    const T11: FormationTemplate = { id: "t11", name: "11인제", playerCount: 11, positions: { GK: 1, DF: 4, MF: 4, FW: 2 } };
    const plan = generateFormationPlan({ members, attendance: attendAll(members), formationTemplate: T11 });
    const avg = (ids: string[]) =>
      ids.reduce((s, id) => s + (plan.summary.find((x) => x.memberId === id)?.totalQuarters ?? 0), 0) / ids.length;
    const stepAvg = avg(steps.map((m) => m.id));
    const mercAvg = avg(mercs.map((m) => m.id));
    expect(stepAvg).toBeGreaterThanOrEqual(mercAvg);
  });

  it("인원 초과 시 준회원/월2회가 2쿼터로 먼저 컷되고 정회원은 3쿼터를 확보한다", () => {
    const T11: FormationTemplate = { id: "t11", name: "11인제", playerCount: 11, positions: { GK: 1, DF: 4, MF: 4, FW: 2 } };
    const reg = Array.from({ length: 8 }, (_, i) => mk(`정${i}`, "정회원", { canPlayGK: i < 2 }));
    const m2x = Array.from({ length: 4 }, (_, i) => mk(`월${i}`, "정회원(월2회)"));
    const sub = Array.from({ length: 4 }, (_, i) => mk(`준${i}`, "준회원"));
    const members = [...reg, ...m2x, ...sub]; // 16명 → 44슬롯, 4명은 2쿼터여야 함
    const plan = generateFormationPlan({ members, attendance: attendAll(members), formationTemplate: T11 });
    const q = (id: string) => plan.summary.find((s) => s.memberId === id)?.totalQuarters ?? 0;
    // 정회원은 모두 3쿼터 이상
    for (const m of reg) expect(q(m.id)).toBeGreaterThanOrEqual(3);
    // 준회원이 가장 먼저 컷되어 2쿼터
    for (const m of sub) expect(q(m.id)).toBe(2);
    // 준회원 출전 쿼터 <= 정회원 출전 쿼터
    const regMin = Math.min(...reg.map((m) => q(m.id)));
    const subMax = Math.max(...sub.map((m) => q(m.id)));
    expect(subMax).toBeLessThanOrEqual(regMin);
  });

  it("벤치가 있을 때 어떤 선수도 필드 4쿼터를 뛰지 않는다(필드 최대 3 + GK/휴식)", () => {
    const T11: FormationTemplate = { id: "t11", name: "11인제", playerCount: 11, positions: { GK: 1, DF: 4, MF: 4, FW: 2 } };
    // 14명(GK 가능 4명) → 매 쿼터 3명 휴식 가능, 전원 필드 3 이하 가능
    const gkCapable = [0, 1, 2, 3];
    const members = Array.from({ length: 14 }, (_, i) => mk(`P${i}`, "정회원", { canPlayGK: gkCapable.includes(i) }));
    const plan = generateFormationPlan({ members, attendance: attendAll(members), formationTemplate: T11 });
    for (const s of plan.summary) {
      expect(s.fieldQuarters).toBeLessThanOrEqual(3); // 필드는 최대 3
      expect(s.totalQuarters).toBeLessThanOrEqual(4); // 총합도 4 이하(3필드+1GK)
    }
    // GK 가 아닌 선수는 총 출전이 3 이하(4쿼터 풀출전 없음)
    for (const s of plan.summary) {
      if (s.gkQuarters === 0) expect(s.totalQuarters).toBeLessThanOrEqual(3);
    }
  });

  it("3쿼터 출전 시 주 포지션 2회 + 부 포지션 1회로 배정한다", () => {
    // 4인 템플릿(GK1 DF1 MF1 FW1), 4명 → 전원 4쿼터. GK 1명이 GK 전담, 타겟은 필드 4쿼터.
    const T4: FormationTemplate = { id: "t4", name: "4인", playerCount: 4, positions: { GK: 1, DF: 1, MF: 1, FW: 1 } };
    const gk = mk("키퍼", "정회원", { canPlayGK: true, positions: ["MF"] });
    const target = mk("타겟", "정회원", { positions: ["DF", "MF"] }); // 주=DF, 부=MF
    const fa = mk("A", "정회원", { positions: ["FW"] });
    const fb = mk("B", "정회원", { positions: ["FW"] });
    const members = [gk, target, fa, fb];
    const plan = generateFormationPlan({ members, attendance: attendAll(members), formationTemplate: T4 });
    let df = 0,
      mf = 0;
    plan.quarters.forEach((q) =>
      q.players.forEach((p) => {
        if (p.memberId === target.id && !p.isGK) {
          if (p.position === "DF") df++;
          if (p.position === "MF") mf++;
        }
      }),
    );
    expect(df).toBe(3); // 주 포지션 3회 (4쿼터 풀출전이므로 3+1)
    expect(mf).toBe(1); // 부 포지션 1회
  });

  it("GK 로 출전한 선수는 (자동) 휴식 쿼터가 없어야 한다", () => {
    const T11: FormationTemplate = { id: "t11", name: "11인제", playerCount: 11, positions: { GK: 1, DF: 4, MF: 4, FW: 2 } };
    const gkCapable = [0, 1, 2, 3];
    const members = Array.from({ length: 14 }, (_, i) => mk(`P${i}`, "정회원", { canPlayGK: gkCapable.includes(i) }));
    const plan = generateFormationPlan({ members, attendance: attendAll(members), formationTemplate: T11 });
    for (const s of plan.summary) {
      if (s.gkQuarters > 0) expect(s.restQuarters).toBe(0); // GK 본 사람은 휴식 0
    }
  });

  it("정원+여유 범위(14명)면 아무도 2쿼터 이상 쉬지 않는다(휴식 ≤ 1)", () => {
    const T11: FormationTemplate = { id: "t11", name: "11인제", playerCount: 11, positions: { GK: 1, DF: 4, MF: 4, FW: 2 } };
    // 14명(=44슬롯/3) → 전원 3쿼터 이상 가능. GK 가능자 없음
    const members = Array.from({ length: 14 }, (_, i) => mk(`P${i}`, "정회원"));
    const plan = generateFormationPlan({ members, attendance: attendAll(members), formationTemplate: T11 });
    for (const s of plan.summary) {
      expect(s.restQuarters).toBeLessThanOrEqual(1); // 휴식은 최대 1쿼터
      expect(s.totalQuarters).toBeGreaterThanOrEqual(3); // 전원 3쿼터 이상
      if (s.gkQuarters > 0) expect(s.restQuarters).toBe(0); // GK 본 사람은 휴식 0
    }
  });

  it("전담 GK(순수 키퍼: GK 가능 + 필드 포지션 없음)는 4쿼터 모두 GK 로 고정된다", () => {
    const T11: FormationTemplate = { id: "t11", name: "11인제", playerCount: 11, positions: { GK: 1, DF: 4, MF: 4, FW: 2 } };
    const keeper = mk("키퍼", "용병", { canPlayGK: true, positions: ["ANY"] });
    const members = [keeper, ...Array.from({ length: 12 }, (_, i) => mk(`P${i}`, "정회원"))];
    const plan = generateFormationPlan({ members, attendance: attendAll(members), formationTemplate: T11 });
    const s = plan.summary.find((x) => x.memberId === keeper.id)!;
    expect(s.gkQuarters).toBe(4);
    expect(s.fieldQuarters).toBe(0);
    // 다른 선수는 GK 를 보지 않는다(전담 키퍼가 전담)
    for (const x of plan.summary) if (x.memberId !== keeper.id) expect(x.gkQuarters).toBe(0);
  });

  it("채팅 규칙: 준회원 최대 2쿼터를 적용한다", () => {
    const members = [
      mk("정1", "정회원", { canPlayGK: true }),
      mk("정2", "정회원"),
      mk("정3", "정회원"),
      mk("정4", "정회원"),
      mk("준1", "준회원"),
      mk("준2", "준회원"),
      mk("용1", "용병"),
      mk("용2", "용병"),
    ];
    const chatRules: ChatFormationRule[] = [
      { id: "r1", type: "MAX_QUARTERS_BY_MEMBER_TYPE", memberType: "준회원", maxQuarters: 2 },
    ];
    const plan = generateFormationPlan({ members, attendance: attendAll(members), formationTemplate: T7, chatRules });
    const jun = plan.summary.filter((s) => members.find((m) => m.id === s.memberId)?.memberType === "준회원");
    for (const s of jun) expect(s.totalQuarters).toBeLessThanOrEqual(2);
  });

  it("채팅 규칙: FORCE_REST 로 특정 쿼터 휴식시킨다", () => {
    const members = Array.from({ length: 7 }, (_, i) => mk(`P${i}`, "정회원", { canPlayGK: i === 0 }));
    const target = members[1];
    const chatRules: ChatFormationRule[] = [{ id: "r1", type: "FORCE_REST", memberId: target.id, quarter: 1 }];
    const plan = generateFormationPlan({ members, attendance: attendAll(members), formationTemplate: T7, chatRules });
    const q1 = plan.quarters[0];
    expect(q1.players.some((p) => p.memberId === target.id)).toBe(false);
    expect(q1.rests).toContain(target.id);
  });

  it("채팅 규칙: BAN_POSITION GK 를 적용해 해당 선수는 GK 로 배정되지 않는다", () => {
    const members = [
      mk("철수", "정회원", { canPlayGK: true }),
      mk("영희", "정회원", { canPlayGK: true }),
      mk("C", "정회원"),
      mk("D", "정회원"),
      mk("E", "정회원"),
      mk("F", "정회원"),
      mk("G", "정회원"),
    ];
    const chatRules: ChatFormationRule[] = [{ id: "r1", type: "BAN_POSITION", memberId: members[0].id, position: "GK" }];
    const plan = generateFormationPlan({ members, attendance: attendAll(members), formationTemplate: T7, chatRules });
    const cheolsuGK = plan.quarters.some((q) => q.players.some((p) => p.memberId === members[0].id && p.isGK));
    expect(cheolsuGK).toBe(false);
  });
});
