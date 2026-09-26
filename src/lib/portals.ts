/** Human-directed job links. This module never requests a third-party website. */
export function parseJobLink(input: unknown): string | null {
 if(typeof input!=='string' || input.length>2048 || !input.trim()) return null;
 try {
  const url=new URL(input.trim());
  const host=url.hostname.toLowerCase();
  if(url.protocol!=='https:' || url.username || url.password || !host ||
     host==='localhost' || host.endsWith('.localhost') || /^[\d.]+$/.test(host) ||
     host.startsWith('[')) return null;
  url.hash='';
  return url.href;
 } catch { return null; }
}
const hosted=(host:string,domain:string)=>host===domain||host.endsWith('.'+domain);
export function portalName(link:string):string {
 try{
  const host=new URL(link).hostname.toLowerCase();
  if(hosted(host,'myworkmyday.com'))return 'MyWorkMyDay';
  if(hosted(host,'level.ph'))return 'Level';
  if(hosted(host,'naukri.com'))return 'Naukri';
  if(hosted(host,'indeed.com')||hosted(host,'indeed.co.in'))return 'Indeed';
  if(hosted(host,'oracle.com'))return 'Oracle Careers';
  if(hosted(host,'oraclecloud.com'))return 'Oracle Recruiting';
  if(hosted(host,'linkedin.com'))return 'LinkedIn';
  if(hosted(host,'internshala.com'))return 'Internshala';
  return 'Employer site';
 }catch{return 'Employer site'}
}
