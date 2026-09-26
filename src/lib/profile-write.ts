import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Profile} from './types';
type Editable=Partial<Pick<Profile,'full_name'|'headline'|'preferences'|'resume_path'|'resume_text'|'skills'>>;

export async function saveProfilePatch(supabase:SupabaseClient,userId:string,patch:Editable){
 const update=await supabase.from('profiles').update(patch).eq('user_id',userId).select('user_id').maybeSingle();
 if(update.error)return update.error;
 if(update.data)return null;
 const insert=await supabase.from('profiles').insert({user_id:userId,...patch});
 if(!insert.error)return null;
 // A concurrent upload/profile save may have created the row after our first update.
 if(insert.error.code==='23505'){
  const retry=await supabase.from('profiles').update(patch).eq('user_id',userId);
  return retry.error;
 }
 return insert.error;
}
