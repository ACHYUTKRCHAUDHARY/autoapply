'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {createClient} from '@/lib/supabase/client';
import {MAX_RESUME_BYTES} from '@/lib/resume';

export default function ResumeUpload({currentPath}:{currentPath?:string|null}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[consent,setConsent]=useState(false);const router=useRouter();
 async function upload(file:File){
  setBusy(true);setMessage('');
  const extension=file.name.toLowerCase().endsWith('.pdf')?'pdf':file.name.toLowerCase().endsWith('.docx')?'docx':null;
  if(!extension||file.size<1||file.size>MAX_RESUME_BYTES){setMessage('Choose a PDF or DOCX under 5 MB.');setBusy(false);return}
  const supabase=createClient();let path:string|undefined;
  try{
   const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user)throw new Error('Sign in again before uploading.');
   path=`${user.id}/${crypto.randomUUID()}.${extension}`;
   const contentType=extension==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
   const {error:uploadError}=await supabase.storage.from('resumes').upload(path,file,{contentType,upsert:false});
   if(uploadError)throw new Error('Private storage upload failed. Try again.');
   const response=await fetch('/api/resume/extract',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({path})});
   const result=await response.json();if(!response.ok)throw new Error(result.error||'Resume extraction failed');
   path=undefined;
   const parsed=await fetch('/api/resume/parse',{method:'POST'});const detail=await parsed.json();
   setMessage(parsed.ok?'Resume saved and profile details extracted.':`Resume saved. ${detail.error||'Add your details manually.'}`);
   router.refresh();
  }catch(error){if(path)await supabase.storage.from('resumes').remove([path]);setMessage(error instanceof Error?error.message:'Upload failed. Try again.')}
  finally{setBusy(false)}
 }
 async function download(){if(!currentPath)return;setBusy(true);setMessage('');try{const {data,error}=await createClient().storage.from('resumes').download(currentPath);if(error||!data)throw new Error('Could not download your resume.');const url=URL.createObjectURL(data);const link=document.createElement('a');link.href=url;link.download=currentPath.split('/').pop()||'resume';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(error){setMessage(error instanceof Error?error.message:'Download failed')}finally{setBusy(false)}}
 return <div className="space-y-3"><label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" className="mt-1 accent-signal" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>I understand AutoApply will send my resume text to Gemini to extract profile details and prepare matches. I will review AI drafts before using them.</span></label><input aria-label="Upload resume" className="field" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" disabled={busy||!consent} onChange={e=>{const file=e.target.files?.[0];if(file)upload(file);e.target.value=''}}/><div className="flex flex-wrap items-center gap-4"><p className="text-xs text-ink/55">PDF or DOCX · 5 MB max · private storage</p>{currentPath&&<button type="button" className="text-sm text-signal underline" disabled={busy} onClick={download}>Download my resume</button>}</div>{busy&&<p role="status" className="text-sm">Processing your resume…</p>}{message&&<p role="status" className="text-sm">{message}</p>}</div>;
}
