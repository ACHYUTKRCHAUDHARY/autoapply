import { createClient } from '@/lib/supabase/server';
export async function POST(request:Request){await (await createClient()).auth.signOut();return Response.redirect(new URL('/',request.url),303)}
