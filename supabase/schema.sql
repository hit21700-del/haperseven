-- ═══════════════════════════════════════════════════════════════
-- 하퍼세븐 (Harper Seven) — Supabase 스키마 (v2)
-- Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여 넣고 Run.
-- 다시 실행해도 안전하도록 if not exists / or replace 로 작성.
-- ═══════════════════════════════════════════════════════════════

-- ── 계정 프로필 (auth.users 1:1) ────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  provider text,
  role text not null default 'member' check (role in ('operator', 'member')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'blocked')),
  member_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 데이터 테이블: id + 문서(jsonb) ─────────────────────────────
create table if not exists public.members (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.matches (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ── 참석 투표 (공개 링크로 로그인 없이 투표) ────────────────────
-- v1 의 attendance_votes 는 match_votes 로 대체 (데이터 없음)
drop table if exists public.attendance_votes;

create table if not exists public.match_votes (
  match_id text not null,
  voter_key text not null,          -- 'member:<memberId>' 또는 'guest:<이름>'
  member_id text,
  guest_name text,
  guest_positions text,             -- 'CM,ST' (용병)
  guest_age int,
  status text not null check (status in ('ATTEND', 'ABSENT', 'LATE', 'INJURED')),
  memo text,
  updated_at timestamptz not null default now(),
  primary key (match_id, voter_key)
);

-- ── 권한 헬퍼 (security definer: RLS 우회하여 프로필 조회) ───────
create or replace function public.is_approved()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'approved');
$$;

create or replace function public.is_operator()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'approved' and role = 'operator');
$$;

-- ── 가입 시 프로필 자동 생성: 첫 계정은 운영자(승인), 이후는 회원(승인 대기) ──
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  first_user boolean;
begin
  select count(*) = 0 into first_user from public.profiles;
  insert into public.profiles (id, email, display_name, avatar_url, provider, role, status)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'preferred_username',
      new.raw_user_meta_data->>'nickname',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    coalesce(new.raw_app_meta_data->>'provider', 'email'),
    case when first_user then 'operator' else 'member' end,
    case when first_user then 'approved' else 'pending' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── updated_at 자동 갱신 ───────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
do $$
declare t text;
begin
  foreach t in array array['profiles','members','matches','settings','match_votes'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format('create trigger touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ── 공개 투표 RPC (링크 토큰 검증 후 security definer 로 처리) ────
-- 투표 페이지 데이터: 경기 요약 + 활동 회원 명단 + 현재 투표
create or replace function public.vote_page(p_match_id text, p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  m jsonb;
begin
  select data into m from public.matches where id = p_match_id;
  if m is null or coalesce(m->>'voteToken', '') = '' or m->>'voteToken' <> p_token then
    raise exception 'invalid_token' using errcode = 'P0001';
  end if;
  return jsonb_build_object(
    'match', jsonb_build_object(
      'id', p_match_id, 'date', m->>'date', 'time', m->>'time', 'title', m->>'title',
      'opponent', m->>'opponent', 'location', m->>'location', 'matchType', m->>'matchType',
      'status', m->>'status'
    ),
    'members', (
      select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', data->>'name', 'memberType', data->>'memberType')
                                order by data->>'name'), '[]'::jsonb)
      from public.members where coalesce((data->>'isActive')::boolean, true)
    ),
    'votes', (
      select coalesce(jsonb_agg(to_jsonb(v) - 'match_id' order by v.updated_at), '[]'::jsonb)
      from public.match_votes v where v.match_id = p_match_id
    )
  );
end;
$$;

-- 투표 저장/변경/취소 (p_status null 이면 취소)
create or replace function public.cast_vote(
  p_match_id text, p_token text, p_voter_key text,
  p_member_id text, p_guest_name text, p_guest_positions text, p_guest_age int,
  p_status text, p_memo text
) returns void language plpgsql security definer set search_path = public as $$
declare
  m jsonb;
begin
  select data into m from public.matches where id = p_match_id;
  if m is null or coalesce(m->>'voteToken', '') = '' or m->>'voteToken' <> p_token then
    raise exception 'invalid_token' using errcode = 'P0001';
  end if;
  if p_status is null then
    delete from public.match_votes where match_id = p_match_id and voter_key = p_voter_key;
    return;
  end if;
  insert into public.match_votes (match_id, voter_key, member_id, guest_name, guest_positions, guest_age, status, memo)
  values (p_match_id, p_voter_key, p_member_id, p_guest_name, p_guest_positions, p_guest_age, p_status, p_memo)
  on conflict (match_id, voter_key) do update
    set member_id = excluded.member_id, guest_name = excluded.guest_name,
        guest_positions = excluded.guest_positions, guest_age = excluded.guest_age,
        status = excluded.status, memo = excluded.memo, updated_at = now();
end;
$$;

grant execute on function public.vote_page(text, text) to anon, authenticated;
grant execute on function public.cast_vote(text, text, text, text, text, text, int, text, text) to anon, authenticated;

-- ── RLS ──────────────────────────────────────────────────────────
alter table public.profiles    enable row level security;
alter table public.members     enable row level security;
alter table public.matches     enable row level security;
alter table public.settings    enable row level security;
alter table public.match_votes enable row level security;

drop policy if exists "profiles select" on public.profiles;
create policy "profiles select" on public.profiles for select
  using (id = auth.uid() or public.is_operator());
drop policy if exists "profiles update by operator" on public.profiles;
create policy "profiles update by operator" on public.profiles for update
  using (public.is_operator()) with check (public.is_operator());
drop policy if exists "profiles delete by operator" on public.profiles;
create policy "profiles delete by operator" on public.profiles for delete
  using (public.is_operator() and id <> auth.uid());

do $$
declare t text;
begin
  foreach t in array array['members','matches','settings'] loop
    execute format('drop policy if exists "%1$s read" on public.%1$s', t);
    execute format('create policy "%1$s read" on public.%1$s for select using (public.is_approved())', t);
    execute format('drop policy if exists "%1$s write" on public.%1$s', t);
    execute format('create policy "%1$s write" on public.%1$s for all using (public.is_operator()) with check (public.is_operator())', t);
  end loop;
end $$;

-- 투표: 승인된 계정은 조회, 쓰기는 RPC(cast_vote)로만 / 운영자는 직접 삭제 가능
drop policy if exists "votes read" on public.match_votes;
create policy "votes read" on public.match_votes for select using (public.is_approved());
drop policy if exists "votes operator write" on public.match_votes;
create policy "votes operator write" on public.match_votes for all
  using (public.is_operator()) with check (public.is_operator());

-- ── 실시간 변경 알림 ─────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['profiles','members','matches','settings','match_votes'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
