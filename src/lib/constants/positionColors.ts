// ─────────────────────────────────────────────────────────────
// 포지션 그룹별 색상 단일 정의 (전술 보드 다크 테마용 hex)
//   FW 레드 / MF 그린 / DF 블루 / GK 옐로
// 라이트 테마 뱃지는 components/ui/Badge.tsx 의 PositionBadge 참조.
// ─────────────────────────────────────────────────────────────
import type { Group } from "@/lib/formation/positions";

export const POS_HEX: Record<Group, string> = {
  FW: "#ff5666",
  MF: "#31ef76",
  DF: "#45a1ff",
  GK: "#ffc928",
};
