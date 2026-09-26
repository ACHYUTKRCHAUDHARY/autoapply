export function isAllowedMutation(headers:Headers,requestOrigin:string){
 const fetchSite=headers.get('sec-fetch-site');
 if(fetchSite==='cross-site')return false;
 const origin=headers.get('origin');
 if(!origin)return true;
 try{return new URL(origin).origin===requestOrigin}catch{return false}
}
