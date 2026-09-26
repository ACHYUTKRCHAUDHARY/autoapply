import {session,unauthorized,badRequest} from '@/lib/http';
import {validateDraft} from '@/lib/drafts';
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 const {supabase,user}=await session();if(!user)return unauthorized();
 const body=await request.json().catch(()=>null);if(!validateDraft(body))return badRequest('A cover letter is required; drafts must stay within length limits.');
 const {error}=await supabase.rpc('update_application_draft',{p_id:(await params).id,p_resume:body.tailored_resume,p_letter:body.cover_letter});
 if(error)return Response.json({error:error.message.includes('Draft cannot be edited')?'Submitted drafts cannot be edited':'Could not save draft'},{status:error.message.includes('Draft cannot be edited')?409:400});
 return Response.json({status:'pending_review'});
}
