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
