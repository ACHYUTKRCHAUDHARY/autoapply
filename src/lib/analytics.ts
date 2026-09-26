import type {Application,Job} from './types';
export type AnalyticsRow=Pick<Application,'id'|'status'|'submitted_at'|'match_id'> & {jobs?:Pick<Job,'location'|'job_type'>|null;matches?:{score:number}|null};
export function analytics(rows:AnalyticsRow[],interviewIds:Set<string>,responseIds:Set<string>=interviewIds){
 const submitted=rows.filter(x=>!!x.submitted_at || ['submitted','viewed','interview'].includes(x.status));
 const bucket=(score:number)=>score>=90?'90–100':score>=80?'80–89':'70–79';
 const summaries=(key:(row:AnalyticsRow)=>string)=>{const counts=new Map<string,{total:number;responses:number;interviews:number}>();for(const row of submitted){const name=key(row)||'Unspecified';const item=counts.get(name)||{total:0,responses:0,interviews:0};item.total++;if(['viewed','interview'].includes(row.status)||responseIds.has(row.id)||interviewIds.has(row.id))item.responses++;if(interviewIds.has(row.id)||row.status==='interview')item.interviews++;counts.set(name,item)}return [...counts].map(([name,values])=>({name,...values,rate:Math.round(100*values.responses/values.total),interviewRate:Math.round(100*values.interviews/values.total)})).sort((a,b)=>b.total-a.total)};
 return {total:submitted.length,score:summaries(row=>row.matches?.score==null?'Unknown':bucket(row.matches.score)),jobType:summaries(row=>row.jobs?.job_type||'Unspecified'),location:summaries(row=>row.jobs?.location||'Unspecified')};
}
