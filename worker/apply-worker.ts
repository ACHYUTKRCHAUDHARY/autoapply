import express from 'express';
import { chromium, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
const app=express();app.use(express.json({limit:'10kb'}));
type Candidate={name:string;email:string;resume:{name:string;mimeType:string;buffer:Buffer}};
type Handler=(page:Page,candidate:Candidate)=>Promise<void>;
export const domainHandlers:Record<string,Handler>={
  'boards.greenhouse.io':async(page,candidate)=>{
    // Verify these selectors against a live posting before using. Greenhouse boards can be customized.
    // Respect the portal's terms and any anti-bot restrictions; stop if automation is disallowed.
    await page.locator('input[name="job_application[first_name]"]').fill(candidate.name.split(' ')[0]||candidate.name);
    await page.locator('input[name="job_application[last_name]"]').fill(candidate.name.split(' ').slice(1).join(' ')||'-');
    await page.locator('input[name="job_application[email]"]').fill(candidate.email);
    await page.locator('input[type="file"][name="job_application[resume]"]').setInputFiles(candidate.resume);
    // Intentionally no submit click: this short-lived proof of concept closes the browser after filling.
  }
};
app.get('/health',(_req,res)=>res.json({ok:true}));
app.post('/preview-application',async(req,res)=>{
  if(!process.env.WORKER_TOKEN || req.headers.authorization!==`Bearer ${process.env.WORKER_TOKEN}`){res.status(401).json({error:'Unauthorized'});return}
  const id=req.body?.applicationId;
  if(typeof id!=='string'||! /^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(id)){res.status(400).json({error:'Invalid application id'});return}
  if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY){res.status(503).json({error:'Worker not configured'});return}
  const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
  const {data:application}=await db.from('applications').select('status,user_id,jobs(url)').eq('id',id).maybeSingle();
  if(!application || application.status!=='approved'){res.status(409).json({error:'User approval required'});return}
  const {data:profile}=await db.from('profiles').select('full_name,resume_path').eq('user_id',application.user_id).single();
  const {data:auth}=await db.auth.admin.getUserById(application.user_id);
  const url=(application.jobs as unknown as {url?:string})?.url;
  if(!url||!profile?.resume_path||!auth.user?.email){res.status(422).json({error:'Missing profile, resume or job URL'});return}
  let parsed:URL;try{parsed=new URL(url)}catch{res.status(400).json({error:'Invalid URL'});return}
  if(parsed.protocol!=='https:'||parsed.hostname!=='boards.greenhouse.io'){res.status(400).json({error:'Unsupported portal'});return}
  const {data:blob,error}=await db.storage.from('resumes').download(profile.resume_path);
  if(error||!blob){res.status(422).json({error:'Resume unavailable'});return}
  const browser=await chromium.launch({headless:true});
  try{const context=await browser.newContext({acceptDownloads:false});const page=await context.newPage();await page.goto(url,{waitUntil:'domcontentloaded',timeout:20000});
    if(new URL(page.url()).hostname!=='boards.greenhouse.io')throw new Error('Unexpected portal redirect');
    // Remote resume bytes stay in memory. Supported documents use Playwright file payload.
    const buffer=Buffer.from(await blob.arrayBuffer());
    await domainHandlers[parsed.hostname](page,{name:profile.full_name||'',email:auth.user.email,resume:{name:profile.resume_path.split('/').pop()||'resume.pdf',mimeType:profile.resume_path.endsWith('.docx')?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'application/pdf',buffer}});
    res.json({filled:true,submitted:false,note:'Preview only. No form was submitted.'});
  }catch{res.status(422).json({error:'Portal form changed; verify selectors on a live posting'})}finally{await browser.close()}
});
app.listen(Number(process.env.PORT||3001),()=>console.log('AutoApply worker listening'));
