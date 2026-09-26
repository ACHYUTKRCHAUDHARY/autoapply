'use client';
import Link from 'next/link';import {usePathname} from 'next/navigation';
const links=[['/dashboard','Dashboard'],['/jobs','Matches'],['/applications','Applications'],['/analytics','Analytics'],['/notifications','Updates'],['/profile','Profile']];
export default function NavLinks(){const pathname=usePathname();return <>{links.map(([href,label])=><Link key={href} href={href} aria-current={pathname===href?'page':undefined} className={`block py-2 transition-colors hover:text-signal md:py-0 ${pathname===href?'font-semibold text-signal':'text-ink/70'}`}>{label}</Link>)}<form action="/auth/signout" method="post"><button className="py-2 text-left text-ink/60 hover:text-warn md:py-0">Sign out</button></form></>}
