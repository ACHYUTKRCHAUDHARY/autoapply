import {session,unauthorized,badRequest,failed} from '@/lib/http';
export async function DELETE(request:Request){
 const {supabase,user}=await session();if(!user)return unauthorized();
 const body=await request.json().catch(()=>null);if(body?.confirm!=='DELETE')return badRequest('Type DELETE to confirm');
 // Remove private files before database rows, so a storage error can be retried safely.
 async function removePrefix(prefix:string,depth:number):Promise<boolean>{
  if(depth>12)return false;
  for(let pass=0;pass<1000;pass++){
   const {data,error}=await supabase.storage.from('resumes').list(prefix,{limit:100,offset:0});
   if(error)return false;if(!data?.length)return true;
   const files=data.filter(x=>x.id).map(x=>`${prefix}/${x.name}`);
   const folders=data.filter(x=>!x.id).map(x=>`${prefix}/${x.name}`);
   for(const folder of folders)if(!await removePrefix(folder,depth+1))return false;
   if(files.length){const result=await supabase.storage.from('resumes').remove(files);if(result.error)return false;}
  }
  return false;
 }
 if(!await removePrefix(user.id,0))return failed('Could not remove private resumes');
 const {error}=await supabase.rpc('purge_workspace');if(error)return failed('Could not delete workspace data');
 return Response.json({deleted:true},{headers:{'Cache-Control':'no-store'}});
}
