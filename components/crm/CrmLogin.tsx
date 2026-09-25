"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";

const MESSAGES: Record<string, string> = {
  rate_limited: "Too many attempts. Wait fifteen minutes.",
  not_configured: "The CRM is not configured on the server yet.",
  otp_not_configured: "Email codes are not set up on the server yet (RESEND_API_KEY).",
  email_failed: "Your password is right, but we could not email your code. Ask the admin: the sending domain may not be verified in Resend yet.",
  code_wrong: "That code is not right.",
  code_locked: "Too many wrong codes. Sign in again to get a new one.",
  code_expired: "That code has expired. Sign in again.",
  wait: "Wait 30 seconds before asking for another code.",
  invalid_credentials: "Email or password is not right.",
  account_disabled: "Your account is switched off. Ask the admin to turn it on (Team page).",
  invalid: "Enter your email and password.",
  bad_origin: "Blocked as a cross-site request. Open the CRM from its own address.",
};

export function CrmLogin({ configured }: { configured: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"password" | "otp">("password");
  const [hint, setHint] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/crm/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return (await res.json()) as { ok: boolean; error?: string; step?: string; hint?: string };
    } catch {
      return { ok: false, error: "network" };
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const r = step === "password" ? await call({ email, password }) : await call({ code });
    if (r.ok && r.step === "otp") {
      setStep("otp");
      setHint(r.hint ?? "");
      setCode("");
      return;
    }
    if (r.ok) return window.location.reload();
    if (r.error === "code_locked" || r.error === "code_expired") { setStep("password"); setPassword(""); }
    setError(r.error === "network" ? "Could not reach the server." : MESSAGES[r.error ?? ""] ?? `Could not sign in (${r.error ?? "unknown error"}).`);
  }

  async function resend() {
    const r = await call({ resend: true });
    if (r.ok) setNote(`A new code is on its way to ${r.hint}.`);
    else setError(MESSAGES[r.error ?? ""] ?? "Could not send a new code.");
  }

  return (
    <main className="grid min-h-screen bg-[var(--surface)] lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-[#0b1a2b] lg:block">
        <Image src="/brand/reception.jpg" alt="" fill priority sizes="55vw" className="object-cover opacity-55" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(11_26_43/0.55),rgb(11_26_43/0.2)_40%,rgb(11_26_43/0.92))]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <Image src="/logo-icon-white.png" alt="" width={40} height={40} priority />
            <div className="leading-none">
              <div className="font-[family-name:var(--font-wordmark)] text-[19px] tracking-[0.16em]">LABABIDI</div>
              <div className="mt-1.5 text-[9.5px] font-semibold uppercase tracking-[0.34em] text-[#d4b87f]">Properties</div>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d4b87f]">Private workspace</p>
            <h2 className="mt-4 max-w-[16ch] font-[family-name:var(--font-display)] text-[46px] font-medium leading-[1.05]">
              Every lead, listing and deal, <em className="text-[#e3cc9f]">in one place</em>.
            </h2>
            <p className="mt-5 max-w-[46ch] text-[14px] leading-[1.8] text-white/70">
              For the Lababidi Properties team only. Access is logged; sessions expire after ten hours.
            </p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[380px]">
          <div className="flex items-center gap-3 lg:hidden">
            <Image src="/logo-icon.png" alt="" width={38} height={38} priority />
            <div className="leading-none">
              <div className="font-[family-name:var(--font-wordmark)] text-[17px] tracking-[0.16em] text-[var(--text-primary)]">LABABIDI</div>
              <div className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.34em] text-[var(--gold)]">Properties CRM</div>
            </div>
          </div>
          <h1 className="mt-10 font-[family-name:var(--font-display)] text-[38px] font-semibold leading-none text-[var(--text-primary)] lg:mt-0">
            {step === "password" ? "Sign in" : "Check your email"}
          </h1>
          <p className="mt-3 text-[13.5px] text-[var(--text-muted)]">{step === "password" ? "Use the email and password your admin gave you. We will then email you a security code." : "Enter the security code from your email."}</p>

          {!configured ? (
            <p className="mt-8 rounded-xl border border-[var(--hairline)] bg-white p-5 text-[13px] leading-[1.8] text-[var(--text-secondary)]">
              Set <code className="figure">ADMIN_EMAIL</code>, <code className="figure">ADMIN_PASSWORD</code> (12+
              characters) and the Supabase keys on the server, then restart.
            </p>
          ) : (
            <form onSubmit={submit} className="mt-8 space-y-5">
              {step === "password" ? (
                <>
                  <Field label="Email">
                    <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
                  </Field>
                  <Field label="Password">
                    <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT} />
                  </Field>
                </>
              ) : (
                <>
                  <div className="rounded-xl border border-[var(--hairline)] bg-white p-4 text-[13px] leading-[1.6] text-[var(--text-secondary)]">
                    We emailed a 6-digit code to <span className="font-semibold text-[var(--text-primary)]">{hint}</span>. It expires in 10 minutes.
                  </div>
                  <Field label="Security code">
                    <input
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      autoFocus
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="••••••"
                      className={`${INPUT} figure text-center !text-[22px] tracking-[0.5em]`}
                    />
                  </Field>
                </>
              )}
              {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[12.5px] text-[#c0392b]">{error}</p>}
              {note && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-700">{note}</p>}
              <button
                type="submit"
                disabled={busy || (step === "password" ? !email || !password : code.length !== 6)}
                className="h-11 w-full rounded-lg bg-[var(--accent-solid)] text-[14px] font-semibold text-white shadow-[0_1px_2px_rgb(11_42_74/0.3)] transition hover:bg-[var(--accent-solid-hover)] disabled:opacity-50"
              >
                {busy ? "Checking…" : step === "password" ? "Continue" : "Verify and sign in"}
              </button>
              {step === "otp" && (
                <div className="flex items-center justify-between text-[12.5px]">
                  <button type="button" onClick={resend} disabled={busy} className="font-medium text-[var(--accent)] hover:underline">Resend code</button>
                  <button type="button" onClick={() => { setStep("password"); setError(null); setNote(null); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">Use a different account</button>
                </div>
              )}
            </form>
          )}
          <p className="mt-10 text-[11.5px] text-[var(--text-muted)]">© Lababidi Properties · DET licence 1652937</p>
        </div>
      </section>
    </main>
  );
}

export const INPUT =
  "h-11 w-full rounded-lg border border-[var(--hairline-strong)] bg-white px-3.5 text-[14px] text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[rgb(11_42_74/0.12)]";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold text-[var(--text-secondary)]">{label}</span>
      {children}
    </label>
  );
}
