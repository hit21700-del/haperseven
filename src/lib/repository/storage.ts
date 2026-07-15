// ─────────────────────────────────────────────────────────────
// localStorage 기반 저장소 헬퍼 (SSR-safe)
//
// ▶ DB 연동 시 교체 포인트:
//   이 파일과 *Repository.ts 들만 교체하면 됩니다.
//   예) Supabase 라면 read/write 를 supabase.from(key).select()/upsert() 로 바꿉니다.
// ─────────────────────────────────────────────────────────────

const PREFIX = "haperseven:";

/** 저장소 키 모음 (한 곳에서 관리) */
export const STORAGE_KEYS = {
  members: `${PREFIX}members`,
  matches: `${PREFIX}matches`,
  paymentEntries: `${PREFIX}paymentEntries`,
  extraExpenses: `${PREFIX}extraExpenses`,
  refunds: `${PREFIX}refunds`,
  formationTemplates: `${PREFIX}formationTemplates`,
  seeded: `${PREFIX}seeded`,
  seedVersion: `${PREFIX}seedVersion`,
  teamsSeeded: `${PREFIX}teamsSeeded`,
  paymentSeeded: `${PREFIX}paymentSeeded`,
  teamBalance: `${PREFIX}teamBalance`,
} as const;

/** JSON 값을 읽는다. 없거나 파싱 실패 시 fallback 반환 */
export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // 손상된 데이터는 무시하고 기본값 사용
    return fallback;
  }
}

/** JSON 값을 저장한다 */
export function writeJSON<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // 용량 초과 등은 콘솔에만 남긴다(민감정보 없음)
    console.error("localStorage 저장 실패:", key, e);
  }
}

/** 전체 초기화(개발용) */
export function clearAll(): void {
  if (typeof window === "undefined") return;
  Object.values(STORAGE_KEYS).forEach((k) => window.localStorage.removeItem(k));
}
