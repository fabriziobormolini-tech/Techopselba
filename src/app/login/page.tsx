import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <Link href="/" className="text-2xl font-black text-brand-700">
        Wayrd<span className="text-brand-500">.</span>
      </Link>
      <h1 className="mt-8 text-2xl font-bold">Accedi</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        Reception hotel e amministratori Wayrd.
      </p>
      <LoginForm />
      <p className="mt-6 text-center text-xs text-slate-400">
        Credenziali demo nel seed: reception@demo-hotel.it / wayrd1234 ·
        admin@wayrd.app / wayrd-admin
      </p>
    </main>
  );
}
