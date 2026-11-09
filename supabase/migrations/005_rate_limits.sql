-- 005_rate_limits.sql: counters for the contact and quote forms, kept in Postgres so they hold across serverless instances.
--
-- The counters hold a hash of who (a caller address), never the value. Only the service-role key may touch them: the table has
-- RLS on and no policy, and the function is not executable by anon or authenticated (PostgREST would otherwise expose it to
-- anyone with the anon key, who could then use up other people's allowance). Until this is applied, lib/rate-limit.ts logs a
-- warning once and falls back to a per-process counter, so nothing breaks, it just limits less.
--
-- Safe to apply twice.

create table if not exists public.rate_limits (
  key          text        not null,
  window_start timestamptz not null,
  count        integer     not null default 1,
  primary key (key, window_start)
);

create index if not exists rate_limits_window_start_idx on public.rate_limits (window_start);

alter table public.rate_limits enable row level security;

-- One atomic upsert per call. Returns the count in the current fixed window, including this call. Old windows are swept now
-- and then.
create or replace function public.rate_limit_hit(p_key text, p_window_seconds integer)
returns integer
language plpgsql
as $$
declare
  v_start timestamptz;
  v_count integer;
begin
  if p_window_seconds < 1 then
    raise exception 'window must be at least one second';
  end if;
  v_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limits (key, window_start, count)
  values (p_key, v_start, 1)
  on conflict (key, window_start) do update set count = rate_limits.count + 1
  returning count into v_count;

  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_count;
end;
$$;

revoke all on function public.rate_limit_hit(text, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer) to service_role;
