"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";

export function CrmLogin({ configured }: { configured: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = (await res.json()) as { ok: boolean; error?: string };
      if (result.ok) return window.location.reload();
      setError(
        result.error === "rate_limited"
          ? "Too many attempts. Wait fifteen minutes."
          : result.error === "not_configured"
            ? "The CRM is not configured on the server yet."
            : "Email or password is not right.",
      );
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--hairline)] bg-[var(--surface-raised)] p-8 shadow-[var(--shadow-lift)]">
        <Image src="/logo-icon-white.png" alt="" width={44} height={44} priority />
        <h1 className="mt-5 font-[family-name:var(--font-display)] text-[30px] text-[var(--text-primary)]">
          Lababidi CRM
        </h1>
        <p className="mt-1.5 text-[12.5px] text-[var(--text-muted)]">Team sign in</p>

        {!configured ? (
          <p className="mt-6 text-[13px] leading-[1.8] text-[var(--text-secondary)]">
            Set <code className="figure">ADMIN_EMAIL</code>, <code className="figure">ADMIN_PASSWORD</code> (12+
            characters) and the Supabase keys in <code className="figure">.env.local</code>, then restart.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-4">
            <Field label="Email">
              <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
            </Field>
            <Field label="Password">
              <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT} />
            </Field>
            {error && <p role="alert" className="text-[12px] text-[#e0645f]">{error}</p>}
            <button
              type="submit"
              disabled={busy || !email || !password}
              className="w-full rounded-lg bg-[var(--accent-solid)] px-5 py-3 text-[13.5px] font-semibold text-white transition-colors hover:bg-[var(--accent-solid-hover)] disabled:opacity-50"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export const INPUT =
  "w-full rounded-lg border border-[var(--hairline-strong)] bg-[var(--surface)] px-3.5 py-2.5 text-[13.5px] text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent)]";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</span>
      {children}
    </label>
  );
}
