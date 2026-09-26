import { createServiceClient } from '@/lib/supabase/server';
import { fetchAdzunaJobs, fetchJSearchJobs } from '@/lib/jobSources';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request:Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return Response.json({error:'Unauthorized'},{status:401});
  const results=await Promise.allSettled([fetchAdzunaJobs(),fetchJSearchJobs()]);
  const jobs=results.flatMap(x=>x.status==='fulfilled'?x.value:[]);
  if(!jobs.length && results.some(x=>x.status==='rejected')) return Response.json({error:'Job sources unavailable'},{status:502});
  if(jobs.length) { const {error}=await createServiceClient().from('jobs').upsert(jobs,{onConflict:'source,source_id'}); if(error) return Response.json({error:'Job cache update failed'},{status:500}); }
  return Response.json({cached:jobs.length,sourceErrors:results.filter(x=>x.status==='rejected').length});
}
