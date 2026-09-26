-- Run in Supabase SQL editor. RLS is enforced for every user-owned table.
create extension if not exists pgcrypto;
create table if not exists public.profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 full_name text, headline text, skills text[] not null default '{}',
 preferences jsonb not null default '{}', resume_path text, resume_text text,
 created_at timestamptz not null default now()
);
create table if not exists public.jobs (
 id uuid primary key default gen_random_uuid(), source text not null,
 source_id text not null, title text not null, company text not null,
 location text not null default '', job_type text not null default '',
 description text not null default '', url text not null,
 published_at timestamptz, created_at timestamptz not null default now(),
 unique(source, source_id)
);
create table if not exists public.matches (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 job_id uuid not null references public.jobs(id) on delete cascade,
 score int not null check(score between 0 and 100), reasoning text not null default '',
 created_at timestamptz not null default now(), unique(user_id, job_id), unique(id, user_id)
);
create table if not exists public.applications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 job_id uuid not null references public.jobs(id) on delete cascade,
 match_id uuid, status text not null default 'pending_review'
 check(status in ('pending_review','approved','submitted','viewed','interview','rejected','withdrawn')),
 tailored_resume text, cover_letter text, submitted_at timestamptz,
 created_at timestamptz not null default now(), unique(user_id,job_id), unique(id,user_id),
 foreign key (match_id,user_id) references public.matches(id,user_id)
);
create table if not exists public.application_events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 application_id uuid not null, kind text not null, detail jsonb not null default '{}',
 created_at timestamptz not null default now(),
 foreign key (application_id,user_id) references public.applications(id,user_id) on delete cascade
);
create table if not exists public.notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null, title text not null, body text not null, read_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists matches_user_score_idx on public.matches(user_id,score desc);
create index if not exists applications_user_status_idx on public.applications(user_id,status);
create index if not exists events_user_created_idx on public.application_events(user_id,created_at desc);
create index if not exists notifications_user_read_idx on public.notifications(user_id,read_at,created_at desc);
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.matches enable row level security;
alter table public.applications enable row level security;
alter table public.application_events enable row level security;
alter table public.notifications enable row level security;
-- Jobs are a shared read-only cache. Only authenticated users can read.
create policy "jobs read" on public.jobs for select to authenticated using (true);
create policy "profiles own" on public.profiles for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "matches own" on public.matches for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "applications read own" on public.applications for select to authenticated using (auth.uid() = user_id);
-- All status writes pass through server route to validate transitions and log events.
create policy "events read own" on public.application_events for select to authenticated using (auth.uid() = user_id);
create policy "notifications read own" on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "notifications update own" on public.notifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Protect server-managed notification content against user changes.
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
 values ('resumes','resumes',false,5242880,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
 on conflict (id) do nothing;
create policy "resume own read" on storage.objects for select to authenticated using (bucket_id='resumes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "resume own insert" on storage.objects for insert to authenticated with check (bucket_id='resumes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "resume own update" on storage.objects for update to authenticated using (bucket_id='resumes' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id='resumes' and (storage.foldername(name))[1] = auth.uid()::text);
-- Database functions own the writes that must stay atomic and gated.
create or replace function public.create_draft(p_job_id uuid, p_match_id uuid, p_resume text, p_letter text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_score int;
begin
 if auth.uid() is null then raise exception 'Unauthorized'; end if;
 select score into v_score from public.matches where id=p_match_id and user_id=auth.uid() and job_id=p_job_id;
 if v_score is null or v_score < 70 then raise exception 'Match below threshold'; end if;
 insert into public.applications(user_id,job_id,match_id,tailored_resume,cover_letter)
 values(auth.uid(),p_job_id,p_match_id,p_resume,p_letter)
 on conflict(user_id,job_id) do nothing returning id into v_id;
 if v_id is not null then
  insert into public.application_events(user_id,application_id,kind) values(auth.uid(),v_id,'drafted');
 end if;
 return v_id;
end $$;
create or replace function public.transition_application(p_id uuid, p_status text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_old text;
begin
 if auth.uid() is null then raise exception 'Unauthorized'; end if;
 select status into v_old from public.applications where id=p_id and user_id=auth.uid() for update;
 if v_old is null then raise exception 'Application not found'; end if;
 if not ((v_old='pending_review' and p_status in ('approved','rejected'))
    or (v_old='approved' and p_status in ('submitted','withdrawn'))
    or (v_old='submitted' and p_status in ('viewed','interview','rejected','withdrawn'))
    or (v_old='viewed' and p_status in ('interview','rejected','withdrawn'))
    or (v_old='interview' and p_status in ('rejected','withdrawn'))) then
  raise exception 'Invalid status transition';
 end if;
 update public.applications set status=p_status,
 submitted_at=case when p_status='submitted' then now() else submitted_at end where id=p_id;
 insert into public.application_events(user_id,application_id,kind,detail)
 values(auth.uid(),p_id,p_status,jsonb_build_object('from',v_old));
 return true;
end $$;
create or replace function public.notify_review(p_count int)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null or p_count < 1 then raise exception 'Invalid request'; end if;
 insert into public.notifications(user_id,kind,title,body)
 values(auth.uid(),'review_ready','Applications ready for review',p_count::text || ' new application drafts are ready for your review.');
end $$;
revoke all on function public.create_draft(uuid,uuid,text,text) from public;
revoke all on function public.transition_application(uuid,text) from public;
revoke all on function public.notify_review(int) from public;
grant execute on function public.create_draft(uuid,uuid,text,text) to authenticated;
grant execute on function public.transition_application(uuid,text) to authenticated;
grant execute on function public.notify_review(int) to authenticated;
-- Apply once to an existing Phase 1/2 database. New installations can use schema.sql.
create table if not exists public.match_runs (
 user_id uuid primary key references auth.users(id) on delete cascade,
 token uuid not null default gen_random_uuid(),
 lease_until timestamptz not null
);
alter table public.match_runs enable row level security;

create table if not exists public.gemini_quota (
 id int primary key check (id=1), next_at timestamptz not null
);
alter table public.gemini_quota enable row level security;
insert into public.gemini_quota(id,next_at) values(1,now()) on conflict(id) do nothing;

create or replace function public.begin_match_run()
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_token uuid;
begin
 if auth.uid() is null then raise exception 'Unauthorized'; end if;
 insert into public.match_runs(user_id,token,lease_until)
 values(auth.uid(),gen_random_uuid(),clock_timestamp()+interval '120 seconds')
 on conflict(user_id) do update set token=excluded.token,lease_until=excluded.lease_until
 where public.match_runs.lease_until < clock_timestamp()
 returning token into v_token;
 return v_token;
end $$;

create or replace function public.end_match_run(p_token uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Unauthorized'; end if;
 delete from public.match_runs where user_id=auth.uid() and token=p_token;
end $$;

create or replace function public.reserve_gemini_slot()
returns int language plpgsql security definer set search_path = '' as $$
declare v_next timestamptz; v_slot timestamptz;
begin
 if auth.uid() is null then raise exception 'Unauthorized'; end if;
 select next_at into v_next from public.gemini_quota where id=1 for update;
 v_slot:=greatest(v_next,clock_timestamp());
 if v_slot > clock_timestamp()+interval '90 seconds' then raise exception 'Gemini queue is full'; end if;
 update public.gemini_quota set next_at=v_slot+interval '4.4 seconds' where id=1;
 return greatest(0,ceil(extract(epoch from (v_slot-clock_timestamp()))*1000)::int);
end $$;

create or replace function public.update_application_draft(p_id uuid,p_resume text,p_letter text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_old text;
begin
 if auth.uid() is null then raise exception 'Unauthorized'; end if;
 if length(p_resume)>20000 or length(p_letter)>10000 or length(trim(p_letter))=0 then raise exception 'Invalid draft'; end if;
 select status into v_old from public.applications where id=p_id and user_id=auth.uid() for update;
 if v_old is null then raise exception 'Application not found'; end if;
 if v_old not in ('pending_review','approved') then raise exception 'Draft cannot be edited after submission'; end if;
 update public.applications set tailored_resume=p_resume,cover_letter=p_letter,status='pending_review' where id=p_id;
 insert into public.application_events(user_id,application_id,kind,detail)
 values(auth.uid(),p_id,'draft_updated',jsonb_build_object('previous_status',v_old));
 return true;
end $$;

revoke all on function public.begin_match_run() from public;
revoke all on function public.end_match_run(uuid) from public;
revoke all on function public.reserve_gemini_slot() from public;
revoke all on function public.update_application_draft(uuid,text,text) from public;
grant execute on function public.begin_match_run() to authenticated;
grant execute on function public.end_match_run(uuid) to authenticated;
grant execute on function public.reserve_gemini_slot() to authenticated;
grant execute on function public.update_application_draft(uuid,text,text) to authenticated;

-- Draft and notification are committed together, so a route timeout cannot lose the alert.
create or replace function public.create_draft(p_job_id uuid, p_match_id uuid, p_resume text, p_letter text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_score int; v_company text; v_title text;
begin
 if auth.uid() is null then raise exception 'Unauthorized'; end if;
 select score into v_score from public.matches where id=p_match_id and user_id=auth.uid() and job_id=p_job_id;
 if v_score is null or v_score < 70 then raise exception 'Match below threshold'; end if;
 select company,title into v_company,v_title from public.jobs where id=p_job_id;
 insert into public.applications(user_id,job_id,match_id,tailored_resume,cover_letter)
 values(auth.uid(),p_job_id,p_match_id,p_resume,p_letter)
 on conflict(user_id,job_id) do nothing returning id into v_id;
 if v_id is not null then
  insert into public.application_events(user_id,application_id,kind) values(auth.uid(),v_id,'drafted');
  insert into public.notifications(user_id,kind,title,body)
  values(auth.uid(),'review_ready','Application ready for review',coalesce(v_title,'Job') || ' at ' || coalesce(v_company,'company') || ' is ready for your review.');
 end if;
 return v_id;
end $$;
revoke all on function public.create_draft(uuid,uuid,text,text) from public;
grant execute on function public.create_draft(uuid,uuid,text,text) to authenticated;
drop function if exists public.notify_review(int);
-- Apply after Phase 3 on an existing database. New installs use schema.sql.
create policy "resume own delete" on storage.objects for delete to authenticated
 using (bucket_id='resumes' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.purge_workspace()
returns void language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Unauthorized'; end if;
 delete from public.applications where user_id=auth.uid();
 delete from public.matches where user_id=auth.uid();
 delete from public.notifications where user_id=auth.uid();
 delete from public.match_runs where user_id=auth.uid();
 delete from public.profiles where user_id=auth.uid();
end $$;
revoke all on function public.purge_workspace() from public;
grant execute on function public.purge_workspace() to authenticated;
