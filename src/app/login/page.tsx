import AuthForm from '@/components/AuthForm';
export default function Login({searchParams}:{searchParams:{next?:string}}){return <section><p className="eyebrow">Your workspace</p><h1 className="my-5 font-display text-5xl">Welcome back.</h1><p className="mb-8 text-ink/65">Sign in or create an account to build your job search dossier.</p><AuthForm next={searchParams.next||'/dashboard'}/></section>}
