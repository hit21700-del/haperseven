// ─────────────────────────────────────────────────────────────
// /api/payments — 추후 DB 연동용 스캐폴드 (현재는 localStorage 사용)
// ─────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    note: "회비 데이터는 현재 클라이언트 localStorage 에서 관리됩니다. DB 연동 시 이 라우트를 구현하세요.",
    data: [],
  });
}
