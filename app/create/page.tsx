import { requireUser } from "@/lib/auth";
import { CreateBundleForm } from "./CreateBundleForm";

export const metadata = { title: "New bundle — Enveloped" };

export default async function CreatePage() {
  await requireUser();
  return (
    <main className="app-screen flex-1 mx-auto max-w-2xl w-full px-6 pb-12">
      <h1 className="font-display text-4xl" style={{ color: "var(--color-ink)" }}>
        Start a new bundle
      </h1>
      <p className="mt-2 font-hand text-lg" style={{ color: "var(--color-muted)" }}>
        Give it a name only you two will get.
      </p>
      <CreateBundleForm />
    </main>
  );
}
