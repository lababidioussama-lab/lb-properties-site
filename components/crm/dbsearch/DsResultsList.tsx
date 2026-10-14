"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, ListFilter, X } from "lucide-react";

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

/** How many of these results carry each value of one field, most common first. */
function count(all: { c: number }[], cards: DsResults["cards"], get: (c: DsResults["cards"][number]) => string | null | undefined, numeric = false): [string, number][] {
  const m = new Map<string, number>();
  for (const e of all) { const v = get(cards[e.c]); if (v && v.trim()) m.set(v, (m.get(v) ?? 0) + 1); }
  const out = [...m.entries()];
  return numeric ? out.sort((x, y) => x[0].localeCompare(y[0], undefined, { numeric: true })) : out.sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]));
}

/** A filter button: shows its choice, opens a short list with how many records each choice leaves. */
function FilterPill({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string, number][] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  const chosen = options.find((o) => o[0] === value);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}
        className={`inline-flex h-9 max-w-[240px] items-center gap-1.5 rounded-full border px-3.5 text-[12.5px] font-semibold transition-colors ${chosen ? "border-[var(--accent)] bg-[var(--accent-wash)] text-[var(--accent)]" : "border-[var(--hairline)] text-[var(--text-secondary)] hover:border-[var(--hairline-strong)] hover:text-[var(--text-primary)]"}`}>
        <span className="truncate">{chosen ? chosen[1] : label}</span>
        {chosen
          ? <span role="button" tabIndex={0} aria-label={`Clear ${label}`} onClick={(e) => { e.stopPropagation(); onChange(""); setOpen(false); }} className="-me-1 grid h-5 w-5 place-items-center rounded-full hover:bg-[var(--surface-hover)]"><X size={12} /></span>
          : <ChevronDown size={13} className="opacity-60" />}
      </button>
      {open && (
        <div role="listbox" aria-label={label} className="crm-pop absolute start-0 top-11 z-40 max-h-72 w-64 overflow-y-auto rounded-[12px] border border-[var(--hairline)] bg-[var(--surface-solid)] p-1 shadow-[var(--shadow-pop)]">
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold text-[var(--text-muted)]">{label}</p>
          <button role="option" aria-selected={!value} onClick={() => { onChange(""); setOpen(false); }} className={`flex w-full items-center justify-between rounded-[8px] px-2.5 py-2 text-left text-[13px] hover:bg-[var(--surface-hover)] ${!value ? "font-semibold text-[var(--accent)]" : "text-[var(--text-primary)]"}`}>Any</button>
          {options.map(([v, l, n]) => (
            <button key={v} role="option" aria-selected={value === v} onClick={() => { onChange(v); setOpen(false); }}
              className={`flex w-full items-center justify-between gap-3 rounded-[8px] px-2.5 py-2 text-left text-[13px] hover:bg-[var(--surface-hover)] ${value === v ? "font-semibold text-[var(--accent)]" : "text-[var(--text-primary)]"}`}>
              <span className="truncate">{l}</span>
              <span className="figure shrink-0 text-[11.5px] text-[var(--text-muted)]">{n.toLocaleString("en-US")}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Toggle({ label, n, on, onClick }: { label: string; n: number; on: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[12.5px] font-semibold transition-colors ${on ? "border-[var(--accent)] bg-[var(--accent-wash)] text-[var(--accent)]" : "border-[var(--hairline)] text-[var(--text-secondary)] hover:border-[var(--hairline-strong)] hover:text-[var(--text-primary)]"}`}>
      {on && <Check size={13} />}{label}<span className="figure text-[11.5px] opacity-70">{n.toLocaleString("en-US")}</span>
    </button>
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
        <div role="search" aria-label="Refine these results" className="panel relative z-20 space-y-3 !p-3">
          <label className="flex h-11 items-center gap-2.5 rounded-[10px] border border-[var(--hairline)] bg-[var(--input-bg)] px-3.5 transition focus-within:border-[var(--accent)] focus-within:ring-[3px] focus-within:ring-[var(--accent-wash)]">
            <ListFilter size={15} className="text-[var(--text-muted)]" />
            <input type="search" value={typed} onChange={(e) => setTyped(e.target.value)} maxLength={100} placeholder="Refine by name, unit or building" aria-label="Refine these results by name, unit or building" className="h-full flex-1 bg-transparent text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
            <span className="figure shrink-0 text-[12px] text-[var(--text-muted)]">{list.length.toLocaleString("en-US")} of {all.length.toLocaleString("en-US")}</span>
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {showComm && <FilterPill label="Community" value={comm} onChange={setComm} options={count(all, data.cards, (c) => c.comm).map(([v, n]) => [v.toLowerCase(), v, n])} />}
            {opts.party.length > 1 && <FilterPill label="Owner" value={more.party} onChange={(v) => setMore({ ...more, party: v })} options={count(all, data.cards, (c) => c.model.tx.party).map(([v, n]) => [v, PARTY[v] ?? v, n])} />}
            {opts.ptype.length > 1 && <FilterPill label="Type" value={more.ptype} onChange={(v) => setMore({ ...more, ptype: v })} options={count(all, data.cards, (c) => c.model.ptype).map(([v, n]) => [v, v, n])} />}
            {opts.beds.length > 1 && <FilterPill label="Bedrooms" value={more.beds} onChange={(v) => setMore({ ...more, beds: v })} options={count(all, data.cards, (c) => c.model.beds, true).map(([v, n]) => [v, `${v} bed`, n])} />}
            {opts.nat.length > 1 && <FilterPill label="Nationality" value={more.nat} onChange={(v) => setMore({ ...more, nat: v })} options={count(all, data.cards, (c) => c.model.nat).map(([v, n]) => [v, v, n])} />}
            {opts.year.length > 1 && <FilterPill label="Bought" value={more.year} onChange={(v) => setMore({ ...more, year: v })} options={opts.year.map((y) => [y, `${y} or later`, all.filter((e) => (data.cards[e.c].model.tx.date ?? "").slice(0, 4) >= y).length])} />}
            {opts.crm > 0 && <FilterPill label="CRM" value={more.crm} onChange={(v) => setMore({ ...more, crm: v as More["crm"] })} options={[["out", "Not in CRM yet", all.length - opts.crm], ["in", "Already in CRM", opts.crm]]} />}
            {showPhone && <Toggle label="Has phone" n={withPhone} on={phone} onClick={() => setPhone((v) => !v)} />}
            {opts.email > 0 && <Toggle label="Has email" n={opts.email} on={more.email} onClick={() => setMore({ ...more, email: !more.email })} />}
            {active.length > 0 && <button onClick={() => clear("all")} className="ms-auto h-9 px-2 text-[12.5px] font-semibold text-[var(--accent)] hover:underline">Clear filters</button>}
          </div>
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
