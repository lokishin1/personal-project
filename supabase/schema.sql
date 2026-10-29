-- Supabase 대시보드의 SQL Editor에서 한 번 실행한다.
-- 다시 실행해도 안전하도록 if not exists / or replace / drop ... if exists를 쓴다.

-- ─── profiles: Supabase 공식 사용자 관리 패턴 ───────────────────────────────
create table if not exists public.profiles (
  id uuid not null references auth.users on delete cascade,
  display_name text,
  updated_at timestamptz not null default now(),
  primary key (id)
);

alter table public.profiles enable row level security;

revoke all on public.profiles from anon;
grant select, insert, update on public.profiles to authenticated;

drop policy if exists "profiles: owner can read" on public.profiles;
create policy "profiles: owner can read" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles: owner can insert" on public.profiles;
create policy "profiles: owner can insert" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "profiles: owner can update" on public.profiles;
create policy "profiles: owner can update" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- 가입할 때 profiles 행을 만든다. 트리거 함수라 직접 호출할 수 없지만, 실행 권한도 거둔다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── trades: 매매 기록 ────────────────────────────────────────────────────
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  symbol text not null check (symbol = upper(symbol) and length(symbol) between 1 and 20),
  name text not null,
  side text not null check (side in ('buy', 'sell')),
  trade_date date not null,
  price numeric(18, 4) not null check (price > 0),
  quantity numeric(18, 6) not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create index if not exists trades_user_id_symbol_idx on public.trades (user_id, symbol);

alter table public.trades enable row level security;

revoke all on public.trades from anon;
grant select, insert, update, delete on public.trades to authenticated;

drop policy if exists "trades: owner can read" on public.trades;
create policy "trades: owner can read" on public.trades
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "trades: owner can insert" on public.trades;
create policy "trades: owner can insert" on public.trades
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "trades: owner can update" on public.trades;
create policy "trades: owner can update" on public.trades
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "trades: owner can delete" on public.trades;
create policy "trades: owner can delete" on public.trades
  for delete to authenticated
  using ((select auth.uid()) = user_id);
