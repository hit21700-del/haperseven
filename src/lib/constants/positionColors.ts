// ─────────────────────────────────────────────────────────────
// 포지션 그룹별 색상 단일 정의 (전술 보드 다크 테마용 hex)
//   FW 레드 / MF 그린 / DF 블루 / GK 옐로
// tailwind.config.ts 의 `pos.*` 토큰이 이 값을 참조한다.
// 라이트 화면의 포지션 뱃지는 중립색(components/ui/Badge.tsx) — 상태색과 충돌 방지.
// ─────────────────────────────────────────────────────────────
export type PosGroup = "GK" | "DF" | "MF" | "FW";

export const POS_HEX: Record<PosGroup, string> = {
  FW: "#ff5666",
  MF: "#31ef76",
  DF: "#45a1ff",
  GK: "#ffc928",
};
