import { session, unauthorized, badRequest, failed } from '@/lib/http';
import type { ApplicationStatus } from '@/lib/types';
const allowed: ApplicationStatus[]=['approved','rejected','submitted','viewed','interview','withdrawn'];
export async function PATCH(request:Request,{params}:{params:{id:string}}) {
 const {supabase,user}=await session(); if(!user) return unauthorized();
 const body=await request.json().catch(()=>null); const status=body?.status;
 if(!allowed.includes(status)) return badRequest('Invalid status');
 const {error}=await supabase.rpc('transition_application',{p_id:params.id,p_status:status});
 if(error) return Response.json({error:error.message.includes('Invalid status transition')?'Invalid status transition':'Application update failed'},{status:error.message.includes('Invalid status transition')?409:400});
 return Response.json({status});
}
