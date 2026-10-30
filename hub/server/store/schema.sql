-- Hub shared storage. Run once in the Cloud database SQL editor (or as a migration).
-- One generic table: every Hub collection (quotes, terms, templates, ...) is rows keyed by (collection, id).

create table if not exists public.hub_records (
  collection text not null,
  id         text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text,
  primary key (collection, id)
);

create index if not exists hub_records_collection_updated_idx
  on public.hub_records (collection, updated_at);

-- Keep updated_at honest even if a writer forgets to set it. Cut to milliseconds on purpose: the server adapter's guarded
-- update compares updated_at for equality with the millisecond ISO string it handed to the client. Re-run this file on an
-- existing database so the trigger is replaced.
create or replace function public.hub_records_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := date_trunc('milliseconds', now());
  return new;
end;
$$;

drop trigger if exists hub_records_touch on public.hub_records;
create trigger hub_records_touch
  before insert or update on public.hub_records
  for each row execute function public.hub_records_touch();

-- Row level security ON with NO policies, on purpose.
-- With RLS enabled and no policy, the anon and authenticated roles (anything the browser can use) are denied
-- every read and write. Only the server admin client (service role), which bypasses RLS, can reach this table,
-- and only after the proxy has checked the signed access token. Do not add policies and do not grant the
-- table to anon or authenticated: the Hub data must never be reachable straight from the browser.
alter table public.hub_records enable row level security;
revoke all on public.hub_records from anon, authenticated;
