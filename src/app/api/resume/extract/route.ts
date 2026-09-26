import { session, unauthorized, badRequest, failed } from '@/lib/http';
import { resumeKind } from '@/lib/resume';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  const { supabase, user } = await session(); if (!user) return unauthorized();
  const form = await request.formData().catch(() => null);
  const file = form?.get('file'); if (!(file instanceof File)) return badRequest('Choose a PDF or DOCX file');
  if (!file.size || file.size > 5 * 1024 * 1024) return badRequest('File must be between 1 byte and 5 MB');
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const kind=resumeKind(file.name,file.type,file.size,buffer);
    if(!kind)return badRequest('Only valid PDF and DOCX files are accepted');
    const text = kind==='pdf' ? (await (await import('pdf-parse')).default(buffer)).text : (await (await import('mammoth')).extractRawText({buffer})).value;
    if (!text.trim()) return badRequest('No selectable text found in this resume');
    const path = `${user.id}/resume.${kind}`;
    const { error: uploadError } = await supabase.storage.from('resumes').upload(path,buffer,{contentType:kind==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',upsert:true});
    if (uploadError) return failed('Resume storage failed');
    const {data:previous}=await supabase.from('profiles').select('*').eq('user_id',user.id).maybeSingle();
    const { error } = await supabase.from('profiles').upsert({...previous,user_id:user.id,resume_path:path,resume_text:text.slice(0,100000)},{onConflict:'user_id'});
    if (error) return failed('Resume profile update failed');
    return Response.json({text:text.slice(0,100000)});
  } catch { return badRequest('Could not extract text from this file'); }
}
