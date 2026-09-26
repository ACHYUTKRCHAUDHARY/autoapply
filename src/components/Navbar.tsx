import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import NavLinks from './NavLinks';

export default async function Navbar(){
 const {data:{user}}=await createClient().auth.getUser();
 return <header className="site-header border-b border-line bg-paper/95">
  <nav aria-label="Main navigation" className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-5 py-5 md:px-10">
   <Link href={user?'/dashboard':'/'} className="font-display text-2xl font-semibold tracking-tight">AutoApply<span className="text-signal">.</span></Link>
   {user?<><div className="hidden items-center gap-5 text-sm md:flex"><NavLinks/></div><details className="relative md:hidden"><summary className="button-plain cursor-pointer list-none">Menu</summary><div className="absolute right-0 top-11 z-30 w-52 rounded-card border border-line bg-white p-4 shadow-lg"><NavLinks/></div></details></>:<Link href="/login" className="button-plain">Sign in →</Link>}
  </nav>
 </header>;
}
