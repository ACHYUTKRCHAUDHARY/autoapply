import { session, unauthorized, badRequest, failed } from '@/lib/http';
import { matchJobToProfile, tailorResume, generateCoverLetter } from '@/lib/gemini';
import {needsWork,type ExistingMatch} from '@/lib/matching';
import type { Job,Profile } from '@/lib/types';
export const maxDuration=60;

export async function POST() {
 const {supabase,user}=await session(); if(!user)return unauthorized();
 const {data:profile}=await supabase.from('profiles').select('*').eq('user_id',user.id).single();
 if(!profile?.resume_text)return badRequest('Upload your resume before matching');
 const {data:token,error:lockError}=await supabase.rpc('begin_match_run');
 if(lockError)return failed('Matching setup unavailable. Apply the Phase 3 SQL migration.');
 if(!token)return Response.json({error:'Matching is already running. Try again shortly.'},{status:409});
 let scored=0,drafted=0;
 try{
  const candidates:{job:Job;match?:ExistingMatch}[]=[];
  // Page through the cache. A fixed latest-30 window stranded older jobs.
  for(let offset=0;candidates.length<3;offset+=50){
   const {data:jobs,error}=await supabase.from('jobs').select('*').order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+49);
   if(error)throw new Error('Job read failed');
   if(!jobs?.length)break;
   const ids=jobs.map(x=>x.id);
   const [matches,applications]=await Promise.all([
    supabase.from('matches').select('id,job_id,score').eq('user_id',user.id).in('job_id',ids),
    supabase.from('applications').select('job_id').eq('user_id',user.id).in('job_id',ids)
   ]);
   if(matches.error||applications.error)throw new Error('Progress read failed');
   const existing=new Map<string,ExistingMatch>((matches.data||[]).map(x=>[x.job_id,x]));
   const draftedJobs=new Set((applications.data||[]).map(x=>x.job_id));
   for(const job of jobs){if(needsWork(job.id,existing,draftedJobs))candidates.push({job:job as Job,match:existing.get(job.id)});if(candidates.length===3)break}
   if(jobs.length<50)break;
  }
  for(const {job,match:previous} of candidates){
   let match=previous;
   if(!match){
    const result=await matchJobToProfile(profile as Profile,job);
    const saved=await supabase.from('matches').upsert({user_id:user.id,job_id:job.id,...result},{onConflict:'user_id,job_id'}).select('id,job_id,score').single();
    if(saved.error||!saved.data)throw new Error('Match save failed');
    match=saved.data;scored++;
   }
   if(match.score>=70){
    const [resume,letter]=await Promise.all([tailorResume(profile as Profile,job),generateCoverLetter(profile as Profile,job)]);
    const {data:id,error}=await supabase.rpc('create_draft',{p_job_id:job.id,p_match_id:match.id,p_resume:resume,p_letter:letter});
    if(error)throw new Error('Draft save failed');
    if(id)drafted++;
   }
  }
  return Response.json({scored,drafted});
 }catch{return failed(`Matching paused after ${scored} jobs. Retry to continue.`)}
 finally{await supabase.rpc('end_match_run',{p_token:token})}
}
