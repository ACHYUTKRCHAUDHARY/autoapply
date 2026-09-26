import { session, unauthorized, badRequest, failed } from '@/lib/http';
import { matchJobToProfile, tailorResume, generateCoverLetter } from '@/lib/gemini';
import type { Job,Profile } from '@/lib/types';
export const maxDuration=60;
export async function POST() {
 const {supabase,user}=await session(); if(!user) return unauthorized();
 const {data:profile}=await supabase.from('profiles').select('*').eq('user_id',user.id).single();
 if(!profile?.resume_text) return badRequest('Upload your resume before matching');
 const {data:jobs,error}=await supabase.from('jobs').select('*').order('created_at',{ascending:false}).limit(30);
 if(error) return failed();
 if(!jobs?.length)return Response.json({scored:0,drafted:0});
 const ids=jobs.map(x=>x.id);
 const [matches,applications]=await Promise.all([supabase.from('matches').select('id,job_id,score').eq('user_id',user.id).in('job_id',ids),supabase.from('applications').select('job_id').eq('user_id',user.id).in('job_id',ids)]);
 if(matches.error||applications.error)return failed();
 const byJob=new Map((matches.data||[]).map(x=>[x.job_id,x]));const draftedJobs=new Set((applications.data||[]).map(x=>x.job_id));let scored=0,drafted=0;
 try {
  for(const job of jobs.filter(x=>!byJob.has(x.id)||(byJob.get(x.id)!.score>=70&&!draftedJobs.has(x.id))).slice(0,3) as Job[]) {
   let match=byJob.get(job.id);
   if(!match){const result=await matchJobToProfile(profile as Profile,job);const saved=await supabase.from('matches').upsert({user_id:user.id,job_id:job.id,...result},{onConflict:'user_id,job_id'}).select('id,job_id,score').single();if(saved.error||!saved.data)throw new Error('Match save failed');match=saved.data;scored++}
   if(match.score>=70&&!draftedJobs.has(job.id)) {
    const [resume,letter]=await Promise.all([tailorResume(profile as Profile,job),generateCoverLetter(profile as Profile,job)]);
    const {data:id,error:draftError}=await supabase.rpc('create_draft',{p_job_id:job.id,p_match_id:match.id,p_resume:resume,p_letter:letter});
    if(draftError) throw new Error('Draft save failed'); if(id) drafted++;
   }
  }
  if(drafted) await supabase.rpc('notify_review',{p_count:drafted});
  return Response.json({scored,drafted});
 } catch { return failed(`Matching paused after ${scored} jobs. Retry to continue.`); }
}
