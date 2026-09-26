import { session, unauthorized, badRequest, failed } from '@/lib/http';
import { resumeKind, resumePath, MAX_RESUME_BYTES } from '@/lib/resume';
import {saveProfilePatch} from '@/lib/profile-write';
export const runtime='nodejs';
export const maxDuration=60;

export async function POST(request:Request){
 const {supabase,user}=await session();if(!user)return unauthorized();
 const body=await request.json().catch(()=>null);
 const path=body?.path;
 if(!resumePath(user.id,path))return badRequest('Invalid resume path');
 const {data:file,error:downloadError}=await supabase.storage.from('resumes').download(path);
 if(downloadError||!file)return badRequest('Resume upload not found');
 if(file.size<1||file.size>MAX_RESUME_BYTES){await supabase.storage.from('resumes').remove([path]);return badRequest('Resume exceeds 5 MB');}
 try{
  const buffer=Buffer.from(await file.arrayBuffer());
  const kind=resumeKind(path,file.type,file.size,buffer);
  if(!kind)throw new Error('Invalid file');
  const text=kind==='pdf'?(await (await import('pdf-parse')).default(buffer)).text:(await (await import('mammoth')).extractRawText({buffer})).value;
  if(!text.trim())throw new Error('No selectable text');
  const {data:previous,error:profileReadError}=await supabase.from('profiles').select('resume_path').eq('user_id',user.id).maybeSingle();
  if(profileReadError)return failed('Could not read profile');
  const saveError=await saveProfilePatch(supabase,user.id,{resume_path:path,resume_text:text.slice(0,100000)});
  if(saveError)return failed('Could not save resume profile');
  if(previous?.resume_path&&previous.resume_path!==path)await supabase.storage.from('resumes').remove([previous.resume_path]);
  return Response.json({characters:Math.min(text.length,100000)});
 }catch{
  await supabase.storage.from('resumes').remove([path]);
  return badRequest('Could not read this PDF or DOCX. Upload a text-based resume.');
 }
}
