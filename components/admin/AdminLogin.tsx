"use client";

import { useState, type FormEvent } from "react";

export function AdminLogin({ configured }: { configured: boolean }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = (await response.json()) as { ok: boolean; error?: string };

      if (result.ok) {
        // Full reload rather than a router refresh: the cookie was set by the
        // response, and the page is a server component that must re-run with
        // it attached.
        window.location.reload();
        return;
      }
      setError(
        result.error === "rate_limited"
          ? "Too many attempts. Wait fifteen minutes."
          : "That password is not right.",
      );
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24">
        <h1 className="display-3 text-[var(--text-primary)]">Ledger not configured</h1>
        <p className="mt-4 text-[13.5px] leading-[1.8] text-[var(--text-secondary)]">
          Set <code className="figure">ADMIN_PASSWORD</code> in{" "}
          <code className="figure">.env.local</code> to at least 12 characters, then
          restart the dev server. Until then this page has no gate, so it refuses to
          render the ledger at all.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="display-3 text-[var(--text-primary)]">Commission ledger</h1>
      <p className="mt-3 text-[12.5px] text-[var(--text-muted)]">
        Private. Enquiries, referrals and what is owed.
      </p>

      <form onSubmit={handleSubmit} className="mt-8">
        <label className="block">
          <span className="eyebrow mb-2.5 block">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-[var(--hairline-strong)] bg-[var(--surface-raised)] px-4 py-3 text-[14px] text-[var(--text-primary)] outline-none transition-colors duration-300 focus:border-[var(--accent)]"
          />
        </label>

        {error && (
          <p role="alert" className="mt-3 text-[12px] text-[var(--accent)]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || password.length === 0}
          className="mt-5 w-full rounded-lg bg-[var(--accent-solid)] px-5 py-3 text-[13.5px] font-semibold text-white transition-colors duration-300 hover:bg-[var(--accent-solid-hover)] disabled:opacity-50"
        >
          {busy ? "Checking…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
