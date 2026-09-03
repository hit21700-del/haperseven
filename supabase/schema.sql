-- ═══════════════════════════════════════════════════════════════
-- 하퍼세븐 (Harper Seven) — Supabase 스키마 (v3: 멀티팀)
-- Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여 넣고 Run.
-- 다시 실행해도 안전하도록 if not exists / or replace / 가드로 작성.
--
-- v3 변경: teams 테이블 + 모든 데이터에 team_id (팀 단위 격리).
--   기존 데이터는 '하퍼세븐FC'(team-haperseven) 로 1회 이전된다.
-- ═══════════════════════════════════════════════════════════════

-- ── 팀 (테넌트) ─────────────────────────────────────────────────
create table if not exists public.teams (
  id text primary key,
  name text not null,
  code text not null unique,          -- 팀원 가입용 분류코드 (영문/숫자)
  logo_url text,                      -- '/logo-mark.png' 또는 data URL
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 하퍼세븐FC 시드 (기존 로고 사용)
insert into public.teams (id, name, code, logo_url)
values ('team-haperseven', '하퍼세븐FC', 'HSFC', '/logo-mark.png')
on conflict (id) do nothing;

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
alter table public.profiles add column if not exists team_id text;
do $$ begin
  alter table public.profiles
    add constraint profiles_team_fk foreign key (team_id) references public.teams(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ── 데이터 테이블: id + 문서(jsonb) — 모두 team_id 로 격리 ───────
create table if not exists public.members (
  id text not null,
  data jsonb not null,
  team_id text,
  updated_at timestamptz not null default now()
);
create table if not exists public.matches (
  id text not null,
  data jsonb not null,
  team_id text,
  updated_at timestamptz not null default now()
);
create table if not exists public.settings (
  key text not null,
  value jsonb not null,
  team_id text,
  updated_at timestamptz not null default now()
);
alter table public.members  add column if not exists team_id text;
alter table public.matches  add column if not exists team_id text;
alter table public.settings add column if not exists team_id text;

-- ── 참석 투표 (공개 링크로 로그인 없이 투표) ────────────────────
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
  team_id text,
  updated_at timestamptz not null default now()
);
alter table public.match_votes add column if not exists team_id text;

-- ── v3 마이그레이션: 기존 행을 하퍼세븐FC 로 1회 이전 ────────────
create table if not exists public._migrations (key text primary key, applied_at timestamptz not null default now());
alter table public._migrations enable row level security;  -- 정책 없음 = 클라이언트 접근 불가

do $$ begin
  if not exists (select 1 from public._migrations where key = 'v3_team_backfill') then
    update public.profiles    set team_id = 'team-haperseven' where team_id is null;
    update public.members     set team_id = 'team-haperseven' where team_id is null;
    update public.matches     set team_id = 'team-haperseven' where team_id is null;
    update public.settings    set team_id = 'team-haperseven' where team_id is null;
    update public.match_votes set team_id = 'team-haperseven' where team_id is null;
    insert into public._migrations (key) values ('v3_team_backfill');
  end if;
end $$;

-- ── PK 를 (team_id, …) 복합키로 교체 (팀 간 id 충돌 방지) ────────
do $$ begin
  if not exists (
    select 1 from information_schema.key_column_usage k
    join information_schema.table_constraints tc
      on tc.constraint_name = k.constraint_name and tc.table_schema = k.table_schema and tc.table_name = k.table_name
    where tc.table_schema = 'public' and tc.table_name = 'members'
      and tc.constraint_type = 'PRIMARY KEY' and k.column_name = 'team_id'
  ) then
    alter table public.members alter column team_id set not null;
    alter table public.members drop constraint if exists members_pkey;
    alter table public.members add primary key (team_id, id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.key_column_usage k
    join information_schema.table_constraints tc
      on tc.constraint_name = k.constraint_name and tc.table_schema = k.table_schema and tc.table_name = k.table_name
    where tc.table_schema = 'public' and tc.table_name = 'matches'
      and tc.constraint_type = 'PRIMARY KEY' and k.column_name = 'team_id'
  ) then
    alter table public.matches alter column team_id set not null;
    alter table public.matches drop constraint if exists matches_pkey;
    alter table public.matches add primary key (team_id, id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.key_column_usage k
    join information_schema.table_constraints tc
      on tc.constraint_name = k.constraint_name and tc.table_schema = k.table_schema and tc.table_name = k.table_name
    where tc.table_schema = 'public' and tc.table_name = 'settings'
      and tc.constraint_type = 'PRIMARY KEY' and k.column_name = 'team_id'
  ) then
    alter table public.settings alter column team_id set not null;
    alter table public.settings drop constraint if exists settings_pkey;
    alter table public.settings add primary key (team_id, key);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.key_column_usage k
    join information_schema.table_constraints tc
      on tc.constraint_name = k.constraint_name and tc.table_schema = k.table_schema and tc.table_name = k.table_name
    where tc.table_schema = 'public' and tc.table_name = 'match_votes'
      and tc.constraint_type = 'PRIMARY KEY' and k.column_name = 'team_id'
  ) then
    alter table public.match_votes alter column team_id set not null;
    alter table public.match_votes drop constraint if exists match_votes_pkey;
    alter table public.match_votes add primary key (team_id, match_id, voter_key);
  end if;
end $$;

-- 팀 삭제 시 데이터도 정리 (FK)
do $$ begin
  alter table public.members add constraint members_team_fk foreign key (team_id) references public.teams(id) on delete cascade;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.matches add constraint matches_team_fk foreign key (team_id) references public.teams(id) on delete cascade;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.settings add constraint settings_team_fk foreign key (team_id) references public.teams(id) on delete cascade;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.match_votes add constraint match_votes_team_fk foreign key (team_id) references public.teams(id) on delete cascade;
exception when duplicate_object then null; end $$;

-- ── 투표 토큰은 전역 유일 ────────────────────────────────────────
--   복합 PK(team_id, id) 로 인해 match id 가 팀 간 중복 가능해졌으므로,
--   다른 팀이 같은 voteToken 을 가진 경기를 만들어 공개 투표 링크를
--   가로채는 것을 막기 위해 토큰 자체에 전역 유일 제약을 건다.
--   (혹시 기존 데이터에 중복 토큰이 있으면 하나만 남기고 나머지를 비운다)
do $$
declare dup text;
begin
  for dup in
    select data->>'voteToken' as tok
      from public.matches
     where coalesce(data->>'voteToken','') <> ''
     group by data->>'voteToken' having count(*) > 1
  loop
    update public.matches
       set data = data - 'voteToken'
     where data->>'voteToken' = dup
       and ctid <> (select min(ctid) from public.matches m2 where m2.data->>'voteToken' = dup);
  end loop;
end $$;
create unique index if not exists matches_vote_token_uniq
  on public.matches ((data->>'voteToken'))
  where coalesce(data->>'voteToken', '') <> '';

-- ── 권한 헬퍼 (security definer: RLS 우회하여 프로필 조회) ───────
create or replace function public.is_approved()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'approved');
$$;

create or replace function public.is_operator()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'approved' and role = 'operator');
$$;

create or replace function public.my_team_id()
returns text language sql stable security definer set search_path = public as $$
  select team_id from public.profiles where id = auth.uid();
$$;

-- ── 쓰기 시 작성자의 소속팀 자동 주입 ───────────────────────────
create or replace function public.fill_team_id()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.team_id is null then
    select team_id into new.team_id from public.profiles where id = auth.uid();
  end if;
  return new;
end;
$$;
do $$
declare t text;
begin
  foreach t in array array['members','matches','settings','match_votes'] loop
    execute format('drop trigger if exists fill_team_%1$s on public.%1$s', t);
    execute format('create trigger fill_team_%1$s before insert on public.%1$s for each row execute function public.fill_team_id()', t);
  end loop;
end $$;

-- ── 가입 시 프로필 자동 생성 (팀 미소속 상태로 시작) ─────────────
--   팀 생성/가입은 로그인 후 setup_create_team / setup_join_team RPC 로 처리.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
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
    'member',
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 로그인했는데 프로필이 없으면(트리거 유실 / 운영자가 계정 삭제) 되살린다.
--   삭제된 계정이 PendingScreen 에 영구히 갇히는 것을 막고, 팀 설정부터 다시 시작하게 한다.
create or replace function public.ensure_profile()
returns void language plpgsql security definer set search_path = public as $$
declare
  u record;
begin
  if auth.uid() is null then return; end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then return; end if;
  select * into u from auth.users where id = auth.uid();
  insert into public.profiles (id, email, display_name, avatar_url, provider, role, status)
  values (
    u.id, u.email,
    coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name',
             u.raw_user_meta_data->>'preferred_username', u.raw_user_meta_data->>'nickname',
             split_part(coalesce(u.email, ''), '@', 1)),
    coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture'),
    coalesce(u.raw_app_meta_data->>'provider', 'email'),
    'member', 'pending'
  )
  on conflict (id) do nothing;
end;
$$;
grant execute on function public.ensure_profile() to authenticated;

-- ── 팀 만들기 / 팀 코드로 가입 (로그인 사용자용 RPC) ─────────────
create or replace function public.setup_create_team(p_name text, p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_name text := nullif(trim(coalesce(p_name, '')), '');
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_id text;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if v_name is null then raise exception 'team_name_required'; end if;
  if length(v_code) < 2 or length(v_code) > 12 then raise exception 'invalid_code'; end if;
  if exists (select 1 from public.profiles where id = uid and team_id is not null) then
    raise exception 'already_in_team';
  end if;
  if exists (select 1 from public.teams where code = v_code) then
    raise exception 'code_taken';
  end if;
  v_id := 'team-' || substr(md5(gen_random_uuid()::text), 1, 10);
  insert into public.teams (id, name, code) values (v_id, v_name, v_code);
  update public.profiles set team_id = v_id, role = 'operator', status = 'approved' where id = uid;
  return jsonb_build_object('id', v_id, 'name', v_name, 'code', v_code);
end;
$$;

create or replace function public.setup_join_team(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  t record;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.profiles where id = uid and team_id is not null) then
    raise exception 'already_in_team';
  end if;
  select id, name, code into t from public.teams where code = v_code;
  if not found then raise exception 'team_not_found'; end if;
  update public.profiles set team_id = t.id, role = 'member', status = 'pending' where id = uid;
  return jsonb_build_object('id', t.id, 'name', t.name, 'code', t.code);
end;
$$;

grant execute on function public.setup_create_team(text, text) to authenticated;
grant execute on function public.setup_join_team(text) to authenticated;

-- ── 팀 코드 정규화 (대문자·영숫자만) — 직접 UPDATE 로 비정규 코드가 저장돼
--    가입 정규화(upper+영숫자)와 어긋나 매칭이 깨지는 것을 막는다 ──────
create or replace function public.normalize_team_code()
returns trigger language plpgsql as $$
begin
  new.code := upper(regexp_replace(coalesce(new.code, ''), '[^A-Za-z0-9]', '', 'g'));
  if length(new.code) < 2 then
    raise exception 'invalid_code';
  end if;
  return new;
end;
$$;
drop trigger if exists normalize_team_code_trg on public.teams;
create trigger normalize_team_code_trg before insert or update of code on public.teams
  for each row execute function public.normalize_team_code();

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
  foreach t in array array['profiles','members','matches','settings','match_votes','teams'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format('create trigger touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ── 공개 투표 RPC (링크 토큰 검증 후 security definer 로 처리) ────
-- 투표 페이지 데이터: 팀/경기 요약 + 그 팀의 활동 회원 명단 + 현재 투표
create or replace function public.vote_page(p_match_id text, p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  if coalesce(p_token, '') = '' then
    raise exception 'invalid_token' using errcode = 'P0001';
  end if;
  select m.team_id, m.data, t.name as team_name, t.logo_url as team_logo
    into r
    from public.matches m
    join public.teams t on t.id = m.team_id
   where m.id = p_match_id and m.data->>'voteToken' = p_token
   limit 1;
  if not found then
    raise exception 'invalid_token' using errcode = 'P0001';
  end if;
  return jsonb_build_object(
    'team', jsonb_build_object('name', r.team_name, 'logoUrl', r.team_logo),
    'match', jsonb_build_object(
      'id', p_match_id, 'date', r.data->>'date', 'time', r.data->>'time', 'title', r.data->>'title',
      'opponent', r.data->>'opponent', 'location', r.data->>'location', 'matchType', r.data->>'matchType',
      'status', r.data->>'status'
    ),
    'members', (
      select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', data->>'name', 'memberType', data->>'memberType')
                                order by data->>'name'), '[]'::jsonb)
      from public.members where team_id = r.team_id and coalesce((data->>'isActive')::boolean, true)
    ),
    'votes', (
      select coalesce(jsonb_agg(to_jsonb(v) - 'match_id' - 'team_id' order by v.updated_at), '[]'::jsonb)
      from public.match_votes v where v.team_id = r.team_id and v.match_id = p_match_id
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
  v_team text;
begin
  if coalesce(p_token, '') = '' then
    raise exception 'invalid_token' using errcode = 'P0001';
  end if;
  select team_id into v_team
    from public.matches
   where id = p_match_id and data->>'voteToken' = p_token
   limit 1;
  if v_team is null then
    raise exception 'invalid_token' using errcode = 'P0001';
  end if;
  if p_status is null then
    delete from public.match_votes where team_id = v_team and match_id = p_match_id and voter_key = p_voter_key;
    return;
  end if;
  insert into public.match_votes (team_id, match_id, voter_key, member_id, guest_name, guest_positions, guest_age, status, memo)
  values (v_team, p_match_id, p_voter_key, p_member_id, p_guest_name, p_guest_positions, p_guest_age, p_status, p_memo)
  on conflict (team_id, match_id, voter_key) do update
    set member_id = excluded.member_id, guest_name = excluded.guest_name,
        guest_positions = excluded.guest_positions, guest_age = excluded.guest_age,
        status = excluded.status, memo = excluded.memo, updated_at = now();
end;
$$;

grant execute on function public.vote_page(text, text) to anon, authenticated;
grant execute on function public.cast_vote(text, text, text, text, text, text, int, text, text) to anon, authenticated;

-- ── RLS ──────────────────────────────────────────────────────────
alter table public.teams       enable row level security;
alter table public.profiles    enable row level security;
alter table public.members     enable row level security;
alter table public.matches     enable row level security;
alter table public.settings    enable row level security;
alter table public.match_votes enable row level security;

-- 팀: 소속 팀만 조회, 수정은 그 팀 운영자만 (생성/가입은 RPC 로만)
drop policy if exists "teams select" on public.teams;
create policy "teams select" on public.teams for select
  using (id = public.my_team_id());
drop policy if exists "teams update by operator" on public.teams;
create policy "teams update by operator" on public.teams for update
  using (public.is_operator() and id = public.my_team_id())
  with check (public.is_operator() and id = public.my_team_id());

-- 프로필: 본인 + 같은 팀 운영자
drop policy if exists "profiles select" on public.profiles;
create policy "profiles select" on public.profiles for select
  using (id = auth.uid() or (public.is_operator() and team_id is not null and team_id = public.my_team_id()));
drop policy if exists "profiles update by operator" on public.profiles;
create policy "profiles update by operator" on public.profiles for update
  using (public.is_operator() and team_id is not null and team_id = public.my_team_id())
  with check (public.is_operator() and team_id = public.my_team_id());
drop policy if exists "profiles delete by operator" on public.profiles;
create policy "profiles delete by operator" on public.profiles for delete
  using (public.is_operator() and team_id is not null and team_id = public.my_team_id() and id <> auth.uid());

-- 데이터: 같은 팀의 승인 계정만 조회, 같은 팀 운영자만 쓰기
do $$
declare t text;
begin
  foreach t in array array['members','matches','settings'] loop
    execute format('drop policy if exists "%1$s read" on public.%1$s', t);
    execute format('create policy "%1$s read" on public.%1$s for select using (public.is_approved() and team_id = public.my_team_id())', t);
    execute format('drop policy if exists "%1$s write" on public.%1$s', t);
    execute format('create policy "%1$s write" on public.%1$s for all using (public.is_operator() and team_id = public.my_team_id()) with check (public.is_operator() and team_id = public.my_team_id())', t);
  end loop;
end $$;

-- 투표: 같은 팀 승인 계정은 조회, 쓰기는 RPC(cast_vote)로만 / 같은 팀 운영자는 직접 수정 가능
drop policy if exists "votes read" on public.match_votes;
create policy "votes read" on public.match_votes for select
  using (public.is_approved() and team_id = public.my_team_id());
drop policy if exists "votes operator write" on public.match_votes;
create policy "votes operator write" on public.match_votes for all
  using (public.is_operator() and team_id = public.my_team_id())
  with check (public.is_operator() and team_id = public.my_team_id());

-- ── 실시간 변경 알림 ─────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['profiles','members','matches','settings','match_votes','teams'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
