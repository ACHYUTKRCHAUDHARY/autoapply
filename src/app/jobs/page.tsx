import Link from 'next/link';import {redirect} from 'next/navigation';
import {session} from '@/lib/http';import FindMatchesButton from '@/components/FindMatchesButton';
import type {MatchResult} from '@/lib/types';
type Filters={score?:string;location?:string;type?:string;page?:string};
const escapeLike=(value:string)=>value.replace(/[\\%_]/g,'\\$&');
export default async function JobsPage({searchParams}:{searchParams:Promise<Filters>}){
 const {supabase,user}=await session();if(!user)redirect('/login');
 const filters=await searchParams;
 const score=[0,50,70,85].includes(Number(filters.score))?Number(filters.score):0;
 const location=(filters.location||'').slice(0,80).trim();const type=(filters.type||'').slice(0,80).trim();
 const page=Math.min(1000,Math.max(1,Number.parseInt(filters.page||'1',10)||1));
 let query=supabase.from('matches').select('*,jobs!inner(*)',{count:'exact'}).eq('user_id',user.id).gte('score',score);
 if(location)query=query.ilike('jobs.location',`%${escapeLike(location)}%`);
 if(type)query=query.ilike('jobs.job_type',`%${escapeLike(type)}%`);
 const [result,profile,jobs]=await Promise.all([
  query.order('score',{ascending:false}).range((page-1)*20,page*20-1),
  supabase.from('profiles').select('resume_text').eq('user_id',user.id).maybeSingle(),
  supabase.from('jobs').select('id',{count:'exact',head:true})
 ]);
 if(result.error||profile.error||jobs.error)throw new Error('Matches unavailable');
 const reason=!profile.data?.resume_text?'Upload a resume first.':!jobs.count?'No cached jobs yet. The daily sync will add openings.':undefined;
 const matches=(result.data||[]) as MatchResult[];const count=result.count||0;
 const queryPage=(number:number)=>{const params=new URLSearchParams();if(score)params.set('score',String(score));if(location)params.set('location',location);if(type)params.set('type',type);params.set('page',String(number));return `/jobs?${params}`};
 return <div><p className="eyebrow">Opportunity index</p><div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-display text-5xl">Your matches.</h1><p className="mt-4 text-sm text-ink/60">Scores explain fit; you decide which openings are worth pursuing.</p></div><FindMatchesButton disabledReason={reason}/></div>
 <form action="/jobs" method="get" className="rule-dotted mt-9 grid gap-4 py-6 md:grid-cols-[9rem_1fr_1fr_auto] md:items-end"><label className="text-sm">Minimum score<select name="score" className="field mt-2" defaultValue={score}><option value="0">Any score</option><option value="50">50%+</option><option value="70">70%+</option><option value="85">85%+</option></select></label><label className="text-sm">Location<input name="location" className="field mt-2" maxLength={80} defaultValue={location} placeholder="e.g. Noida"/></label><label className="text-sm">Job type<input name="type" className="field mt-2" maxLength={80} defaultValue={type} placeholder="e.g. remote"/></label><button className="button" type="submit">Filter</button></form>
 <div className="flex items-center justify-between gap-4 py-5 text-sm text-ink/55"><span>{count} matching {count===1?'opening':'openings'}</span>{(score>0||location||type)&&<Link href="/jobs" className="text-signal underline">Clear filters</Link>}</div>
 {matches.length?matches.map(match=><article key={match.id} className="rule-dotted grid gap-4 py-6 md:grid-cols-[5rem_1fr_auto]"><p className="font-display text-4xl text-signal">{match.score}%</p><div><p className="eyebrow">{match.jobs?.company} · {match.jobs?.location}</p><h2 className="mt-2 font-display text-2xl">{match.jobs?.title}</h2><p className="mt-3 text-sm leading-6 text-ink/65">{match.reasoning}</p><p className="mt-2 text-xs text-ink/50">{match.jobs?.job_type||'Job type not specified'}</p></div>{match.jobs?.url&&<a className="button-plain h-fit" href={match.jobs.url} target="_blank" rel="noopener noreferrer">View posting ↗</a>}</article>):<div className="rule-dotted py-10"><h2 className="font-display text-2xl">No matches in this view.</h2><p className="mt-2 text-sm text-ink/60">{count===0&&score===0&&!location&&!type?'Add a resume and run matching to start.':'Try a wider score, location or job type.'}</p></div>}
 {count>20&&<nav aria-label="Matches pages" className="rule-dotted mt-6 flex items-center justify-between py-6 text-sm">{page>1?<Link href={queryPage(page-1)} className="text-signal">← Previous</Link>:<span/>}<span>Page {page} of {Math.ceil(count/20)}</span>{page*20<count?<Link href={queryPage(page+1)} className="text-signal">Next →</Link>:<span/>}</nav>}
 </div>;
}
