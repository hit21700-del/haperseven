// ─────────────────────────────────────────────────────────────
// 회원 저장소 (localStorage 구현)
// 인터페이스를 통해 추후 DB 구현으로 교체 가능
// ─────────────────────────────────────────────────────────────
import type { Member } from "@/types/member";
import { readJSON, writeJSON, STORAGE_KEYS } from "./storage";

export interface MemberRepository {
  getAll(): Member[];
  saveAll(members: Member[]): void;
  add(member: Member): Member[];
  update(member: Member): Member[];
  remove(id: string): Member[];
}

export const memberRepository: MemberRepository = {
  getAll() {
    return readJSON<Member[]>(STORAGE_KEYS.members, []);
  },
  saveAll(members) {
    writeJSON(STORAGE_KEYS.members, members);
  },
  add(member) {
    const list = [...this.getAll(), member];
    this.saveAll(list);
    return list;
  },
  update(member) {
    const list = this.getAll().map((m) => (m.id === member.id ? member : m));
    this.saveAll(list);
    return list;
  },
  remove(id) {
    const list = this.getAll().filter((m) => m.id !== id);
    this.saveAll(list);
    return list;
  },
};

/** 새 회원 id 생성 */
export function newMemberId(): string {
  return `m-${Math.abs(hashNow()).toString(36)}`;
}

// Date.now 사용 (앱 런타임), 충돌 회피용 간이 해시
function hashNow(): number {
  const t = Date.now();
  return (t ^ (t >>> 3) ^ Math.floor(performance.now() * 1000)) | 0;
}
