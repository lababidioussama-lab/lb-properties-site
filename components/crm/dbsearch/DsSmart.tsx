"use client";

import { useState, type FormEvent } from "react";
import { CornerDownRight, History, Sparkles } from "lucide-react";

import type { DsUsage } from "./api";
import type { CardActions } from "./DsCardView";
import { DsPhone } from "./DsPhone";
import { DsSearch, type DsFound } from "./DsSearch";
import { DS_CHIP, DS_GO, DS_INPUT, DS_ROW, DsBox } from "./ui";

/**
 * DB Search's Smart tab. DB Search sends the question to an AI; there is no
 * AI behind the CRM, so Smart reads the question itself and says how it read
 * it:
 *   - a phone number (any format, Arabic digits too) goes to the Phone lookup;
 *   - a unit, villa or plot code (DL-J439, BL853) is searched on its own;
 *   - area shorthands are expanded (JVC → Jumeirah Village Circle) and an
 *     area alone searches the whole area;
 *   - otherwise the question words are taken out and the rest is searched.
 * It then answers in one line (how many records, how many with a number),
 * offers the other ways to read the question, and keeps the recent ones.
 */
type Plan = { kind: "phone" | "search"; q: string; area: string | null; count: boolean; alts: { label: string; plan: Omit<Plan, "alts"> }[] };

const STOP = new Set(("who whose whom owns own owned owner owners of the in at on for and a an is are was were did does do they them their " +
  "pay paid price prices how many much list show me find get give all any what which where villa villas apartment apartments flat flats " +
  "unit units tower towers building buildings please number numbers phone contact contacts details about with from to by that this there " +
  "bought sold selling buy sell can you i want need looking tell count total people person records record").split(" "));

/* Area shorthands agents use, to the names the records carry. */
const AREAS: [RegExp, string][] = [
  [/\bjvc\b|jumeirah village circle/i, "Jumeirah Village Circle"],
  [/\bjvt\b|jumeirah village triangle/i, "Jumeirah Village Triangle"],
  [/\bjlt\b|jumeirah lake towers?/i, "Jumeirah Lake Towers"],
  [/\bjbr\b|jumeirah beach residence/i, "Jumeirah Beach Residence"],
  [/\bdh2\b|damac hills ?2|akoya oxygen/i, "Damac Hills 2"],
  [/\bdamac hills\b(?! ?2)/i, "Damac Hills"],
  [/\bdamac lagoons?\b|\blagoons\b/i, "Damac Lagoons"],
  [/\b(dubai )?marina\b/i, "Dubai Marina"],
  [/\bdowntown( dubai)?\b/i, "Downtown Dubai"],
  [/\b(the )?palm( jumeirah)?\b/i, "Palm Jumeirah"],
  [/\bdubai hills( estate)?\b|\bdhe\b/i, "Dubai Hills Estate"],
  [/\bbusiness bay\b/i, "Business Bay"],
  [/\b(dubai )?creek harbou?r\b/i, "Dubai Creek Harbour"],
  [/\barabian ranches\b/i, "Arabian Ranches"],
  [/\bdso\b|silicon oasis/i, "Dubai Silicon Oasis"],
];

const arabicDigits = (s: string) => s.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

export function readQuestion(input: string): Plan | null {
  const t = arabicDigits(input).trim();
  if (t.length < 2) return null;
  const count = /\bhow many\b|\bcount\b|\bnumber of\b|\btotal\b/i.test(t);

  const phone = t.match(/(?:\+|00)?\d[\d\s()-]{6,}\d/);
  if (phone && phone[0].replace(/\D/g, "").length >= 7) {
    const q = phone[0].trim();
    return { kind: "phone", q, area: null, count, alts: [{ label: `Search “${q}” as text`, plan: { kind: "search", q, area: null, count } }] };
  }

  /* An area name counts only when it is not the start of a building's name:
     "in Dubai Marina" is the area, "Marina Gate" is a building. */
  let area: string | null = null;
  let rest = t;
  for (const [re, name] of AREAS) {
    const m = rest.match(re);
    if (!m || m.index == null) continue;
    const next = rest.slice(m.index + m[0].length).replace(/^[\s?!.,;:]+/, "").split(/\s+/)[0] ?? "";
    if (/^(tower|towers|building|gate|views?|heights|residences?|point|park|walk|bay|rise|square)$/i.test(next)) continue;
    if (next && !STOP.has(next.toLowerCase()) && !/^\d+$/.test(next)) continue;
    area = name; rest = rest.slice(0, m.index) + " " + rest.slice(m.index + m[0].length);
    break;
  }

  const code = rest.match(/\b[A-Za-z]{1,4}-?[A-Za-z]?\d{1,5}[A-Za-z]?\b/);
  if (code && /\d/.test(code[0]) && /[A-Za-z]/.test(code[0])) {
    const q = code[0].toUpperCase();
    const alts = area ? [{ label: `Everything in ${area}`, plan: { kind: "search" as const, q: area, area: null, count } }] : [];
    return { kind: "search", q, area, count, alts };
  }

  const words = rest.replace(/[?!.,;:"“”'’()]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w.toLowerCase()));
  const core = words.join(" ").trim();
  if (!core && area) return { kind: "search", q: area, area: null, count, alts: [] };
  if (core.length < 2 && !(area && /^\d+$/.test(core))) return null;
  /* A bare number with an area is a unit or villa number in that area. */
  const q = area && /^\d{1,5}$/.test(core) ? `${core} ${area}` : core;
  const alts: Plan["alts"] = [];
  if (area) alts.push({ label: `Everything in ${area}`, plan: { kind: "search", q: area, area: null, count } });
  if (area && q === core) alts.push({ label: `“${core} ${area}” together`, plan: { kind: "search", q: `${core} ${area}`, area: null, count } });
  const named = words.filter((w) => !/^\d+$/.test(w)).join(" ");
  if (named && named !== q && named.length >= 2) alts.push({ label: `Just “${named}”`, plan: { kind: "search", q: named, area, count } });
  else if (words.length > 1) alts.push({ label: `Only “${words[0]}”`, plan: { kind: "search", q: words[0], area, count } });
  return { kind: "search", q, area, count, alts };
}

const EXAMPLES = ["Who owns villa DL-J439 in Damac Lagoons?", "Ghalia tower JVC", "How many in Marina Gate?", "050 123 4567"];

export function DsSmart({ onExpired, onUsage, onOpenLead, onAreaFilter }: CardActions & {
  onUsage: (u: DsUsage, s?: { endsAt: number }) => void;
  onAreaFilter?: () => void;
}) {
  const [text, setText] = useState("");
  const [plan, setPlan] = useState<Omit<Plan, "alts"> & { alts?: Plan["alts"] } | null>(null);
  const [asked, setAsked] = useState(0);
  const [found, setFound] = useState<(DsFound & { agent?: string | null }) | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function run(p: Omit<Plan, "alts"> & { alts?: Plan["alts"] }) {
    setError(null); setFound(null); setPlan(p); setAsked((n) => n + 1);
  }
  function ask(e?: FormEvent, forced?: string) {
    e?.preventDefault();
    const question = (forced ?? text).trim();
    if (forced) setText(forced);
    const p = readQuestion(question);
    if (!p) return setError("Add a name, a place, a unit code or a number to the question.");
    setRecent((r) => [question, ...r.filter((x) => x !== question)].slice(0, 6));
    run(p);
  }

  const actions = { onExpired, onUsage, onOpenLead };
  const answer = plan && found && (
    plan.kind === "phone"
      ? found.agent ? <>That number belongs to a licensed agent, <b>{found.agent}</b>.</>
        : found.shown ? <><b className="figure text-[var(--text-primary)]">{found.shown}</b> record{found.shown === 1 ? "" : "s"} carry this number.</>
          : <>No record carries this number.</>
      : found.shown
        ? <><b className={`figure text-[var(--text-primary)] ${plan.count ? "text-[18px]" : ""}`}>{found.shown}</b> record{found.shown === 1 ? "" : "s"} for “{plan.q}”, <b className="figure text-[var(--text-primary)]">{found.withPhone}</b> with a number{found.communities.length > 0 && <>, mostly in {found.communities.slice(0, 2).join(" and ")}</>}.</>
        : <>Nothing for “{plan.q}”. Try one of the other readings below.</>
  );

  return (
    <div className="space-y-4">
      <DsBox label="Smart search" icon={<Sparkles size={13} />}>
        <div className="mb-2.5 rounded-[10px] border border-[var(--hairline)] bg-[var(--input-bg)] px-3.5 py-2.5 text-[13px] leading-relaxed text-[var(--text-muted)]">
          {plan ? (
            <div className="space-y-1.5">
              <p>
                Reading this as {plan.kind === "phone"
                  ? <>the number <b className="figure text-[var(--text-primary)]">{plan.q}</b></>
                  : <>a search for <b className="text-[var(--text-primary)]">“{plan.q}”</b>{plan.area && <> in {plan.area}</>}</>}.
              </p>
              {answer && <p className="flex items-start gap-1.5 text-[var(--text-secondary)]"><CornerDownRight size={14} className="mt-0.5 shrink-0 text-[var(--emerald)]" /><span>{answer}</span></p>}
              {plan.alts && plan.alts.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[12px]">Or:</span>
                  {plan.alts.map((a) => <button key={a.label} type="button" onClick={() => run(a.plan)} className={`${DS_CHIP} !h-7 !text-[12px]`}>{a.label}</button>)}
                </div>
              )}
            </div>
          ) : (
            <>
              Ask the way you would ask a colleague: a name, a building, a unit or villa code, an area (JVC, JLT, DH2…) or a number.
              <div className="mt-2 flex flex-wrap gap-1.5">
                {EXAMPLES.map((x) => <button key={x} type="button" onClick={() => ask(undefined, x)} className={DS_CHIP}>{x}</button>)}
              </div>
            </>
          )}
        </div>
        <form onSubmit={ask} className={DS_ROW}>
          <input autoFocus value={text} onChange={(e) => setText(e.target.value)} maxLength={200} autoComplete="off"
            placeholder="Ask anything, e.g. who owns villa DL-J439?" className={DS_INPUT} aria-label="Question" />
          <button className={DS_GO}><Sparkles size={15} /> Ask</button>
        </form>
        {error && <p role="alert" className="mt-2 text-[13px] text-[var(--bad)]">{error}</p>}
        {recent.length > 1 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[12px] text-[var(--text-muted)]">
            <History size={13} />
            {recent.slice(1).map((r) => <button key={r} type="button" onClick={() => ask(undefined, r)} className="max-w-[240px] truncate rounded-full px-2 py-0.5 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]">{r}</button>)}
          </div>
        )}
      </DsBox>

      {plan && (plan.kind === "phone"
        ? <DsPhone key={asked} hideForm initialQuery={plan.q} {...actions} onFound={setFound} />
        : <DsSearch key={asked} hideForm initialQuery={plan.q} {...actions} onAreaFilter={onAreaFilter} onFound={setFound}
            onPhone={(q) => run({ kind: "phone", q, area: null, count: false })} />)}
    </div>
  );
}
