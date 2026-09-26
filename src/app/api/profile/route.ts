import { session, unauthorized, badRequest, failed } from '@/lib/http';
import {saveProfilePatch} from '@/lib/profile-write';
export async function PATCH(request:Request) {
 const {supabase,user}=await session(); if(!user) return unauthorized();
 const body=await request.json().catch(()=>null);
 if(!body || typeof body.full_name!=='string' || typeof body.headline!=='string' || typeof body.preferences?.keywords!=='string' || typeof body.preferences?.location!=='string' || typeof body.preferences?.job_type!=='string') return badRequest('Invalid profile');
 const values={user_id:user.id,full_name:body.full_name.slice(0,200),headline:body.headline.slice(0,300),preferences:{keywords:body.preferences.keywords.slice(0,200),location:body.preferences.location.slice(0,200),job_type:body.preferences.job_type.slice(0,100)}};
 const error=await saveProfilePatch(supabase,user.id,values);if(error)return failed('Profile save failed');
 return Response.json({ok:true});
}
