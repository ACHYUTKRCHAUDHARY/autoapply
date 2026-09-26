import { createClient } from '@/lib/supabase/server';
export async function session() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : user };
}
export const unauthorized = () => Response.json({ error: 'Sign in required' }, { status: 401 });
export const badRequest = (message: string) => Response.json({ error: message }, { status: 400 });
export const failed = (message = 'Could not complete request') => Response.json({ error: message }, { status: 500 });
