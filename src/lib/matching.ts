export type ExistingMatch={id:string;job_id:string;score:number};
export function needsWork(jobId:string,existing:Map<string,ExistingMatch>,drafted:Set<string>){
 const match=existing.get(jobId);
 return !match || (match.score>=70&&!drafted.has(jobId));
}
