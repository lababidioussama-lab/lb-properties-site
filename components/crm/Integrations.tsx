"use client";

import { useEffect, useState } from "react";
import { Copy, Check, PlugZap, CircleCheck, CircleDashed, Send } from "lucide-react";
import { api, stamp, BTN_GHOST, Card } from "./shared";

interface PortalStatus { portal: string; label: string; configured: boolean; received30: number; duplicates30: number; last: string | null }

const ENV: Record<string, string> = { bayut: "BAYUT_WEBHOOK_SECRET", dubizzle: "DUBIZZLE_WEBHOOK_SECRET", property_finder: "PROPERTY_FINDER_WEBHOOK_SECRET" };

function CopyText({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button onClick={async () => { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }} className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-[var(--hairline-strong)] bg-white text-[var(--text-muted)] hover:text-[var(--accent)]" aria-label="Copy">
      {done ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

/** Admin: connect Bayut, Dubizzle and Property Finder so their leads arrive assigned to agents. */
export function IntegrationsView({ onLeadsChanged }: { onLeadsChanged: () => void }) {
  const [rows, setRows] = useState<PortalStatus[] | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const load = () => void api<{ portals: PortalStatus[] }>("GET", "integrations").then((r) => setRows(r.portals ?? []));
  useEffect(load, []);

  async function test(portal: string) {
    setNote((n) => ({ ...n, [portal]: "Sending…" }));
    const r = await api<{ id: string; assigned_to: string | null }>("POST", "integration_test", { portal });
    setNote((n) => ({ ...n, [portal]: r.ok ? "Test lead created — it is now on the Leads board." : `Failed: ${r.error}` }));
    if (r.ok) { onLeadsChanged(); load(); }
  }

  return (
    <div className="space-y-5">
      <Card className="flex items-start gap-4 p-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--accent-wash)] text-[var(--accent)]"><PlugZap size={18} /></span>
        <div className="text-[13.5px] leading-[1.7] text-[var(--text-secondary)]">
          <p className="font-semibold text-[var(--text-primary)]">How portal leads arrive</p>
          <p>
            Each enquiry becomes a lead on the Leads board, marked with its portal. If the enquiry is for one of our listings (its reference matches the
            listing&apos;s ref code), it goes to that listing&apos;s agent. Otherwise it goes to the active agent with the fewest open leads. Each agent sees
            only their own leads. If the same phone number enquires again within 30 days, the note is added to the existing lead instead of creating a duplicate.
          </p>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        {(rows ?? []).map((p) => {
          const url = `${origin}/api/leads/portal/${p.portal}?token=YOUR_SECRET`;
          return (
            <Card key={p.portal} className="flex flex-col">
              <div className="flex items-center gap-3 border-b border-[var(--hairline)] px-5 py-4">
                <h3 className="text-[16px] font-semibold">{p.label}</h3>
                <span className={`ms-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${p.configured ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600"}`}>
                  {p.configured ? <CircleCheck size={13} /> : <CircleDashed size={13} />} {p.configured ? "Ready" : "Not connected"}
                </span>
              </div>
              <div className="flex-1 space-y-4 p-5 text-[13px]">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div><div className="figure text-[22px] font-semibold text-[var(--accent)]">{p.received30}</div><div className="text-[11px] text-[var(--text-muted)]">Leads (30d)</div></div>
                  <div><div className="figure text-[22px] font-semibold text-[var(--accent)]">{p.duplicates30}</div><div className="text-[11px] text-[var(--text-muted)]">Repeat enquiries</div></div>
                  <div><div className="text-[12.5px] font-medium">{p.last ? stamp(p.last) : "—"}</div><div className="text-[11px] text-[var(--text-muted)]">Last received</div></div>
                </div>
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold text-[var(--text-secondary)]">Webhook address to give {p.label}</div>
                  <div className="flex items-center gap-2">
                    <code className="figure min-w-0 flex-1 truncate rounded-md border border-[var(--hairline)] bg-[var(--surface-sunken)] px-2.5 py-1.5 text-[11.5px]">{url}</code>
                    <CopyText text={url} />
                  </div>
                  <p className="mt-2 text-[11.5px] leading-[1.6] text-[var(--text-muted)]">
                    {p.configured
                      ? <>Replace YOUR_SECRET with the value of <code className="figure">{ENV[p.portal]}</code> (or <code className="figure">PORTAL_WEBHOOK_SECRET</code>) set on the server.</>
                      : <>To connect: set <code className="figure">{ENV[p.portal]}</code> (a random string, 16+ characters) on the server, redeploy, then give {p.label} this address with that secret.</>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 border-t border-[var(--hairline)] px-5 py-3">
                <button onClick={() => test(p.portal)} className={BTN_GHOST}><Send size={14} /> Send test lead</button>
                {note[p.portal] && <span className="text-[12px] text-[var(--text-muted)]">{note[p.portal]}</span>}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
