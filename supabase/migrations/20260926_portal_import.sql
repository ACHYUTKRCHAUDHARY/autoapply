-- Apply after 20260926_phase4.sql to an existing database. New installs use schema.sql.
alter table public.jobs add column if not exists owner_id uuid references auth.users(id) on delete cascade;
create index if not exists jobs_owner_id_idx on public.jobs(owner_id) where owner_id is not null;
create unique index if not exists jobs_owner_url_unique on public.jobs(owner_id,url) where owner_id is not null;
drop policy if exists "jobs read" on public.jobs;
create policy "jobs read" on public.jobs for select to authenticated
 using (owner_id is null or owner_id=auth.uid());
-- User-saved links stay private. Clients cannot insert jobs directly; this RPC enforces limits.
create or replace function public.create_private_job(
 p_url text, p_title text, p_company text, p_location text, p_job_type text, p_description text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_user uuid := auth.uid();
begin
 if v_user is null then raise exception 'Unauthorized'; end if;
 if p_url is null or length(p_url)>2048 or p_url !~ '^https://[^[:space:]/?#@]+'
    or p_title is null or length(trim(p_title)) not between 1 and 200
    or p_company is null or length(trim(p_company)) not between 1 and 200
    or p_description is null or length(trim(p_description)) not between 20 and 12000
    or length(coalesce(p_location,''))>200 or length(coalesce(p_job_type,''))>100
 then raise exception 'Invalid job details'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text,0));
 select id into v_id from public.jobs where owner_id=v_user and url=p_url;
 if v_id is not null then return v_id; end if;
 if (select count(*) from public.jobs where owner_id=v_user)>=100
 then raise exception 'Saved job limit reached'; end if;
 insert into public.jobs(owner_id,source,source_id,title,company,location,job_type,description,url)
 values(v_user,'manual',pg_catalog.gen_random_uuid()::text,trim(p_title),trim(p_company),
        coalesce(trim(p_location),''),coalesce(trim(p_job_type),''),trim(p_description),p_url)
 returning id into v_id;
 return v_id;
end $$;
revoke all on function public.create_private_job(text,text,text,text,text,text) from public;
grant execute on function public.create_private_job(text,text,text,text,text,text) to authenticated;

create or replace function public.purge_workspace()
returns void language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Unauthorized'; end if;
 delete from public.applications where user_id=auth.uid();
 delete from public.matches where user_id=auth.uid();
 delete from public.notifications where user_id=auth.uid();
 delete from public.match_runs where user_id=auth.uid();
 delete from public.jobs where owner_id=auth.uid();
 delete from public.profiles where user_id=auth.uid();
end $$;
revoke all on function public.purge_workspace() from public;
grant execute on function public.purge_workspace() to authenticated;
