-- READ ONLY. Run as the database owner; retain results with the release record.
-- Migration source files do not prove that these definitions are installed.
begin transaction read only;
select table_schema, table_name
from information_schema.tables
where table_schema = 'public' and table_name in ('broker_accounts','holdings','investment_transactions','portfolio_snapshots','user_watchlist');
select c.relname, c.relrowsecurity, c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('holdings','investment_transactions','user_watchlist');
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname='public' and tablename in ('holdings','investment_transactions','user_watchlist');
select c.relname, con.conname, pg_get_constraintdef(con.oid) as definition
from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('holdings','investment_transactions','broker_accounts','user_watchlist');
select p.proname, pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer, p.proconfig, p.proacl, pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and (p.proname like '%transaction%' or p.proname like '%holding%' or p.proname like '%broker%') and p.prokind='f';
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema='public' and table_name in ('holdings','investment_transactions','user_watchlist');
rollback;
