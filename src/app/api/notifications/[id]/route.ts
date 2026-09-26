import { session, unauthorized } from '@/lib/http';
export async function PATCH(_request:Request,{params}:{params:{id:string}}) {
 const {supabase,user}=await session(); if(!user) return unauthorized();
 const {data,error}=await supabase.from('notifications').update({read_at:new Date().toISOString()}).eq('id',params.id).eq('user_id',user.id).is('read_at',null).select('id').maybeSingle();
 if(error) return Response.json({error:'Could not mark read'},{status:500});
 return Response.json({read:!!data});
}
