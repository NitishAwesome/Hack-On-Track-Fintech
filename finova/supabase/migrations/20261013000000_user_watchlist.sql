-- Additive: independent of holdings, instruments and the transaction ledger.
create table if not exists public.user_watchlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null check (length(symbol) between 1 and 20 and symbol = upper(symbol)),
  exchange text not null default 'NSE' check (exchange = 'NSE'),
  created_at timestamptz not null default now(),
  primary key (user_id, symbol, exchange)
);
alter table public.user_watchlist enable row level security;
revoke all on public.user_watchlist from anon;
grant select, insert, delete on public.user_watchlist to authenticated;
create policy "Watchlist owner reads" on public.user_watchlist for select to authenticated using ((select auth.uid()) = user_id);
create policy "Watchlist owner follows" on public.user_watchlist for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Watchlist owner unfollows" on public.user_watchlist for delete to authenticated using ((select auth.uid()) = user_id);
