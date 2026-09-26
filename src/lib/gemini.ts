import 'server-only';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from './supabase/server';
import type { Job, Profile } from './types';

// One process-wide queue; distributed deployments also need a shared limiter for strict global quotas.
let tail: Promise<unknown> = Promise.resolve();
let nextSlot = 0;
export function runJSON<T>(prompt: string): Promise<T> {
  const task = tail.catch(() => undefined).then(async () => {
    if (!process.env.GEMINI_API_KEY) throw new Error('Gemini API key is missing');
    const slot = Math.max(Date.now(), nextSlot);
    nextSlot = slot + 4400; // ~13.6 requests/minute per process.
    const delay = slot - Date.now(); if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
    // Atomic reservation keeps separate Vercel instances within the shared quota.
    const {data:waitMs,error}=await createClient().rpc('reserve_gemini_slot');
    if(error || typeof waitMs!=='number') throw new Error('Gemini quota reservation unavailable');
    if(waitMs>0) await new Promise(resolve=>setTimeout(resolve,waitMs));
    const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { responseMimeType: 'application/json' } });
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text()) as T;
  });
  tail = task;
  return task;
}
const context = (profile: Profile, job: Job) => `Profile: ${JSON.stringify({ headline: profile.headline, skills: profile.skills, preferences:profile.preferences, resume: profile.resume_text?.slice(0,16000) })}\nJob: ${JSON.stringify({ title: job.title, company: job.company, location:job.location, job_type:job.job_type, description: job.description.slice(0,12000) })}\nDo not invent experience, achievements, credentials or contact details.`;
export async function parseResume(text: string) {
  const value = await runJSON<{ full_name: string; headline: string; skills: string[] }>(`Extract resume details as JSON {"full_name":"","headline":"","skills":[]}. ${text.slice(0,24000)}`);
  return { full_name: String(value.full_name || '').slice(0,200), headline: String(value.headline || '').slice(0,300), skills: Array.isArray(value.skills) ? value.skills.filter(x => typeof x === 'string').slice(0,50) : [] };
}
export async function matchJobToProfile(profile: Profile, job: Job) {
  const value = await runJSON<{ score: number; reasoning: string }>(`Score fit from 0 to 100, evidence-based. Return JSON {"score":0,"reasoning":""}. ${context(profile,job)}`);
  return { score: Math.max(0, Math.min(100, Number(value.score) || 0)), reasoning: String(value.reasoning || '').slice(0,2000) };
}
export async function tailorResume(profile: Profile, job: Job) {
  const value = await runJSON<{ text: string }>(`Rewrite resume summary and bullet suggestions accurately. JSON {"text":""}. ${context(profile,job)}`);
  return String(value.text || '').slice(0,20000);
}
export async function generateCoverLetter(profile: Profile, job: Job) {
  const value = await runJSON<{ text: string }>(`Write a concise truthful cover letter. JSON {"text":""}. ${context(profile,job)}`);
  return String(value.text || '').slice(0,10000);
}
export async function generateFollowUp(profile: Profile, job: Job) {
  const value = await runJSON<{ text: string }>(`Write a polite short follow-up after a submitted job application. JSON {"text":""}. ${context(profile,job)}`);
  return String(value.text || '').slice(0,5000);
}
export async function generateOutreachMessage(profile: Profile, job: Job) {
  const value = await runJSON<{ text: string }>(`Write a short warm recruiter outreach draft, without assuming a relationship. JSON {"text":""}. ${context(profile,job)}`);
  return String(value.text || '').slice(0,5000);
}
