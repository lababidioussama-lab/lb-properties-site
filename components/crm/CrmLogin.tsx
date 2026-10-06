"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";
import { WELCOME_FLAG } from "./Greeting";
import { Ribbons } from "./Ribbons";

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
  account_disabled: "Your account is blocked. Ask the admin to allow it again.",
  invalid: "Enter your email and password.",
  bad_origin: "Blocked as a cross-site request. Open the CRM from its own address.",
  admin_only: "Company documents are for the admin account only.",
};

/* The same sign-in serves the CRM and Company documents; only the words
   change. Drawn as DB Search draws its sign-in: one glass card, the logo,
   the two steps, the gradient button. No photo. */
const COPY = {
  crm: {
    title: "Lababidi CRM",
    intro: "Sign in with the email and password your admin gave you. We then email you a security code.",
    done: "Verify and sign in",
  },
  documents: {
    title: "Company documents",
    intro: "Admin only. Sign in with the admin email and password; we then email you a code marked “Documents sign-in”.",
    done: "Open the documents",
  },
};

export function CrmLogin({ configured, purpose = "crm", crmSignedIn = false }: {
  configured: boolean;
  purpose?: "crm" | "documents";
  /** Documents only: the admin is already signed in to the CRM in this
   *  browser (with a code), so the password alone opens the documents. */
  crmSignedIn?: boolean;
}) {
  const copy = COPY[purpose];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"password" | "otp">("password");
  const [hint, setHint] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dark, setDark] = useState(true);
  useEffect(() => { setDark(document.documentElement.dataset.theme !== "light"); }, []);

  async function call(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/crm/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, purpose }),
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
    if (r.ok) {
      // Documents: back to the suite, keeping any #LP-H01 the link carried.
      if (purpose === "documents") return window.location.assign(`/documents${window.location.hash}`);
      try { sessionStorage.setItem(WELCOME_FLAG, "1"); } catch {}
      return window.location.reload();
    }
    if (r.error === "code_locked" || r.error === "code_expired") { setStep("password"); setPassword(""); }
    setError(r.error === "network" ? "Could not reach the server." : MESSAGES[r.error ?? ""] ?? `Could not sign in (${r.error ?? "unknown error"}).`);
  }

  async function resend() {
    const r = await call({ resend: true });
    if (r.ok) setNote(`A new code is on its way to ${r.hint}.`);
    else setError(MESSAGES[r.error ?? ""] ?? "Could not send a new code.");
  }

  const oneStep = purpose === "documents" && crmSignedIn;
  const stepCls = (on: boolean) => `rounded-[9px] py-2 ${on ? "bg-[image:var(--grad)] text-white" : "text-[var(--text-muted)]"}`;

  return (
    <main className="relative flex min-h-[100dvh] flex-col px-4">
      <Ribbons />
      {purpose === "documents" && (
        <div className="relative z-10 mx-auto flex w-full max-w-[1100px] justify-end pt-3">
          <a href="/admin" className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[12px] font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]">
            <ArrowLeft size={14} /> Back to CRM
          </a>
        </div>
      )}
      <div className="relative z-10 flex flex-1 items-center justify-center py-12">
        <div className="panel crm-title w-full max-w-[430px] px-7 py-8 !shadow-[var(--shadow-lift)] sm:px-8">
          <Image src={dark ? "/logo-icon-white.png" : "/logo-icon.png"} alt="Lababidi Properties" width={52} height={52} priority />
          <h1 className="display mt-4 text-[27px] text-[var(--text-primary)]">{step === "password" ? copy.title : "Check your email"}</h1>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
            {step === "otp"
              ? <>We emailed a 6-digit code to <span className="font-semibold text-[var(--text-primary)]">{hint}</span>. It expires in 10 minutes.</>
              : oneStep ? "You are signed in to the CRM, so your password alone opens the documents. No second code." : copy.intro}
          </p>

          {!configured ? (
            <p className="mt-6 rounded-[10px] border border-[var(--hairline)] bg-[var(--input-bg)] p-4 text-[13px] leading-[1.7] text-[var(--text-secondary)]">
              Set <code className="figure">ADMIN_EMAIL</code>, <code className="figure">ADMIN_PASSWORD</code> (12+
              characters) and the Supabase keys on the server, then restart.
            </p>
          ) : (
            <>
              {!oneStep && (
                <div className="mt-5 grid grid-cols-2 gap-1 rounded-[12px] border border-[var(--hairline)] bg-[var(--input-bg)] p-1 text-center text-[12.5px] font-bold">
                  <span className={stepCls(step === "password")}>1. Password</span>
                  <span className={stepCls(step === "otp")}>2. Email code</span>
                </div>
              )}
              <form onSubmit={submit} className="mt-5 space-y-4">
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
                  <Field label="Security code">
                    <input inputMode="numeric" autoComplete="one-time-code" autoFocus value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000"
                      className={`${INPUT} mono !h-14 text-center !text-[22px] tracking-[0.3em]`} />
                  </Field>
                )}
                {error && <p role="alert" className="rounded-[10px] border border-[var(--bad-bd)] bg-[var(--bad-bg)] px-3 py-2 text-[12.5px] text-[var(--bad)]">{error}</p>}
                {note && <p className="rounded-[10px] border border-[var(--ok-bd)] bg-[var(--ok-bg)] px-3 py-2 text-[12.5px] text-[var(--ok)]">{note}</p>}
                <button type="submit" disabled={busy || (step === "password" ? !email || !password : code.length !== 6)}
                  className="btn-go inline-flex h-12 w-full items-center justify-center gap-2 rounded-[9px] text-[14px] font-semibold disabled:opacity-60">
                  <Lock size={15} /> {busy ? "Checking…" : step === "password" ? (oneStep ? copy.done : "Continue") : copy.done}
                </button>
                {step === "otp" && (
                  <div className="flex items-center justify-between text-[12.5px]">
                    <button type="button" onClick={resend} disabled={busy} className="font-semibold text-[var(--accent)] hover:underline">Send a new code</button>
                    <button type="button" onClick={() => { setStep("password"); setError(null); setNote(null); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">Use a different account</button>
                  </div>
                )}
              </form>
            </>
          )}
          <p className="mt-6 flex gap-2 border-t border-[var(--hairline)] pt-4 text-[11.5px] leading-relaxed text-[var(--text-muted)]">
            <ShieldCheck size={14} className="mt-0.5 shrink-0" />
            {purpose === "documents" ? "Documents stay open for four hours. Every sign-in is recorded." : "Every sign-in is recorded. Sessions end after ten hours."}
          </p>
        </div>
      </div>
      <p className="relative z-10 pb-6 text-center text-[11px] text-[var(--text-muted)]">© Lababidi Properties · DET licence 1652937</p>
    </main>
  );
}

export const INPUT =
  "h-12 w-full rounded-[10px] border border-[var(--hairline)] bg-[var(--input-bg)] px-3.5 text-[15px] text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--accent-wash)]";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="ds-label mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
