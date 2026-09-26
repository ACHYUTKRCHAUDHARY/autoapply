import Link from 'next/link';
export default function NotFound(){return <div className="py-20"><p className="eyebrow">Page not found</p><h1 className="mt-3 font-display text-5xl">This page has moved on.</h1><p className="mt-5 text-ink/60">Return to your workspace and pick up where you left off.</p><Link href="/dashboard" className="button mt-7">Go to dashboard</Link></div>}
