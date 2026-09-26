import { session, unauthorized, badRequest, failed } from '@/lib/http';
import { parseResume } from '@/lib/gemini';
export async function POST() {
  const {supabase,user}=await session(); if(!user) return unauthorized();
  const {data:profile}=await supabase.from('profiles').select('resume_text').eq('user_id',user.id).single();
  if(!profile?.resume_text) return badRequest('Upload a resume first');
  try { const parsed=await parseResume(profile.resume_text); const {error}=await supabase.from('profiles').update(parsed).eq('user_id',user.id); if(error) return failed(); return Response.json(parsed); }
  catch { return failed('Resume parsing unavailable; try again later'); }
}
