// ─────────────────────────────────────────────────────────────
// Supabase 브라우저 클라이언트 (싱글턴)
//   NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 없으면
//   앱은 기존 localStorage 모드로 동작한다 (isSupabaseConfigured() === false).
//   anon 키는 공개용(publishable) 키이며, 데이터 보호는 DB 의 RLS 정책이 담당한다.
// ─────────────────────────────────────────────────────────────
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

let client: SupabaseClient | null = null;

/** 환경변수가 설정되어 있으면 클라우드(Supabase) 모드 */
export function isSupabaseConfigured(): boolean {
  return Boolean(URL && ANON);
}

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  if (!client) {
    client = createClient(URL, ANON, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
    });
  }
  return client;
}
