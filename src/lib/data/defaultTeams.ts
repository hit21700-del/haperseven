// ─────────────────────────────────────────────────────────────
// 자체전 기본 팀 배정 (화이트 / 블랙)
// 상/하반기에 한 번씩 바뀌므로, 팀 편집 화면에서 언제든 수정 가능.
// 아래는 최초 1회 이름 기준으로 적용되는 기본값이다.
// ─────────────────────────────────────────────────────────────
import type { Member } from "@/types/member";
import { newMemberId } from "@/lib/repository/memberRepository";

export const DEFAULT_WHITE = [
  "봉진영",
  "봉진우",
  "황동건",
  "이양호",
  "송영오",
  "이장형",
  "권태진",
  "최우람",
  "박성재",
  "고혁준",
  "배현우",
  "정영빈",
  "최성우",
  "정민영",
  "오한샘",
];

export const DEFAULT_BLACK = [
  "김민수",
  "황민성",
  "임건",
  "황인태",
  "성태현",
  "이수형",
  "윤종현",
  "이지섭",
  "이종창",
  "강혁준",
  "이우섭",
  "양윤석",
  "박찬해",
  "박건",
  "이창현",
];

export const DEFAULT_COACHES = ["봉진영", "봉진우", "김민수", "황민성"];

const norm = (s: string) => s.replace(/\s/g, "");

/**
 * 이름 기준으로 화이트/블랙 팀과 감독을 적용한다(최초 1회).
 * 명단에 없는 이름(예: 박성재)은 새 회원으로 추가한다.
 */
export function applyDefaultTeams(members: Member[]): Member[] {
  const white = new Set(DEFAULT_WHITE.map(norm));
  const black = new Set(DEFAULT_BLACK.map(norm));
  const coaches = new Set(DEFAULT_COACHES.map(norm));

  const result = members.map((m) => {
    const n = norm(m.name);
    const team = white.has(n) ? "WHITE" : black.has(n) ? "BLACK" : m.team;
    return { ...m, team, isCoach: coaches.has(n) || m.isCoach } as Member;
  });

  // 명단에 없는 이름을 새 회원으로 추가
  const existing = new Set(result.map((m) => norm(m.name)));
  const missing = [...DEFAULT_WHITE, ...DEFAULT_BLACK].filter((name) => !existing.has(norm(name)));
  for (const name of missing) {
    const isWhite = white.has(norm(name));
    result.push({
      id: newMemberId(),
      name,
      memberType: "정회원",
      feeAmount: 0,
      feePeriod: "6개월",
      positions: ["ANY"],
      canPlayGK: false,
      fixedGK: false,
      isActive: true,
      monthlyPaymentStatus: {},
      team: isWhite ? "WHITE" : "BLACK",
      isCoach: coaches.has(norm(name)),
      note: "팀 배정 시 자동 추가됨",
    });
  }
  return result;
}
