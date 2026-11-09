-- 004_lock_profile_roles_and_inquiries.sql: close two holes left by 002_rls_policies.sql.
--
-- 1. PRIVILEGE ESCALATION. "Profiles: own profile writable" let any signed-in user UPDATE their own profile row, with no limit on
--    which columns. The anon key is in every page's JavaScript and Supabase Auth allows sign-up unless it is switched off, so
--    anyone could sign up and then run  update profiles set role = 'admin' where id = <own id>  and be let into the admin area
--    (the proxy and the admin layout both trust profiles.role). A trigger now refuses a role change by a signed-in user who is
--    not an admin. Direct database access (the SQL editor, migrations) and the service-role key carry no user, so they still
--    work: that is how the first admin is made and how scripts/create-admin-users.mjs works.
-- 2. UNCHECKED PUBLIC INSERTS. "Inquiries: public insert" (with check (true)) let anyone with the anon key insert rows straight
--    into the table, skipping the form's validation, honeypot and rate limit, and choosing their own status and notes. The site
--    only ever inserts through the service-role client (lib/actions/inquiry.ts, app/api/inquiries/route.ts), which bypasses RLS,
--    so the policy is not needed and is dropped.
--
-- Safe to apply twice.

create or replace function public.prevent_profile_privilege_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'A profile id cannot be changed' using errcode = '42501';
  end if;
  -- auth.uid() is null for the SQL editor, migrations and the service-role key: those are trusted.
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only an admin can change a role' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_privilege_change on public.profiles;
create trigger profiles_prevent_privilege_change
  before update on public.profiles
  for each row execute function public.prevent_profile_privilege_change();

-- A user may only ever write their own row (the USING clause alone left the new row unchecked).
drop policy if exists "Profiles: own profile writable" on public.profiles;
create policy "Profiles: own profile writable"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "Inquiries: public insert" on public.inquiries;
