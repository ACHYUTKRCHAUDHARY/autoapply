import Link from 'next/link';
import {redirect} from 'next/navigation';
import {session} from '@/lib/http';
import StatCard from '@/components/StatCard';
import ApplicationCard from '@/components/ApplicationCard';
import FindMatchesButton from '@/components/FindMatchesButton';
import OnboardingSteps from '@/components/OnboardingSteps';
import type {Application,Profile} from '@/lib/types';

export default async function Dashboard(){
 const {supabase,user}=await session();if(!user)redirect('/login');
 const [profileResult,pendingResult,pendingCount,matches,alerts,jobs,reviewed]=await Promise.all([
  supabase.from('profiles').select('*').eq('user_id',user.id).maybeSingle(),
  supabase.from('applications').select('*,jobs(*),matches(score)').eq('user_id',user.id).eq('status','pending_review').order('created_at',{ascending:false}).limit(5),
  supabase.from('applications').select('id',{count:'exact',head:true}).eq('user_id',user.id).eq('status','pending_review'),
  supabase.from('matches').select('id',{count:'exact',head:true}).eq('user_id',user.id),
  supabase.from('notifications').select('id',{count:'exact',head:true}).eq('user_id',user.id).is('read_at',null),
  supabase.from('jobs').select('created_at',{count:'exact'}).order('created_at',{ascending:false}).limit(1),
  supabase.from('applications').select('id',{count:'exact',head:true}).eq('user_id',user.id).neq('status','pending_review')
 ]);
 if([profileResult,pendingResult,pendingCount,matches,alerts,jobs,reviewed].some(result=>result.error))throw new Error('Dashboard data unavailable');
 const profile=profileResult.data as Profile|null;
 const hasResume=!!profile?.resume_text;
 const hasJobs=(jobs.count||0)>0;
 const reason=!hasResume?'Upload a resume first.':!hasJobs?'No jobs have been imported yet. The next daily sync will add openings.':undefined;
 const ready=[hasResume,!!profile?.preferences?.keywords,(matches.count||0)>0,(reviewed.count||0)>0];
 const firstName=(profile?.full_name||user.email||'there').split(/[ @]/)[0];
 return <div>
  <div className="grid items-end gap-7 border-b border-line pb-10 md:grid-cols-[1fr_auto]"><div><p className="eyebrow">Your search desk · {new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</p><h1 className="mt-3 font-display text-5xl leading-tight md:text-6xl">Good to see you, {firstName}.</h1><p className="mt-4 max-w-xl text-ink/65">A clear view of your opportunities, drafts and next decisions.</p></div><FindMatchesButton disabledReason={reason}/></div>
  <div className="mt-7 grid gap-x-8 md:grid-cols-3"><StatCard label="Matches explored" value={matches.count||0} detail="Evidence-based fit scores"/><StatCard label="Waiting for review" value={pendingCount.count||0} detail="Nothing submits without you"/><StatCard label="Unread updates" value={alerts.count||0} detail="Inside your workspace"/></div>
  {ready.every(Boolean)?null:<OnboardingSteps done={ready}/>}
  <section className="mt-12" aria-labelledby="review-heading"><div className="flex flex-wrap items-baseline justify-between gap-4"><div><p className="eyebrow">Action required</p><h2 id="review-heading" className="mt-2 font-display text-3xl">Drafts to review</h2></div><Link href="/applications" className="text-sm font-semibold text-signal">All applications →</Link></div>{pendingResult.data?.length?(pendingResult.data as Application[]).map(item=><ApplicationCard key={item.id} application={item}/>):<div className="rule-dotted mt-6 py-8"><p className="font-display text-xl">Your review queue is clear.</p><p className="mt-2 text-sm text-ink/60">{hasResume?'Find matches to prepare new drafts.':'Start by uploading a resume in your profile.'}</p></div>}</section>
  <p className="rule-dotted mt-8 py-5 text-xs text-ink/50">{hasJobs?`Jobs cached · last update ${new Date(jobs.data?.[0]?.created_at).toLocaleDateString('en-IN')}`:'No cached jobs yet'} · You decide when and where to apply.</p>
 </div>;
}
