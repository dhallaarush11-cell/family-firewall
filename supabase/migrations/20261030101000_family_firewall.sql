create extension if not exists pgcrypto with schema extensions;

create table families (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table members (
  id uuid primary key references auth.users(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
  role text not null check (role in ('elder','guardian')),
  display_name text not null,
  language text not null default 'hi',
  created_at timestamptz not null default now()
);

create table pairing_codes (
  code text primary key,
  family_id uuid not null references families(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);

create table events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  type text not null check (type in ('pause_pressed','drill_completed','booster_due')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  acknowledged_by uuid references members(id) on delete set null,
  acknowledged_at timestamptz
);

create table drill_sessions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  scenario_id text not null,
  scenario_version int not null default 1,
  outcome text not null check (outcome in ('safe','almost','retry')),
  hung_up boolean not null default false,
  refused_money boolean not null default false,
  refused_otp boolean not null default false,
  told_someone boolean not null default false,
  pause_used boolean not null default false,
  pressure_flags text[] not null default '{}',
  duration_sec int,
  observer_id uuid,
  created_at timestamptz not null default now()
);

create index on events (family_id, created_at desc);
create index on drill_sessions (family_id, created_at desc);

create or replace function my_family() returns uuid
language sql stable security definer set search_path = public as $$
  select family_id from members where id = auth.uid()
$$;

alter table families enable row level security;
alter table members enable row level security;
alter table pairing_codes enable row level security;
alter table events enable row level security;
alter table drill_sessions enable row level security;

create policy families_select on families for select to authenticated using (id = my_family());
create policy members_select on members for select to authenticated using (family_id = my_family());
create policy members_update_self on members for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and family_id = my_family());
create policy events_select on events for select to authenticated using (family_id = my_family());
create policy events_insert on events for insert to authenticated with check (member_id = auth.uid() and family_id = my_family());
create policy events_ack on events for update to authenticated using (family_id = my_family()) with check (family_id = my_family());
create policy drills_select on drill_sessions for select to authenticated using (family_id = my_family());
create policy drills_insert on drill_sessions for insert to authenticated with check (member_id = auth.uid() and family_id = my_family());

revoke update on events from authenticated;
grant update (acknowledged_by, acknowledged_at) on events to authenticated;

create or replace function create_family(p_name text, p_role text, p_lang text)
returns uuid language plpgsql security definer set search_path = public as $$
declare fid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if exists (select 1 from members where id = auth.uid()) then raise exception 'already in a family'; end if;
  insert into families default values returning id into fid;
  insert into members(id, family_id, role, display_name, language)
    values (auth.uid(), fid, p_role, left(p_name, 40), p_lang);
  return fid;
end $$;

create or replace function create_pairing_code()
returns text language plpgsql security definer set search_path = public, extensions as $$
declare fid uuid; c text; i int;
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  select family_id into fid from members where id = auth.uid();
  if fid is null then raise exception 'not in a family'; end if;
  loop
    c := '';
    for i in 1..6 loop
      c := c || substr(alphabet, 1 + (get_byte(gen_random_bytes(1), 0) % length(alphabet)), 1);
    end loop;
    exit when not exists (select 1 from pairing_codes where code = c);
  end loop;
  insert into pairing_codes(code, family_id, created_by, expires_at)
    values (c, fid, auth.uid(), now() + interval '10 minutes');
  return c;
end $$;

create or replace function redeem_pairing_code(p_code text, p_name text, p_role text, p_lang text)
returns uuid language plpgsql security definer set search_path = public as $$
declare rec pairing_codes%rowtype;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if exists (select 1 from members where id = auth.uid()) then raise exception 'already in a family'; end if;
  select * into rec from pairing_codes
    where code = upper(trim(p_code)) and used_at is null and expires_at > now() for update;
  if not found then raise exception 'invalid or expired code'; end if;
  insert into members(id, family_id, role, display_name, language)
    values (auth.uid(), rec.family_id, p_role, left(p_name, 40), p_lang);
  update pairing_codes set used_at = now() where code = rec.code;
  return rec.family_id;
end $$;

create or replace function leave_family()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from members where id = auth.uid();
  delete from families f where not exists (select 1 from members m where m.family_id = f.id);
end $$;

revoke all on function create_family(text, text, text) from public;
revoke all on function create_pairing_code() from public;
revoke all on function redeem_pairing_code(text, text, text, text) from public;
revoke all on function leave_family() from public;
grant execute on function create_family(text, text, text) to authenticated;
grant execute on function create_pairing_code() to authenticated;
grant execute on function redeem_pairing_code(text, text, text, text) to authenticated;
grant execute on function leave_family() to authenticated;

alter publication supabase_realtime add table events;
