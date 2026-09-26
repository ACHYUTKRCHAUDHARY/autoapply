import 'server-only';
import type { Job } from './types';
type Incoming = Omit<Job,'id'>;
export async function fetchAdzunaJobs(): Promise<Incoming[]> {
  if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) return [];
  const url = new URL('https://api.adzuna.com/v1/api/jobs/in/search/1');
  url.searchParams.set('app_id',process.env.ADZUNA_APP_ID); url.searchParams.set('app_key',process.env.ADZUNA_APP_KEY);
  url.searchParams.set('results_per_page','30'); url.searchParams.set('what','software developer');
  const response = await fetch(url,{signal:AbortSignal.timeout(12000),cache:'no-store'});
  if (!response.ok) throw new Error(`Adzuna HTTP ${response.status}`);
  const body = await response.json();
  return (body.results || []).map((x: any) => ({ source:'adzuna',source_id:String(x.id),title:String(x.title||''),company:String(x.company?.display_name||''),location:String(x.location?.display_name||''),job_type:String(x.contract_time||''),description:String(x.description||''),url:String(x.redirect_url||''),published_at:x.created||null })).filter((x:Incoming)=>x.source_id && x.title && /^https?:\/\//.test(x.url));
}
export async function fetchJSearchJobs(): Promise<Incoming[]> {
  if (!process.env.RAPIDAPI_KEY) return [];
  const url = new URL('https://jsearch.p.rapidapi.com/search'); url.searchParams.set('query','software developer in India'); url.searchParams.set('num_pages','1');
  const response = await fetch(url,{headers:{'x-rapidapi-key':process.env.RAPIDAPI_KEY,'x-rapidapi-host':'jsearch.p.rapidapi.com'},signal:AbortSignal.timeout(12000),cache:'no-store'});
  if (!response.ok) throw new Error(`JSearch HTTP ${response.status}`);
  const body = await response.json();
  return (body.data || []).map((x:any)=>({source:'jsearch',source_id:String(x.job_id||''),title:String(x.job_title||''),company:String(x.employer_name||''),location:[x.job_city,x.job_country].filter(Boolean).join(', '),job_type:String(x.job_employment_type||''),description:String(x.job_description||''),url:String(x.job_apply_link||''),published_at:x.job_posted_at_datetime_utc||null})).filter((x:Incoming)=>x.source_id && x.title && /^https?:\/\//.test(x.url));
}
