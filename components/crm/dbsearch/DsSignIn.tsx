"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import { Lock, ShieldCheck } from "lucide-react";

import { ds } from "./api";
import { DS_GO, DS_INPUT } from "./ui";

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

const INPUT = DS_INPUT;
const LABEL = "ds-label mb-1.5 block";

/**
 * The DB Search sign-in: the same email and password as the CRM, then a
 * code emailed as a "DB Search sign-in". Drawn as dbsearchdubai.com draws its
 * sign-in card: one glass card in the middle, the logo on top, the gradient
 * button. The Lababidi logo is the only mark.
 */
export function DsSignIn({ email: meEmail, onDone, expired = false, theme, topBar }: {
  email: string;
  onDone: () => void;
  expired?: boolean;
  theme: "light" | "dark";
  /** DB Search's brand bar, with Back to CRM. */
  topBar?: ReactNode;
}) {
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
    <div className="relative z-10 flex min-h-[100dvh] flex-col px-4">
      {topBar}
      <div className="flex flex-1 items-center justify-center pb-16 pt-4">
        <div className="panel crm-title w-full max-w-[430px] px-7 py-8 !shadow-[var(--shadow-lift)] sm:px-8">
          <Image src={theme === "dark" ? "/logo-icon-white.png" : "/logo-icon.png"} alt="Lababidi Properties" width={52} height={52} priority />
          <h1 className="display mt-4 text-[30px]">DB <em className="text-[var(--accent)]">Search</em></h1>
          <p className="mt-1 text-[12.5px] text-[var(--text-muted)]">
            {step === "password" ? "Sign in with your CRM email and password." : <>We sent a 6-digit code to <span className="font-semibold text-[var(--text-primary)]">{hint}</span>. It expires in 10 minutes.</>}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-1 rounded-[12px] border border-[var(--hairline)] bg-[var(--input-bg)] p-1 text-center text-[12.5px] font-bold">
            <span className={`rounded-[9px] py-2 ${step === "password" ? "bg-[image:var(--grad)] text-white" : "text-[var(--text-muted)]"}`}>1. Password</span>
            <span className={`rounded-[9px] py-2 ${step === "otp" ? "bg-[image:var(--grad)] text-white" : "text-[var(--text-muted)]"}`}>2. Email code</span>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-4">
            {step === "password" ? (
              <>
                <label className="block"><span className={LABEL}>Email</span>
                  <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} /></label>
                <label className="block"><span className={LABEL}>Password</span>
                  <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT} autoFocus /></label>
              </>
            ) : (
              <label className="block"><span className={LABEL}>Security code</span>
                <input inputMode="numeric" autoComplete="one-time-code" autoFocus value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000"
                  className={`${INPUT} mono !h-14 text-center !text-[22px] tracking-[0.3em]`} /></label>
            )}
            {error && <p role="alert" className="rounded-[10px] border border-[var(--bad-bd)] bg-[var(--bad-bg)] px-3 py-2 text-[12.5px] text-[var(--bad)]">{error}</p>}
            {note && <p className="rounded-[10px] border border-[var(--ok-bd)] bg-[var(--ok-bg)] px-3 py-2 text-[12.5px] text-[var(--ok)]">{note}</p>}
            <button type="submit" disabled={busy || (step === "password" ? !email || !password : code.length !== 6)} className={DS_GO}>
              <Lock size={15} /> {busy ? "Checking\u2026" : step === "password" ? "Continue" : "Open DB Search"}
            </button>
            {step === "otp" && (
              <div className="flex items-center justify-between text-[12.5px]">
                <button type="button" onClick={resend} disabled={busy} className="font-semibold text-[var(--accent)] hover:underline">Send a new code</button>
                <button type="button" onClick={() => { setStep("password"); setError(null); setNote(null); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">Start again</button>
              </div>
            )}
          </form>

          <p className="mt-6 flex gap-2 border-t border-[var(--hairline)] pt-4 text-[11.5px] leading-relaxed text-[var(--text-muted)]">
            <ShieldCheck size={14} className="mt-0.5 shrink-0" />
            Sessions end after two hours, or twenty minutes without activity. Every search and revealed number is recorded against your name.
          </p>
        </div>
      </div>
    </div>
  );
}
