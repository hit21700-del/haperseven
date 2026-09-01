-- ═══════════════════════════════════════════════════════════════
-- 하퍼세븐 (Harper Seven) — Supabase 스키마
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
  member_id text,                     -- 연결된 회원(members.id). 운영자가 승인 시 지정
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
-- 소량 컬렉션(회비 입력/지출/환불/템플릿/잔고)은 key-value 문서로 저장
create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
-- 회원 본인이 남기는 참석 투표 (운영자가 출석에 반영)
create table if not exists public.attendance_votes (
  match_id text not null,
  member_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('ATTEND', 'ABSENT', 'LATE', 'INJURED')),
  memo text,
  updated_at timestamptz not null default now(),
  primary key (match_id, member_id)
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

create or replace function public.my_member_id()
returns text language sql stable security definer set search_path = public as $$
  select member_id from public.profiles where id = auth.uid();
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
  foreach t in array array['profiles','members','matches','settings','attendance_votes'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format('create trigger touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ── RLS ──────────────────────────────────────────────────────────
alter table public.profiles         enable row level security;
alter table public.members          enable row level security;
alter table public.matches          enable row level security;
alter table public.settings         enable row level security;
alter table public.attendance_votes enable row level security;

-- profiles: 본인 + 운영자만 조회, 수정은 운영자만
drop policy if exists "profiles select" on public.profiles;
create policy "profiles select" on public.profiles for select
  using (id = auth.uid() or public.is_operator());
drop policy if exists "profiles update by operator" on public.profiles;
create policy "profiles update by operator" on public.profiles for update
  using (public.is_operator()) with check (public.is_operator());
drop policy if exists "profiles delete by operator" on public.profiles;
create policy "profiles delete by operator" on public.profiles for delete
  using (public.is_operator() and id <> auth.uid());

-- 데이터 테이블: 승인된 계정은 읽기, 운영자만 쓰기
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

-- 참석 투표: 승인된 계정은 읽기, 본인 회원의 투표만 쓰기 (운영자는 전부)
drop policy if exists "votes read" on public.attendance_votes;
create policy "votes read" on public.attendance_votes for select using (public.is_approved());
drop policy if exists "votes write own" on public.attendance_votes;
create policy "votes write own" on public.attendance_votes for all
  using (public.is_operator() or (user_id = auth.uid() and member_id = public.my_member_id()))
  with check (public.is_operator() or (user_id = auth.uid() and member_id = public.my_member_id()));

-- ── 실시간 변경 알림 (다른 기기에서 수정 시 자동 갱신) ──────────
do $$
declare t text;
begin
  foreach t in array array['profiles','members','matches','settings','attendance_votes'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
