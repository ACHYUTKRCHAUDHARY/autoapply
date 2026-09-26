'use client';
import {useState, type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {portalName} from '@/lib/portals';
export default function AddJobForm(){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[jobUrl,setJobUrl]=useState('');
 const router=useRouter();
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;setBusy(true);setMessage('');
  const form=event.currentTarget;
  const data=Object.fromEntries(new FormData(form).entries());
  try{
   const response=await fetch('/api/jobs/manual',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||'Could not save link');
   setMessage(`Saved from ${portalName(jobUrl)}. Select Find matches to score it; you will submit on the portal yourself.`);
   form.reset();setJobUrl('');router.refresh();
  }catch(error){setMessage(error instanceof Error?error.message:'Network error. Try again.')}
  finally{setBusy(false)}
 }
 return <section className="rule-dotted mt-9 py-7" aria-labelledby="save-job-heading">
  <h2 id="save-job-heading" className="font-display text-2xl">Found a role elsewhere?</h2>
  <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/60">Save a posting from MyWorkMyDay, Level, Naukri, Indeed, Oracle, LinkedIn, Internshala or an employer site. Paste its details yourself. Your link stays private; AutoApply prepares a draft for your review.</p>
  <form onSubmit={save} className="mt-5 grid gap-4 md:grid-cols-2">
   <label className="text-sm md:col-span-2">Job posting link<input className="field mt-2" type="url" name="url" required maxLength={2048} placeholder="https://…" value={jobUrl} onChange={event=>setJobUrl(event.target.value)}/></label>
   <label className="text-sm">Role title<input className="field mt-2" name="title" required maxLength={200}/></label>
   <label className="text-sm">Company<input className="field mt-2" name="company" required maxLength={200}/></label>
   <label className="text-sm">Location<input className="field mt-2" name="location" maxLength={200}/></label>
   <label className="text-sm">Job type<input className="field mt-2" name="job_type" maxLength={100}/></label>
   <label className="text-sm md:col-span-2">Job description<textarea className="field mt-2 min-h-36" name="description" required minLength={20} maxLength={12000} placeholder="Paste the responsibilities and required skills from the posting."/></label>
   <div className="md:col-span-2"><button className="button" disabled={busy} type="submit">{busy?'Saving…':'Save job link'}</button></div>
  </form>{message&&<p role="status" className="mt-3 text-sm">{message}</p>}
 </section>;
}
