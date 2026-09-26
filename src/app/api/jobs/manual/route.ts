import {session, unauthorized, badRequest, failed} from '@/lib/http';
import {parseJobLink} from '@/lib/portals';
export async function POST(request:Request){
 const {supabase,user}=await session();if(!user)return unauthorized();
 const body=await request.json().catch(()=>null);
 const url=parseJobLink(body?.url);
 const title=body?.title,company=body?.company,description=body?.description;
 const location=body?.location??'',jobType=body?.job_type??'';
 if(!url || typeof title!=='string'||!title.trim()||title.length>200 ||
    typeof company!=='string'||!company.trim()||company.length>200 ||
    typeof description!=='string'||description.trim().length<20||description.length>12000 ||
    typeof location!=='string'||location.length>200 ||
    typeof jobType!=='string'||jobType.length>100) return badRequest('Add a valid HTTPS job link, company, title and at least 20 characters of job description.');
 const {data,error}=await supabase.rpc('create_private_job',{
  p_url:url,p_title:title,p_company:company,p_description:description,
  p_location:location,p_job_type:jobType
 });
 if(error){
  if(error.message.includes('Saved job limit reached'))return Response.json({error:'You can save up to 100 links. Delete workspace data to remove saved links.'},{status:409});
  return failed('Could not save job link. Apply the portal import SQL migration.');
 }
 return Response.json({id:data},{headers:{'Cache-Control':'no-store'}});
}
