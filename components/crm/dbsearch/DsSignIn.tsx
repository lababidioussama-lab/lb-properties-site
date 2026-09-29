"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";

import { ds } from "./api";

const MESSAGES: Record<string, string> = {
  invalid_credentials: "Email or password is not right. Use your CRM sign-in.",
  no_access: "Your account does not have DB Search access. Ask your admin to switch it on.",
  locked: "DB Search is locked on your account. Your admin can unlock it.",
  crm_session_required: "Use the email of the account you are signed in to the CRM with.",
  rate_limited: "Too many attempts. Wait fifteen minutes.",
  email_failed: "Your password is right, but the code email could not be sent. Try again.",
  code_wrong: "That code is not right. Check the latest email marked “DB Search sign-in”.",
  code_locked: "Too many wrong codes. Start again.",
  code_expired: "That code has expired. Start again.",
  wait: "Wait 30 seconds before asking for another code.",
  otp_not_configured: "Code emails are not set up on the server yet.",
  not_configured: "Sign-in is not configured on the server yet.",
  account_disabled: "Your account is switched off.",
};

const INPUT = "h-11 w-full rounded-lg border border-[var(--hairline-strong)] bg-white px-3.5 text-[14px] text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[rgb(11_42_74/0.12)]";

/**
 * The DB Search sign-in: the same email and password as the CRM, then a
 * code emailed as a "DB Search sign-in". Same look as the CRM login page.
 */
export function DsSignIn({ email: meEmail, onDone, expired = false }: { email: string; onDone: () => void; expired?: boolean }) {
  const demo = typeof window !== "undefined" && !!(window as { __CRM_DEMO__?: boolean }).__CRM_DEMO__;
  const [email, setEmail] = useState(meEmail);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"password" | "otp">("password");
  const [hint, setHint] = useState("");
  const [error, setError] = useState<string | null>(expired ? "Your DB Search session has ended. Sign in again." : null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(body: Record<string, unknown>) {
    setBusy(true); setError(null); setNote(null);
    try {
      if (demo) {
        await new Promise((r) => setTimeout(r, 350));
        if (body.code) { await ds("POST", "demo_signin"); return { ok: true }; }
        return { ok: true, step: "otp", hint: email.replace(/^(.).*(@.*)$/, "$1•••$2") };
      }
      const res = await fetch("/api/crm/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, purpose: "dbsearch" }) });
      return (await res.json()) as { ok: boolean; error?: string; step?: string; hint?: string };
    } catch {
      return { ok: false, error: "network" };
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const r = step === "password" ? await call({ email, password }) : await call({ code });
    if (r.ok && r.step === "otp") { setStep("otp"); setHint(r.hint ?? ""); setCode(""); return; }
    if (r.ok) return onDone();
    if (r.error === "code_locked" || r.error === "code_expired") { setStep("password"); setPassword(""); }
    setError(MESSAGES[r.error ?? ""] ?? `Could not sign in (${r.error ?? "unknown error"}).`);
  }

  async function resend() {
    const r = await call({ resend: true });
    if (r.ok) setNote(`A new code is on its way to ${r.hint}.`);
    else setError(MESSAGES[r.error ?? ""] ?? "Could not send a new code.");
  }

  return (
    <div className="grid min-h-[620px] overflow-hidden rounded-xl border border-[var(--hairline)] bg-[var(--surface)] shadow-[var(--shadow-card)] lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-[#0b1a2b] lg:block">
        <Image src="/brand/reception.jpg" alt="" fill sizes="45vw" className="object-cover opacity-55" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(11_26_43/0.55),rgb(11_26_43/0.2)_40%,rgb(11_26_43/0.94))]" />
        <div className="relative flex h-full flex-col justify-end p-10 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d4b87f]">DB Search · secure access</p>
          <h2 className="mt-4 max-w-[15ch] font-[family-name:var(--font-display)] text-[42px] font-medium leading-[1.05]">
            Owner data, <em className="text-[#e3cc9f]">behind its own key</em>.
          </h2>
          <p className="mt-4 max-w-[44ch] text-[13.5px] leading-[1.8] text-white/75">
            Your CRM email and password, then a code emailed as a “DB Search sign-in”. The session ends after two hours, or twenty minutes without activity.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--gold)]">{step === "password" ? "Step 1 of 2" : "Step 2 of 2"}</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[36px] font-semibold leading-none text-[var(--text-primary)]">
            {step === "password" ? "DB Search sign-in" : "Check your email"}
          </h1>
          <p className="mt-3 text-[13.5px] leading-relaxed text-[var(--text-muted)]">
            {step === "password"
              ? "Use the same email and password as the CRM. We will then email you a code marked “DB Search sign-in”."
              : "Enter the code from the email marked “DB Search sign-in”."}
          </p>

          <form onSubmit={submit} className="mt-7 space-y-5">
            {step === "password" ? (
              <>
                <label className="block"><span className="mb-1.5 block text-[12px] font-semibold text-[var(--text-secondary)]">Email</span>
                  <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} /></label>
                <label className="block"><span className="mb-1.5 block text-[12px] font-semibold text-[var(--text-secondary)]">Password</span>
                  <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT} autoFocus /></label>
              </>
            ) : (
              <>
                <div className="rounded-xl border border-[var(--hairline)] bg-white p-4 text-[13px] leading-[1.6] text-[var(--text-secondary)]">
                  We emailed a 6-digit code to <span className="font-semibold text-[var(--text-primary)]">{hint}</span>. It expires in 10 minutes.
                </div>
                <label className="block"><span className="mb-1.5 block text-[12px] font-semibold text-[var(--text-secondary)]">Security code</span>
                  <input inputMode="numeric" autoComplete="one-time-code" autoFocus value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••••"
                    className={`${INPUT} figure text-center !text-[22px] tracking-[0.5em]`} /></label>
              </>
            )}
            {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[12.5px] text-[#a3261e]">{error}</p>}
            {note && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-700">{note}</p>}
            <button type="submit" disabled={busy || (step === "password" ? !email || !password : code.length !== 6)}
              className="h-11 w-full rounded-lg bg-[var(--accent-solid)] text-[14px] font-semibold text-white transition hover:bg-[var(--accent-solid-hover)] disabled:opacity-50">
              {busy ? "Checking…" : step === "password" ? "Continue" : "Open DB Search"}
            </button>
            {step === "otp" && (
              <div className="flex items-center justify-between text-[12.5px]">
                <button type="button" onClick={resend} disabled={busy} className="font-medium text-[var(--accent)] hover:underline">Send a new code</button>
                <button type="button" onClick={() => { setStep("password"); setError(null); setNote(null); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">Start again</button>
              </div>
            )}
          </form>
          <p className="mt-8 flex gap-2 text-[12px] leading-relaxed text-[var(--text-muted)]">
            <ShieldCheck size={15} className="mt-0.5 shrink-0" /> Every search and every revealed number is recorded against your name.
          </p>
        </div>
      </section>
    </div>
  );
}
