// ─────────────────────────────────────────────────────────────
// /api/members — 추후 DB 연동용 스캐폴드
//
// 현재 MVP 는 데이터를 브라우저 localStorage 에 저장하므로 이 라우트는
// 자리표시자(placeholder)입니다. Supabase/Firebase 연동 시 여기에서
// memberRepository 를 서버 DB 구현으로 교체해 CRUD 를 처리하세요.
// ─────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    note: "회원 데이터는 현재 클라이언트 localStorage 에서 관리됩니다. DB 연동 시 이 라우트를 구현하세요.",
    data: [],
  });
}
