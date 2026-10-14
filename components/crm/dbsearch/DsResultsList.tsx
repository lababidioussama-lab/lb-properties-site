"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ListFilter, X } from "lucide-react";

import { ds, type DsNote, type DsResults, type DsSoldFlag } from "./api";
import { DsCardView, type CardActions } from "./DsCardView";

/**
 * DB Search's renderOwners() on screen: the "show anyway" toggle, the refine
 * bar (instant narrowing of what this search already returned — no new
 * request, nothing counted), the count, and cards fifty at a time.
 */

const PAGE = 50;
const soldKey = (s: unknown) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

function Note({ note, query, onToggle }: { note: DsNote; query: string | null; onToggle: () => void }) {
  const link = (label: string) => <button onClick={onToggle} className="font-semibold text-[var(--accent)] hover:underline">{label}</button>;
  const box = "rounded-lg border px-3 py-2 text-[12.5px]";
  switch (note.kind) {
    case "no_exact":
      return <p className={`${box} border-[var(--warn-bd)] bg-[var(--warn-bg)] font-semibold text-[var(--warn)]`}>No record actually contains “{query}” — showing {note.n} similar-looking record{note.n === 1 ? "" : "s"}</p>;
    case "showing_all":
      return <p className={`${box} border-[var(--warn-bd)] bg-[var(--warn-bg)] text-[var(--warn)]`}>Showing all {note.n} result{note.n === 1 ? "" : "s"}, including {note.hidden} that do not contain “{query}” · {link("hide them")}</p>;
    case "names_hidden":
      return <p className={`${box} border-[var(--hairline)] bg-[var(--surface-sunken)] text-[var(--text-muted)]`}>{note.n} other record{note.n === 1 ? "" : "s"} with a different name hidden · {link("show anyway")}</p>;
    case "contact_only":
      return <p className={`${box} border-[var(--hairline)] bg-[var(--surface-sunken)] text-[var(--text-muted)]`}>{note.n.toLocaleString("en-US")} contact-only record{note.n === 1 ? "" : "s"} (name + phone, no property) hidden · {link("show anyway")}</p>;
  }
}

interface More { party: string; ptype: string; beds: string; nat: string; year: string; email: boolean; crm: "" | "in" | "out" }
const NO_MORE: More = { party: "", ptype: "", beds: "", nat: "", year: "", email: false, crm: "" };
const PARTY: Record<string, string> = { buyer: "Current owner (bought)", seller: "Previous owner (sold)", mortgagee: "Mortgage holder" };

/** One filter as a plain dropdown: "Any …" first, then the values found in these results. */
function Pick({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}
      className={`h-10 max-w-[220px] rounded-lg border px-3 text-[13px] outline-none focus:border-[var(--accent)] ${value ? "border-[var(--accent)] font-semibold" : "border-[var(--hairline-strong)]"} bg-white`}>
      <option value="">{label}: any</option>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

export function DsResultsList({ data, query, summary, actions, emptyText }: {
  data: DsResults;
  /** The typed search, for the notes. Null for phone and community lists. */
  query: string | null;
  summary?: ReactNode;
  actions: CardActions;
  emptyText?: ReactNode;
}) {
  const [showLoose, setShowLoose] = useState(false);
  const [text, setText] = useState("");
  const [typed, setTyped] = useState("");
  const [comm, setComm] = useState("");
  const [phone, setPhone] = useState(false);
  /* The extra filters: who the owner is, what the property is, and where the record stands. */
  const [more, setMore] = useState<More>(NO_MORE);
  const [shown, setShown] = useState(PAGE);
  const [sold, setSold] = useState<Map<string, DsSoldFlag>>(new Map());

  const view = showLoose ? data.loose : data.strict;
  const all = view.entries;

  const comms = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of all) { const c = data.cards[e.c].comm; if (c) m.set(c.toLowerCase(), c); }
    return [...m.values()].sort((a, b) => a.localeCompare(b));
  }, [all, data.cards]);
  const withPhone = useMemo(() => all.filter((e) => data.cards[e.c].phoneCount > 0).length, [all, data.cards]);
  const showBar = all.length >= 6;
  const showComm = comms.length >= 2;
  const showPhone = withPhone > 0 && withPhone < all.length;
  const opts = useMemo(() => {
    const cards = all.map((e) => data.cards[e.c]);
    const uniq = (vals: (string | null | undefined)[]) => [...new Set(vals.filter((v): v is string => !!v && v.trim() !== ""))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return {
      party: uniq(cards.map((c) => c.model.tx.party)),
      ptype: uniq(cards.map((c) => c.model.ptype)),
      beds: uniq(cards.map((c) => c.model.beds)),
      nat: uniq(cards.map((c) => c.model.nat)),
      year: uniq(cards.map((c) => c.model.tx.date?.slice(0, 4))).reverse(),
      email: cards.filter((c) => !!c.email).length,
      crm: cards.filter((c) => !!c.inCrm).length,
    };
  }, [all, data.cards]);

  const list = useMemo(() => {
    const t = text.toLowerCase();
    return all.filter((e) => {
      const c = data.cards[e.c];
      return (!comm || c.comm.toLowerCase() === comm) && (!phone || c.phoneCount > 0) && (!t || c.find.includes(t))
        && (!more.party || c.model.tx.party === more.party) && (!more.ptype || c.model.ptype === more.ptype)
        && (!more.beds || c.model.beds === more.beds) && (!more.nat || c.model.nat === more.nat)
        && (!more.year || (c.model.tx.date ?? "").slice(0, 4) >= more.year)
        && (!more.email || !!c.email) && (more.crm === "" || (more.crm === "in" ? !!c.inCrm : !c.inCrm));
    });
  }, [all, data.cards, text, comm, phone, more]);

  // Refine box: 120 ms after the last key, as in DB Search.
  useEffect(() => { const t = setTimeout(() => setText(typed.trim()), 120); return () => clearTimeout(t); }, [typed]);
  useEffect(() => { setShown(PAGE); }, [text, comm, phone, showLoose, more]);

  /* "Already sold" from registered sales, fetched after the cards are drawn so
     the list never waits on it. Grouped by community so the server can require
     project agreement; Damac Lagoons only, as in DB Search. */
  useEffect(() => {
    const groups = new Map<string, Set<string>>();
    for (const e of all) {
      const c = data.cards[e.c];
      const u = c.model.badge?.v;
      const cm = c.model.community ?? "";
      if (!u || soldKey(u).length < 4 || c.sold || !/lagoon/i.test(cm)) continue;
      (groups.get(cm) ?? groups.set(cm, new Set()).get(cm)!).add(u);
    }
    if (!groups.size) return;
    let live = true;
    void ds<{ found: DsSoldFlag[] }>("POST", "sold", { groups: [...groups].slice(0, 6).map(([c, u]) => ({ comm: c, units: [...u].slice(0, 400) })) }).then((r) => {
      if (live && r.ok) setSold(new Map(r.found.map((f) => [`${f.comm}|${f.unitKey}`, f])));
    });
    return () => { live = false; };
  }, [all, data.cards]);

  const countTxt = (n: number) => n === all.length
    ? `Showing ${n.toLocaleString("en-US")} record${n === 1 ? "" : "s"}`
    : `Showing ${n.toLocaleString("en-US")} of ${all.length.toLocaleString("en-US")} records`;
  const active: [string, string][] = [];
  if (text) active.push(["text", `“${text}”`]);
  if (comm) active.push(["comm", comms.find((c) => c.toLowerCase() === comm) ?? comm]);
  if (phone) active.push(["phone", "Has phone"]);
  if (more.party) active.push(["party", PARTY[more.party] ?? more.party]);
  if (more.ptype) active.push(["ptype", more.ptype]);
  if (more.beds) active.push(["beds", `${more.beds} bed`]);
  if (more.nat) active.push(["nat", more.nat]);
  if (more.year) active.push(["year", `Bought ${more.year} or later`]);
  if (more.email) active.push(["email", "Has email"]);
  if (more.crm) active.push(["crm", more.crm === "in" ? "Already in CRM" : "Not in CRM yet"]);
  const clear = (k: string) => {
    if (k === "text" || k === "all") { setText(""); setTyped(""); }
    if (k === "comm" || k === "all") setComm("");
    if (k === "phone" || k === "all") setPhone(false);
    if (k === "all") setMore(NO_MORE);
    else if (k in NO_MORE) setMore((m) => ({ ...m, [k]: NO_MORE[k as keyof More] }));
  };

  if (!all.length) {
    return (
      <div className="space-y-3">
        {summary}
        {view.notes.map((n, i) => <Note key={i} note={n} query={query} onToggle={() => setShowLoose((v) => !v)} />)}
        <div className="rounded-xl border border-dashed border-[var(--hairline-strong)] bg-white px-6 py-10 text-center">
          {emptyText ?? <>
            <p className="text-[14px] font-semibold">No records match{query ? ` “${query}”` : ""}</p>
            <p className="mt-1 text-[12.5px] text-[var(--text-muted)]">Check the spelling, drop a word, or search a unit / villa code (e.g. <b>DL-J439</b>) or building name instead.</p>
          </>}
        </div>
      </div>
    );
  }

  const slice = list.slice(0, shown);
  const left = list.length - slice.length;

  return (
    <div className="space-y-3">
      {summary}

      {showBar && (
        <div role="search" aria-label="Refine these results" className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-[var(--hairline-strong)] bg-white px-3 focus-within:border-[var(--accent)]">
              <ListFilter size={14} className="text-[var(--text-muted)]" />
              <input type="search" value={typed} onChange={(e) => setTyped(e.target.value)} maxLength={100} placeholder="Refine these results…" aria-label="Refine these results by name, unit or building" className="h-full flex-1 bg-transparent text-[13px] outline-none" />
            </label>
            {showComm && (
              <select value={comm} onChange={(e) => setComm(e.target.value)} aria-label="Community" className="h-10 max-w-[260px] rounded-lg border border-[var(--hairline-strong)] bg-white px-3 text-[13px] outline-none focus:border-[var(--accent)]">
                <option value="">All communities ({comms.length})</option>
                {comms.map((c) => <option key={c} value={c.toLowerCase()}>{c}</option>)}
              </select>
            )}
            {opts.party.length > 1 && <Pick label="Owner" value={more.party} onChange={(v) => setMore({ ...more, party: v })} options={opts.party.map((v) => [v, PARTY[v] ?? v])} />}
            {opts.ptype.length > 1 && <Pick label="Property type" value={more.ptype} onChange={(v) => setMore({ ...more, ptype: v })} options={opts.ptype.map((v) => [v, v])} />}
            {opts.beds.length > 1 && <Pick label="Bedrooms" value={more.beds} onChange={(v) => setMore({ ...more, beds: v })} options={opts.beds.map((v) => [v, `${v} bed`])} />}
            {opts.nat.length > 1 && <Pick label="Nationality" value={more.nat} onChange={(v) => setMore({ ...more, nat: v })} options={opts.nat.map((v) => [v, v])} />}
            {opts.year.length > 1 && <Pick label="Bought in" value={more.year} onChange={(v) => setMore({ ...more, year: v })} options={opts.year.map((v) => [v, `${v} or later`])} />}
            {opts.crm > 0 && <Pick label="CRM" value={more.crm} onChange={(v) => setMore({ ...more, crm: v as More["crm"] })} options={[["out", "Not in CRM yet"], ["in", "Already in CRM"]]} />}
            {opts.email > 0 && (
              <button type="button" aria-pressed={more.email} onClick={() => setMore({ ...more, email: !more.email })}
                className={`h-10 rounded-lg border px-3 text-[13px] font-semibold ${more.email ? "border-[var(--accent-solid)] bg-[var(--accent-solid)] text-white" : "border-[var(--hairline-strong)] bg-white hover:border-[var(--accent)]"}`}>
                Has email <span className={more.email ? "text-white/80" : "text-[var(--text-muted)]"}>{opts.email.toLocaleString("en-US")}</span>
              </button>
            )}
            {showPhone && (
              <button type="button" aria-pressed={phone} onClick={() => setPhone((v) => !v)}
                className={`h-10 rounded-lg border px-3 text-[13px] font-semibold ${phone ? "border-[var(--accent-solid)] bg-[var(--accent-solid)] text-white" : "border-[var(--hairline-strong)] bg-white hover:border-[var(--accent)]"}`}>
                Has phone <span className={phone ? "text-white/80" : "text-[var(--text-muted)]"}>{withPhone.toLocaleString("en-US")}</span>
              </button>
            )}
          </div>
          {active.length > 0 && (
            <div className="flex flex-wrap gap-1.5" aria-live="polite">
              {active.map(([k, l]) => (
                <button key={k} onClick={() => clear(k)} aria-label={`Remove filter ${l}`} className="inline-flex h-7 items-center gap-1 rounded-full border border-[var(--hairline-strong)] bg-white px-2.5 text-[12px] font-semibold hover:border-[var(--accent)]">{l} <X size={12} /></button>
              ))}
              {active.length > 1 && <button onClick={() => clear("all")} className="h-7 px-2 text-[12px] font-semibold text-[var(--accent)] hover:underline">Clear all</button>}
            </div>
          )}
        </div>
      )}

      <p className="text-[12.5px] font-semibold text-[var(--text-secondary)]">{countTxt(list.length)}{view.capped ? ` · the first ${all.length.toLocaleString("en-US")} are loaded` : ""}</p>
      {view.notes.map((n, i) => <Note key={i} note={n} query={query} onToggle={() => setShowLoose((v) => !v)} />)}

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--hairline-strong)] bg-white px-6 py-8 text-center">
          <p className="text-[14px] font-semibold">Nothing left after these filters</p>
          <p className="mt-1 text-[12.5px] text-[var(--text-muted)]">Remove a filter above to see the other {all.length.toLocaleString("en-US")} records.</p>
        </div>
      ) : (
        <div className="grid items-start gap-3 xl:grid-cols-2">
          {slice.map((e) => {
            const c = data.cards[e.c];
            return <DsCardView key={e.c} card={c} also={e.also} actions={actions}
              soldFlag={c.model.badge ? sold.get(`${c.model.community ?? ""}|${soldKey(c.model.badge.v)}`) ?? null : null} />;
          })}
        </div>
      )}
      {left > 0 && (
        <button onClick={() => setShown((s) => s + PAGE)} className="h-10 rounded-lg border border-[var(--hairline-strong)] bg-white px-4 text-[13px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)]">
          Load more — {left.toLocaleString("en-US")} more record{left === 1 ? "" : "s"}
        </button>
      )}
    </div>
  );
}
