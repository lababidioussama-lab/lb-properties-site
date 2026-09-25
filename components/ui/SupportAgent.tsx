"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { MessageSquare, X, ArrowUp, Loader2 } from "lucide-react";
import { useSite } from "@/lib/context/site-context";
import { SITE } from "@/lib/site-config";
import { IconWhatsApp } from "./Icons";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

/**
 * Floating concierge assistant.
 *
 * It answers from the practice's own service and project data (see
 * lib/agent-knowledge.ts) and is deliberately narrow: it cannot quote a
 * price, a payment plan or a yield, because none of those are facts the
 * brochures establish. Its job is to answer the questions that would
 * otherwise go unanswered at 2am, and to hand anyone with real intent to a
 * human on WhatsApp — which is why the handoff sits permanently in the
 * footer of the panel rather than appearing only on failure.
 */
export function SupportAgent() {
  const { t, locale, rtl } = useSite();
  const reduceMotion = useReducedMotion();

  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    inputRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Pin to the newest message as the conversation grows.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, busy]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;

    const next = [...turns, { role: "user" as const, content: text }];
    setTurns(next);
    setDraft("");
    setBusy(true);
    setFailed(false);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, messages: next }),
      });
      const data = (await res.json()) as { ok?: boolean; reply?: string };
      if (!res.ok || !data.ok || !data.reply) throw new Error("chat failed");
      setTurns([...next, { role: "assistant", content: data.reply }]);
    } catch {
      // No fake apology turn in the transcript — a visible banner with the
      // WhatsApp route out is more useful than the assistant pretending.
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Launcher. Sits above the mobile dock rather than under it. */}
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t.agent.launcher}
        aria-expanded={open}
        initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        className="fixed bottom-24 end-5 z-[70] grid h-14 w-14 place-items-center rounded-full border border-[var(--glass-border)] bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-[var(--shadow-lift)] transition-transform duration-300 hover:scale-105 lg:bottom-6"
      >
        {open ? <X size={20} strokeWidth={1.6} /> : <MessageSquare size={20} strokeWidth={1.6} />}
        {!open && (
          <span className="absolute -end-0.5 -top-0.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-emerald-wa)] opacity-70" />
            <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-[var(--surface-raised)] bg-[var(--color-emerald-wa)]" />
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label={t.agent.title}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            style={{ transformOrigin: rtl ? "bottom left" : "bottom right" }}
            className="fixed bottom-40 end-5 z-[70] flex h-[min(30rem,65vh)] w-[calc(100vw-2.5rem)] max-w-[24rem] flex-col overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--surface-raised)] shadow-[var(--shadow-lift)] lg:bottom-24"
          >
            <header className="relative border-b border-[var(--hairline)] px-5 py-4">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[var(--accent-wash)] to-transparent"
              />
              <div className="relative">
                <h2 className="font-[family-name:var(--font-display)] text-[19px] leading-none text-[var(--text-primary)]">
                  {t.agent.title}
                </h2>
                <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-emerald-wa)]" />
                  {t.agent.subtitle}
                </p>
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {turns.length === 0 && (
                <>
                  <Bubble role="assistant">{t.agent.greeting}</Bubble>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {t.agent.prompts.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setDraft(p)}
                        className="rounded-full border border-[var(--hairline-strong)] px-3 py-1.5 text-[11.5px] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {turns.map((turn, i) => (
                <Bubble key={i} role={turn.role}>
                  {turn.content}
                </Bubble>
              ))}

              {busy && (
                <span className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
                  <Loader2 size={13} className="animate-spin" />
                  {t.agent.thinking}
                </span>
              )}

              {failed && (
                <p role="alert" className="text-[12px] leading-relaxed text-[var(--accent)]">
                  {t.agent.error}
                </p>
              )}
            </div>

            <form
              onSubmit={send}
              className="flex items-center gap-2 border-t border-[var(--hairline)] p-3"
            >
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t.agent.placeholder}
                maxLength={1500}
                className="min-w-0 flex-1 rounded-lg border border-[var(--hairline-strong)] bg-[var(--surface)] px-3.5 py-2.5 text-[13.5px] text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] duration-300 placeholder:text-[var(--text-muted)]/70 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-wash)]"
              />
              <button
                type="submit"
                disabled={!draft.trim() || busy}
                aria-label={t.agent.send}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--accent-solid)] text-white transition-opacity disabled:opacity-40"
              >
                <ArrowUp size={16} strokeWidth={2} />
              </button>
            </form>

            <a
              href={SITE.waLink(t.agent.waMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 border-t border-[var(--hairline)] py-2.5 text-[11.5px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              <IconWhatsApp size={13} />
              {t.agent.humanHandoff}
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Bubble({ role, children }: { role: Turn["role"]; children: React.ReactNode }) {
  const mine = role === "user";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <p
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-[1.65] ${
          mine
            ? "bg-[var(--accent-solid)] text-white"
            : "bg-[var(--surface-sunken)] text-[var(--text-secondary)]"
        }`}
      >
        {children}
      </p>
    </div>
  );
}
