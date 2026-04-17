import { SignInForm } from "./SignInForm";

export const metadata = { title: "Sign in — Enveloped" };

export default function SignInPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div
        className="paper rounded-[var(--radius-lg)] p-8 w-full max-w-md"
        style={{ boxShadow: "0 18px 40px var(--color-shadow)" }}
      >
        <h1 className="font-display text-3xl" style={{ color: "var(--color-ink)" }}>
          Welcome back
        </h1>
        <p className="mt-1 text-sm font-hand" style={{ color: "var(--color-muted)" }}>
          We&rsquo;ll email you a magic link — no passwords.
        </p>
        <SignInForm />
      </div>
    </main>
  );
}
