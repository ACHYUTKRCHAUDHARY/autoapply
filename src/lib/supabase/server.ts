import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
export async function createClient() {
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return jar.getAll(); }, setAll(values: {name:string;value:string;options:CookieOptions}[]) { try { values.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch { /* server components cannot write; middleware refreshes */ } } }
  });
}
/** Only server-side cron/worker code may call this. Never pass it to a component. */
export function createServiceClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing service role key');
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
