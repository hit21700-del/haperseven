// ─────────────────────────────────────────────────────────────
// 경기 저장소 (localStorage 구현)
// ─────────────────────────────────────────────────────────────
import type { Match } from "@/types/match";
import { readJSON, writeJSON, STORAGE_KEYS } from "./storage";

export interface MatchRepository {
  getAll(): Match[];
  saveAll(matches: Match[]): void;
  add(match: Match): Match[];
  update(match: Match): Match[];
  remove(id: string): Match[];
}

export const matchRepository: MatchRepository = {
  getAll() {
    // 최신 날짜 우선 정렬
    return readJSON<Match[]>(STORAGE_KEYS.matches, []).sort((a, b) => b.date.localeCompare(a.date));
  },
  saveAll(matches) {
    writeJSON(STORAGE_KEYS.matches, matches);
  },
  add(match) {
    const list = [...this.getAll(), match];
    this.saveAll(list);
    return list;
  },
  update(match) {
    const list = this.getAll().map((m) => (m.id === match.id ? match : m));
    this.saveAll(list);
    return list;
  },
  remove(id) {
    const list = this.getAll().filter((m) => m.id !== id);
    this.saveAll(list);
    return list;
  },
};

export function newMatchId(): string {
  return `match-${Date.now().toString(36)}`;
}
