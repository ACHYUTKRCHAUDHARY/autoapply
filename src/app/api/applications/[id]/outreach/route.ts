import { session, unauthorized, failed } from '@/lib/http';
import { generateOutreachMessage } from '@/lib/gemini';
export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}) {
 const {supabase,user}=await session(); if(!user) return unauthorized();
 const {data:application}=await supabase.from('applications').select('jobs(*)').eq('user_id',user.id).eq('id',(await params).id).single();
 if(!application) return Response.json({error:'Application not found'},{status:404});
 const {data:profile}=await supabase.from('profiles').select('*').eq('user_id',user.id).single();
 if(!profile || !application.jobs) return failed('Profile or job missing');
 try {const job=application.jobs as any; return Response.json({message:await generateOutreachMessage(profile,job),searchUrl:`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${job.company} recruiter OR hiring manager`)}`});} catch{return failed('Could not draft outreach');}
}
