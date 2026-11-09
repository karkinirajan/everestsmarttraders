-- 006_keepalive_heartbeat.sql: daily write heartbeat so Supabase Free Tier never pauses from inactivity.
--
-- Supabase pauses free-tier databases after 7 days without database activity. A cached page view or a read-only check may
-- never write to Postgres. Calling public.record_heartbeat(source) once a day (via Vercel Cron, GitHub Actions, or the
-- /api/keepalive and /api/health endpoints) performs a real INSERT/UPDATE + cleanup transaction in Postgres every day,
-- keeping the database active while pruning rows older than 30 days so storage stays tiny forever.
--
-- Safe to apply twice.

create table if not exists public.system_heartbeats (
  day          date        primary key,
  beat_count   integer     not null default 1,
  last_beat_at timestamptz not null default now(),
  last_source  text        not null default 'cron'
);

alter table public.system_heartbeats enable row level security;

create or replace function public.record_heartbeat(p_source text default 'cron')
returns jsonb
language plpgsql
as $$
declare
  v_source text;
  v_count  integer;
  v_now    timestamptz;
begin
  v_source := coalesce(nullif(left(btrim(coalesce(p_source, '')), 64), ''), 'cron');

  insert into public.system_heartbeats (day, beat_count, last_beat_at, last_source)
  values (current_date, 1, now(), v_source)
  on conflict (day) do update
    set beat_count   = system_heartbeats.beat_count + 1,
        last_beat_at = now(),
        last_source  = excluded.last_source
  returning beat_count, last_beat_at into v_count, v_now;

  delete from public.system_heartbeats
  where day < current_date - 30;

  delete from public.rate_limits
  where window_start < now() - interval '1 day';

  return jsonb_build_object(
    'ok', true,
    'day', current_date::text,
    'beat_count', v_count,
    'recorded_at', v_now,
    'source', v_source
  );
end;
$$;

revoke all on function public.record_heartbeat(text) from public, anon, authenticated;
grant execute on function public.record_heartbeat(text) to service_role;
