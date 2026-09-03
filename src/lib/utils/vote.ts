// ─────────────────────────────────────────────────────────────
// 공개 참석 투표 링크 — 토큰 생성 / URL / 공유(Web Share → 클립보드 폴백)
// ─────────────────────────────────────────────────────────────
import type { Match } from "@/types/match";

const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

/** 링크 토큰 (URL 안전, 16자) */
export function newVoteToken(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function voteUrl(match: Pick<Match, "id" | "voteToken">, origin?: string): string | null {
  if (!match.voteToken) return null;
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/vote/${encodeURIComponent(match.id)}?t=${match.voteToken}`;
}

/** 경기 표시명 (공유 문구용) */
export function matchLabel(m: Pick<Match, "date" | "time" | "title" | "opponent" | "location" | "matchType">): string {
  const name = m.matchType === "SCRIMMAGE" ? m.title ?? "자체전" : m.opponent ? `vs ${m.opponent}` : m.title ?? "경기";
  return `${m.date}${m.time ? ` ${m.time}` : ""} ${name}${m.location ? ` @ ${m.location}` : ""}`;
}

/**
 * 투표 링크 공유 — 모바일은 공유 시트(카톡 선택 가능), 미지원이면 클립보드 복사.
 * @returns "shared" | "copied" | "failed"
 */
export async function shareVoteLink(match: Match, url: string, teamName = "하퍼세븐"): Promise<"shared" | "copied" | "failed"> {
  const text = `⚽ ${teamName} 참석 투표\n${matchLabel(match)}\n아래 링크에서 이름 선택 후 참석/불참을 눌러주세요.`;
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title: `${teamName} 참석 투표`, text, url });
      return "shared";
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return "failed";
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return "copied";
  } catch {
    return "failed";
  }
}
