import './globals.css';
import { Fraunces, Inter } from 'next/font/google';
import Navbar from '@/components/Navbar';
const fraunces=Fraunces({subsets:['latin'],variable:'--font-fraunces',display:'swap'});
const inter=Inter({subsets:['latin'],variable:'--font-inter',display:'swap'});
export const metadata={title:'AutoApply · Your job search dossier',description:'Discover opportunities, draft applications and review every action.'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body className={`${fraunces.variable} ${inter.variable}`}><a href="#main-content" className="skip-link">Skip to content</a><Navbar/><main id="main-content" className="mx-auto min-h-[70vh] max-w-6xl px-5 py-12 md:px-10">{children}</main><footer className="rule-dotted mx-auto flex max-w-6xl flex-wrap justify-between gap-3 px-5 py-7 text-xs text-ink/60 md:px-10"><span>AutoApply · Every application stays under your control.</span><span>Discover · Draft · Decide</span></footer></body></html>}
