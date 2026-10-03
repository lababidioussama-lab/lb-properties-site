"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, Download, Lock, LogOut, RefreshCw, ShieldCheck, Unlock } from "lucide-react";

import { api, BTN_GHOST, BTN_ICON, Card, CardHead, Chip, Empty, INPUT, Segmented, downloadCsv, stamp } from "./shared";

/**
 * Access & activity (admin): full control of every person from the CRM, with
 * no DB Search sign-in needed. For each person: block or allow the CRM
 * account (which also ends DB Search: it signs in with the same account),
 * block or allow DB Search, lock or unlock it, sign them out of DB Search
 * now, and set their daily limits. Their use today and this week, and one
 * activity feed of sign-ins and DB Search actions with filters and CSV.
 */
interface DsSettings { access: boolean; searches: number; reveals: number; lists: number; lockedAt: string | null; lockReason: string | null; kickedAt: string | null }
interface Usage { searches: number; reveals: number; lists: number }
interface Person {
  id: string; full_name: string; email: string; role: "admin" | "agent"; active: boolean;
  ds: DsSettings; today: Usage; week: Usage; lastSeen: string | null; lastLogin: string | null;
}
interface Row { id: number; at: string; user_id: string | null; source: string; action: string; query: string | null; target: string | null; reason: string | null; ip: string | null; device: string | null; email: string | null }

const ACTION_LABEL: Record<string, string> = {
  login: "Signed in to the CRM", logout: "Signed out of the CRM", login_failed: "Failed CRM sign-in", otp_sent: "Sign-in code sent", otp_failed: "Wrong sign-in code",
  docs_login: "Opened Company documents", ds_login: "DB Search code accepted",
  signin: "Signed in to DB Search", signout: "Left DB Search", search: "Searched", open: "Opened a record", reveal: "Revealed a number",
  unit: "Unit history", portfolio: "Portfolio", area: "Area filter", market: "Market", check: "Property check", brokers: "Agent search",
  to_lead: "Created a lead", to_contact: "Added a contact", to_temp: "Sent to Temp leads", denied: "Refused (no access)", locked: "Locked automatically", admin: "Settings changed by admin",
};
const REASON_LABEL: Record<string, string> = { owner_outreach: "owner outreach", buyer_followup: "buyer follow-up", listing_check: "checking a listing", buyer_match: "buyer match" };
const KINDS = [
  { id: "all", label: "Everything" }, { id: "searches", label: "Searches" }, { id: "reveals", label: "Numbers" },
  { id: "signins", label: "Sign-ins" }, { id: "locks", label: "Locks" },
] as const;
const PERIODS = [{ id: "1", label: "Today" }, { id: "7", label: "7 days" }, { id: "30", label: "30 days" }] as const;

const ago = (iso: string | null) => {
  if (!iso) return "never";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
};

function Meter({ used, limit, label, admin }: { used: number; limit: number; label: string; admin: boolean }) {
  const pct = admin || !limit ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const tone = pct >= 100 ? "var(--bad)" : pct >= 80 ? "var(--warn)" : "var(--accent)";
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-[11.5px] text-[var(--text-muted)]">
        <span>{label}</span>
        <span className="figure"><b className="text-[var(--text-primary)]">{used}</b>{admin ? "" : `/${limit}`}</span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--hairline)]">
        {!admin && <div className="h-full rounded-full transition-[width]" style={{ width: `${pct}%`, background: tone }} />}
      </div>
    </div>
  );
}

export function AccessControl({ meId }: { meId: string }) {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [kind, setKind] = useState<(typeof KINDS)[number]["id"]>("all");
  const [days, setDays] = useState<(typeof PERIODS)[number]["id"]>("1");
  const [who, setWho] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPeople = useCallback(async () => {
    const r = await api<{ people: Person[] }>("GET", "control", undefined, "view=people");
    if (r.ok) setPeople(r.people ?? []);
    else setError(r.error ?? "load_failed");
  }, []);
  const loadRows = useCallback(async () => {
    setRows(null);
    const qs = new URLSearchParams({ view: "activity", days, ...(kind !== "all" ? { kind } : {}), ...(who ? { user: who } : {}) });
    const r = await api<{ rows: Row[] }>("GET", "control", undefined, qs.toString());
    setRows(r.ok ? r.rows ?? [] : []);
  }, [days, kind, who]);

  useEffect(() => { void loadPeople(); }, [loadPeople]);
  useEffect(() => { void loadRows(); }, [loadRows]);

  const name = useMemo(() => {
    const m = new Map((people ?? []).map((p) => [p.id, p.full_name]));
    return (id: string | null) => (id ? m.get(id) ?? "Unknown" : "Unknown");
  }, [people]);

  async function change(p: Person, body: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(p.id); setError(null);
    const r = await api<{ ds: DsSettings; today: Usage }>("PATCH", "control", { userId: p.id, ...body });
    setBusy(null);
    if (!r.ok) return setError(r.error ?? "Could not save.");
    setPeople((all) => all?.map((x) => (x.id === p.id ? { ...x, ds: r.ds as DsSettings, today: (r.today as Usage) ?? x.today } : x)) ?? null);
    void loadRows();
  }

  async function account(p: Person) {
    const next = !p.active;
    if (!next && !window.confirm(`Block ${p.full_name}? They will be signed out of the CRM and DB Search at once and cannot sign in until you allow them again.`)) return;
    setBusy(p.id); setError(null);
    const r = await api("PATCH", "users", { id: p.id, active: next });
    setBusy(null);
    if (!r.ok) return setError(r.error === "cannot_demote_self" ? "You cannot block your own account." : r.error ?? "Could not save.");
    setPeople((all) => all?.map((x) => (x.id === p.id ? { ...x, active: next } : x)) ?? null);
  }

  const shown = (rows ?? []).filter((r) => {
    const t = text.trim().toLowerCase();
    if (!t) return true;
    return [name(r.user_id), r.query, r.email, r.ip, ACTION_LABEL[r.action] ?? r.action].some((v) => v && v.toLowerCase().includes(t));
  });

  const totals = (people ?? []).reduce((a, p) => ({
    searches: a.searches + p.today.searches, reveals: a.reveals + p.today.reveals,
    active: a.active + (p.lastSeen && Date.now() - new Date(p.lastSeen).getTime() < 86_400_000 ? 1 : 0),
    locked: a.locked + (p.ds.lockedAt ? 1 : 0),
  }), { searches: 0, reveals: 0, active: 0, locked: 0 });

  const toggle = (on: boolean, danger = false) =>
    `inline-flex h-8 items-center gap-1.5 rounded-[8px] border px-3 text-[12px] font-bold transition-colors ${on
      ? "border-[var(--ok-bd)] bg-[var(--ok-bg)] text-[var(--ok)] hover:brightness-110"
      : danger ? "border-[var(--bad-bd)] bg-[var(--bad-bg)] text-[var(--bad)] hover:brightness-110" : "border-[var(--hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`;

  return (
    <div className="space-y-5">
      {error && <p role="alert" className="rounded-[10px] border border-[var(--bad-bd)] bg-[var(--bad-bg)] px-3 py-2 text-[13px] text-[var(--bad)]">{error}</p>}

      <dl className="panel grid grid-cols-2 md:grid-cols-4">
        {[["Searches today", totals.searches], ["Numbers revealed today", totals.reveals], ["Active in the last day", totals.active], ["Locked now", totals.locked]].map(([label, v], i) => (
          <div key={String(label)} className={`px-5 py-4 ${i ? "border-s border-[var(--hairline)]" : ""} ${i === 2 ? "max-md:border-s-0 max-md:border-t" : ""} ${i === 3 ? "max-md:border-t" : ""}`}>
            <dt className="ds-label !text-[10px]">{label}</dt>
            <dd className={`figure mt-1.5 text-[24px] leading-none ${label === "Locked now" && Number(v) > 0 ? "text-[var(--bad)]" : "text-[var(--accent)]"}`}>{people ? v : "…"}</dd>
          </div>
        ))}
      </dl>

      <Card>
        <CardHead title="People" count={people ? `${people.length}` : undefined}
          action={<button onClick={() => void loadPeople()} aria-label="Refresh" className={BTN_ICON}><RefreshCw size={14} /></button>} />
        {!people ? <div className="h-48 animate-pulse" /> : people.length === 0 ? <Empty>No one on the team yet.</Empty> : (
          <ul>
            {people.map((p) => {
              const admin = p.role === "admin";
              const self = p.id === meId;
              return (
                <li key={p.id} className={`grid gap-4 border-b border-[var(--hairline-soft)] px-5 py-4 last:border-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,1fr)] ${busy === p.id ? "opacity-60" : ""}`}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[14.5px] font-bold">{p.full_name}</span>
                      <Chip tone={admin ? "info" : "neutral"}>{admin ? "Admin" : "Agent"}</Chip>
                      {!p.active && <Chip tone="bad">Blocked</Chip>}
                      {p.ds.lockedAt && <Chip tone="bad">DB Search locked</Chip>}
                    </div>
                    <div className="mt-0.5 truncate text-[12.5px] text-[var(--text-muted)]">{p.email}</div>
                    <div className="mt-1 text-[12px] text-[var(--text-muted)]">Last active <b className="text-[var(--text-secondary)]">{ago(p.lastSeen)}</b> · last sign-in {ago(p.lastLogin)}</div>
                    {p.ds.lockedAt && <div className="mt-1 text-[12px] text-[var(--bad)]">{p.ds.lockReason ?? "Locked"} ({ago(p.ds.lockedAt)})</div>}
                  </div>

                  <div className="space-y-2.5">
                    <div className="grid grid-cols-3 gap-3">
                      <Meter label="Searches" used={p.today.searches} limit={p.ds.searches} admin={admin} />
                      <Meter label="Numbers" used={p.today.reveals} limit={p.ds.reveals} admin={admin} />
                      <Meter label="Lists" used={p.today.lists} limit={p.ds.lists} admin={admin} />
                    </div>
                    <div className="text-[11.5px] text-[var(--text-muted)]">This week: <span className="figure">{p.week.searches}</span> searches, <span className="figure">{p.week.reveals}</span> numbers, <span className="figure">{p.week.lists}</span> sent to lists</div>
                    {!admin && (
                      <div className="grid grid-cols-3 gap-2">
                        {(["searches", "reveals", "lists"] as const).map((k) => (
                          <label key={k} className="block">
                            <span className="ds-label mb-1 block !text-[9.5px]">{k === "reveals" ? "Numbers a day" : k === "lists" ? "List a day" : "Searches a day"}</span>
                            <input type="number" min={0} max={k === "searches" ? 5000 : 1000} defaultValue={p.ds[k]} key={`${p.id}-${k}-${p.ds[k]}`}
                              onBlur={(e) => { const v = Math.round(Number(e.target.value)); if (Number.isFinite(v) && v !== p.ds[k]) void change(p, { [k]: v }); }}
                              className={`${INPUT} figure !h-8 text-[13px]`} />
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap content-start items-start gap-2 lg:justify-end">
                    <button disabled={self} onClick={() => void account(p)} title={self ? "You cannot block your own account" : "Blocks the CRM and DB Search"} className={toggle(p.active, !p.active)}>
                      {p.active ? <ShieldCheck size={13} /> : <Ban size={13} />} CRM {p.active ? "allowed" : "blocked"}
                    </button>
                    {!admin && (
                      <button onClick={() => void change(p, { ds_access: !p.ds.access }, p.ds.access ? `Block DB Search for ${p.full_name}? The CRM stays open for them.` : undefined)} className={toggle(p.ds.access, !p.ds.access)}>
                        {p.ds.access ? <ShieldCheck size={13} /> : <Ban size={13} />} DB Search {p.ds.access ? "allowed" : "blocked"}
                      </button>
                    )}
                    {!admin && (p.ds.lockedAt
                      ? <button onClick={() => void change(p, { unlock: true })} className={toggle(false)}><Unlock size={13} /> Unlock</button>
                      : <button onClick={() => void change(p, { lock: true }, `Lock DB Search for ${p.full_name} until you unlock it?`)} className={toggle(false)}><Lock size={13} /> Lock</button>)}
                    <button onClick={() => void change(p, { kick: true }, `Sign ${p.full_name} out of DB Search now? They can sign in again with a new code.`)} className={toggle(false)}>
                      <LogOut size={13} /> Sign out of DB Search
                    </button>
                    <button onClick={() => setWho(p.id)} className={toggle(false)}>Activity</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardHead title="Activity" count={rows ? `${shown.length}` : undefined}
          action={<button disabled={!shown.length} onClick={() => downloadCsv("activity", shown, [
            ["When", (r) => r.at], ["Person", (r) => (r.user_id ? name(r.user_id) : r.email ?? "")], ["What", (r) => ACTION_LABEL[r.action] ?? r.action],
            ["Detail", (r) => r.query ?? ""], ["Reason", (r) => (r.reason ? REASON_LABEL[r.reason] ?? r.reason : "")], ["IP", (r) => r.ip ?? ""], ["Device", (r) => r.device ?? ""],
          ])} className={BTN_GHOST}><Download size={14} /> CSV</button>} />
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--hairline)] px-5 py-3">
          <Segmented value={days} options={PERIODS.map((p) => ({ ...p }))} onChange={setDays} />
          <Segmented value={kind} options={KINDS.map((k) => ({ ...k }))} onChange={setKind} />
          <select value={who} onChange={(e) => setWho(e.target.value)} className={`${INPUT} !w-auto`} aria-label="Person">
            <option value="">Everyone</option>
            {(people ?? []).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Filter by name, search, IP" className={`${INPUT} min-w-[180px] flex-1`} />
        </div>
        {!rows ? <div className="h-40 animate-pulse" /> : shown.length === 0 ? <Empty>Nothing in this period.</Empty> : (
          <ul className="max-h-[560px] overflow-y-auto">
            {shown.map((r) => {
              const bad = r.action === "locked" || r.action === "login_failed" || r.action === "denied" || r.action === "otp_failed";
              return (
                <li key={r.id} className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 border-b border-[var(--hairline-soft)] px-5 py-2.5 text-[13px] last:border-0 sm:grid-cols-[110px_160px_minmax(0,1fr)_120px]">
                  <span className="figure text-[12px] text-[var(--text-muted)]" title={r.at}>{stamp(r.at)}</span>
                  <span className="truncate font-semibold">{r.user_id ? name(r.user_id) : r.email ?? "Unknown"}</span>
                  <span className="min-w-0 truncate max-sm:col-span-2">
                    <span className={bad ? "font-semibold text-[var(--bad)]" : r.source === "session" ? "text-[var(--text-secondary)]" : ""}>{ACTION_LABEL[r.action] ?? r.action}</span>
                    {r.query && <span className="text-[var(--text-muted)]">: “{r.query}”</span>}
                    {r.reason && <span className="text-[var(--text-muted)]"> for {REASON_LABEL[r.reason] ?? r.reason}</span>}
                    {r.device && <span className="text-[var(--text-muted)]"> on {r.device}</span>}
                  </span>
                  <span className="figure truncate text-[11.5px] text-[var(--text-muted)] max-sm:hidden">{r.ip ?? ""}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
