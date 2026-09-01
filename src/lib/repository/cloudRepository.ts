// ─────────────────────────────────────────────────────────────
// Supabase 저장소 — members/matches 는 행(id + jsonb), 소량 컬렉션은 settings 문서
// 모든 쓰기는 RLS 로 운영자만 허용된다(schema.sql 참고).
// ─────────────────────────────────────────────────────────────
import { getSupabase } from "@/lib/supabase/client";
import type { Member } from "@/types/member";
import type { Match, AttendanceStatus } from "@/types/match";
import type { PaymentEntry, ExtraExpense, RefundRecord } from "@/types/payment";
import type { FormationTemplate } from "@/types/formation";

type DocTable = "members" | "matches";

export type CloudSnapshot = {
  members: Member[];
  matches: Match[];
  paymentEntries: PaymentEntry[];
  extraExpenses: ExtraExpense[];
  refunds: RefundRecord[];
  formationTemplates: FormationTemplate[] | null; // null = 미설정(기본 템플릿 사용)
  teamBalance: number | null;
};

const SETTING_KEYS = {
  paymentEntries: "payment_entries",
  extraExpenses: "extra_expenses",
  refunds: "refunds",
  formationTemplates: "formation_templates",
  teamBalance: "team_balance",
} as const;

async function fetchDocs<T>(table: DocTable): Promise<T[]> {
  const { data, error } = await getSupabase().from(table).select("data");
  if (error) throw error;
  return (data ?? []).map((r) => r.data as T);
}

async function fetchSetting<T>(key: string): Promise<T | null> {
  const { data, error } = await getSupabase().from("settings").select("value").eq("key", key).maybeSingle();
  if (error) throw error;
  return (data?.value as T) ?? null;
}

/** 전체 스냅샷 로드 */
export async function fetchSnapshot(): Promise<CloudSnapshot> {
  const [members, matches, paymentEntries, extraExpenses, refunds, formationTemplates, teamBalance] =
    await Promise.all([
      fetchDocs<Member>("members"),
      fetchDocs<Match>("matches"),
      fetchSetting<PaymentEntry[]>(SETTING_KEYS.paymentEntries),
      fetchSetting<ExtraExpense[]>(SETTING_KEYS.extraExpenses),
      fetchSetting<RefundRecord[]>(SETTING_KEYS.refunds),
      fetchSetting<FormationTemplate[]>(SETTING_KEYS.formationTemplates),
      fetchSetting<number>(SETTING_KEYS.teamBalance),
    ]);
  return {
    members,
    matches,
    paymentEntries: paymentEntries ?? [],
    extraExpenses: extraExpenses ?? [],
    refunds: refunds ?? [],
    formationTemplates,
    teamBalance,
  };
}

export async function upsertDoc<T extends { id: string }>(table: DocTable, item: T): Promise<void> {
  const { error } = await getSupabase().from(table).upsert({ id: item.id, data: item });
  if (error) throw error;
}

export async function removeDoc(table: DocTable, id: string): Promise<void> {
  const { error } = await getSupabase().from(table).delete().eq("id", id);
  if (error) throw error;
}

/** 전체 교체: 전달된 목록으로 upsert 하고, 목록에 없는 행은 삭제 */
export async function replaceDocs<T extends { id: string }>(table: DocTable, items: T[]): Promise<void> {
  const sb = getSupabase();
  if (items.length > 0) {
    const { error } = await sb.from(table).upsert(items.map((i) => ({ id: i.id, data: i })));
    if (error) throw error;
  }
  const { data: existing, error: e2 } = await sb.from(table).select("id");
  if (e2) throw e2;
  const keep = new Set(items.map((i) => i.id));
  const stale = (existing ?? []).map((r) => r.id as string).filter((id) => !keep.has(id));
  if (stale.length > 0) {
    const { error: e3 } = await sb.from(table).delete().in("id", stale);
    if (e3) throw e3;
  }
}

async function setSetting(key: string, value: unknown): Promise<void> {
  const { error } = await getSupabase().from("settings").upsert({ key, value });
  if (error) throw error;
}

export const cloudSettings = {
  setPaymentEntries: (v: PaymentEntry[]) => setSetting(SETTING_KEYS.paymentEntries, v),
  setExtraExpenses: (v: ExtraExpense[]) => setSetting(SETTING_KEYS.extraExpenses, v),
  setRefunds: (v: RefundRecord[]) => setSetting(SETTING_KEYS.refunds, v),
  setFormationTemplates: (v: FormationTemplate[]) => setSetting(SETTING_KEYS.formationTemplates, v),
  setTeamBalance: (v: number) => setSetting(SETTING_KEYS.teamBalance, v),
};

/** 스냅샷 전체를 DB 에 기록 (초기 시드 / 로컬 데이터 가져오기) */
export async function writeSnapshot(s: {
  members: Member[];
  matches: Match[];
  paymentEntries: PaymentEntry[];
  extraExpenses: ExtraExpense[];
  refunds: RefundRecord[];
  formationTemplates: FormationTemplate[];
  teamBalance: number;
}): Promise<void> {
  await replaceDocs("members", s.members);
  await replaceDocs("matches", s.matches);
  await cloudSettings.setPaymentEntries(s.paymentEntries);
  await cloudSettings.setExtraExpenses(s.extraExpenses);
  await cloudSettings.setRefunds(s.refunds);
  await cloudSettings.setFormationTemplates(s.formationTemplates);
  await cloudSettings.setTeamBalance(s.teamBalance);
}

/** 변경 구독 — 어떤 테이블이든 바뀌면 onChange (호출 측에서 디바운스) */
export function subscribeChanges(onChange: () => void): () => void {
  const channel = getSupabase()
    .channel("haperseven-db")
    .on("postgres_changes", { event: "*", schema: "public" }, () => onChange())
    .subscribe();
  return () => {
    void getSupabase().removeChannel(channel);
  };
}

// ── 참석 투표 ──────────────────────────────────────────────────
export type AttendanceVote = {
  match_id: string;
  member_id: string;
  user_id: string;
  status: AttendanceStatus;
  memo: string | null;
  updated_at: string;
};

export async function fetchVotes(matchId: string): Promise<AttendanceVote[]> {
  const { data, error } = await getSupabase().from("attendance_votes").select("*").eq("match_id", matchId);
  if (error) throw error;
  return (data ?? []) as AttendanceVote[];
}

export async function upsertVote(v: {
  match_id: string;
  member_id: string;
  user_id: string;
  status: AttendanceStatus;
  memo?: string;
}): Promise<void> {
  const { error } = await getSupabase().from("attendance_votes").upsert(v);
  if (error) throw error;
}

export async function removeVote(matchId: string, memberId: string): Promise<void> {
  const { error } = await getSupabase().from("attendance_votes").delete().match({ match_id: matchId, member_id: memberId });
  if (error) throw error;
}

// ── 프로필(계정) 관리 ─────────────────────────────────────────
export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  provider: string | null;
  role: "operator" | "member";
  status: "pending" | "approved" | "blocked";
  member_id: string | null;
  created_at: string;
};

export async function fetchMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await getSupabase().from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

export async function fetchAllProfiles(): Promise<Profile[]> {
  const { data, error } = await getSupabase().from("profiles").select("*").order("created_at");
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function updateProfile(
  id: string,
  patch: Partial<Pick<Profile, "role" | "status" | "member_id" | "display_name">>,
): Promise<void> {
  const { error } = await getSupabase().from("profiles").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteProfile(id: string): Promise<void> {
  const { error } = await getSupabase().from("profiles").delete().eq("id", id);
  if (error) throw error;
}
