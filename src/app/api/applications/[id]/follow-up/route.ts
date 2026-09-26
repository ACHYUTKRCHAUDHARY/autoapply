import { session, unauthorized, failed } from '@/lib/http';
import { generateFollowUp } from '@/lib/gemini';
export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}) {
 const {supabase,user}=await session(); if(!user) return unauthorized();
 const {data:application}=await supabase.from('applications').select('status,jobs(*)').eq('user_id',user.id).eq('id',(await params).id).single();
 if(!application || !['submitted','viewed'].includes(application.status)) return Response.json({error:'Only submitted or viewed applications support follow-up'},{status:409});
 const {data:profile}=await supabase.from('profiles').select('*').eq('user_id',user.id).single();
 if(!profile || !application.jobs) return failed('Profile or job missing');
 try {return Response.json({message:await generateFollowUp(profile,application.jobs as any)});} catch{return failed('Could not draft follow-up');}
}
