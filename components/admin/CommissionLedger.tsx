"use client";

import { useMemo, useState, type ReactNode } from "react";

import { LEAD_STATUSES, type LeadStatus, type LedgerLead } from "@/lib/supabase";

/**
 * The commission ledger.
 *
 * This is a referral business, so an inbox would be the wrong shape: the
 * questions the operator actually has are "who has not been introduced to
 * anyone yet", "what is owed to me", and "which partner is worth sending
 * more leads to". Those are the three blocks below, in that order. The lead
 * list is last, because it is the raw material for the answers rather than
 * the answer.
 *
 * Every writable field belongs to the referral ledger. The submitted
 * enquiry — name, phone, what the visitor typed — is never editable here:
 * it is the record of what happened, not a working note.
 */

const aed = (value: number) =>
  `AED ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)}`;

const shortDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "—";

/** Statuses that mean the lead is out with a partner and still live. */
const IN_FLIGHT: LeadStatus[] = ["referred", "contacted", "quoted"];

export function CommissionLedger({ initialLeads }: { initialLeads: LedgerLead[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function patch(id: string, changes: Record<string, unknown>) {
    const previous = leads;
    setPending((p) => new Set(p).add(id));
    setError(null);

    // Optimistic: the operator is typing into a table and a round-trip per
    // keystroke-blur would make it feel broken. Reverted on failure.
    setLeads((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...changes } : row)),
    );

    try {
      const response = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, patch: changes }),
      });
      const result = (await response.json()) as {
        ok: boolean;
        lead?: LedgerLead;
        error?: string;
      };

      if (!result.ok || !result.lead) {
        setLeads(previous);
        setError(result.error ?? "Update failed.");
        return;
      }
      // Take the server's row back: it carries the fields the route derived
      // (referred_at, commission_paid_at) that the optimistic patch guessed at.
      setLeads((rows) => rows.map((row) => (row.id === id ? result.lead! : row)));
    } catch {
      setLeads(previous);
      setError("Could not reach the server.");
    } finally {
      setPending((p) => {
        const next = new Set(p);
        next.delete(id);
        return next;
      });
    }
  }

  const totals = useMemo(() => {
    const won = leads.filter((l) => l.status === "won");
    const earned = won.reduce((sum, l) => sum + (l.commission_aed ?? 0), 0);
    const paid = won
      .filter((l) => l.commission_paid_at)
      .reduce((sum, l) => sum + (l.commission_aed ?? 0), 0);

    return {
      total: leads.length,
      unreferred: leads.filter((l) => l.status === "new").length,
      inFlight: leads.filter((l) => IN_FLIGHT.includes(l.status)).length,
      won: won.length,
      lost: leads.filter((l) => l.status === "lost").length,
      earned,
      paid,
      outstanding: earned - paid,
      // Won deals with no commission recorded — money that is probably owed
      // and definitely untracked. The most useful number on the page.
      unpriced: won.filter((l) => l.commission_aed === null).length,
    };
  }, [leads]);

  const partners = useMemo(() => {
    const map = new Map<
      string,
      { partner: string; leads: number; won: number; earned: number; outstanding: number }
    >();

    for (const lead of leads) {
      if (!lead.partner) continue;
      const row = map.get(lead.partner) ?? {
        partner: lead.partner,
        leads: 0,
        won: 0,
        earned: 0,
        outstanding: 0,
      };
      row.leads += 1;
      if (lead.status === "won") {
        row.won += 1;
        const amount = lead.commission_aed ?? 0;
        row.earned += amount;
        if (!lead.commission_paid_at) row.outstanding += amount;
      }
      map.set(lead.partner, row);
    }

    return [...map.values()].sort((a, b) => b.earned - a.earned || b.leads - a.leads);
  }, [leads]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return leads.filter((lead) => {
      if (statusFilter !== "all" && lead.status !== statusFilter) return false;
      if (!needle) return true;
      return [lead.full_name, lead.phone, lead.email, lead.partner, lead.service]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle));
    });
  }, [leads, statusFilter, query]);

  return (
    <main className="mx-auto max-w-[1600px] px-5 py-10 sm:px-8">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="display-3 text-[var(--text-primary)]">Commission ledger</h1>
          <p className="mt-2 text-[12.5px] text-[var(--text-muted)]">
            {totals.total} enquiries · {totals.won} won · {aed(totals.outstanding)}{" "}
            outstanding
          </p>
        </div>
        <button
          onClick={async () => {
            await fetch("/api/admin/login", { method: "DELETE" });
            window.location.reload();
          }}
          className="rounded-full border border-[var(--hairline)] px-4 py-1.5 text-[11.5px] text-[var(--text-muted)] transition-colors duration-300 hover:border-[var(--hairline-strong)]"
        >
          Sign out
        </button>
      </header>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-[var(--glass-border-lit)] bg-[var(--accent-wash)] px-4 py-3 text-[12.5px] text-[var(--text-primary)]"
        >
          {error}
        </p>
      )}

      {/* ---------- what is owed ---------- */}
      <section className="mt-9">
        <h2 className="eyebrow">Money</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile label="Commission earned" value={aed(totals.earned)} note="Won deals" />
          <Tile
            label="Outstanding"
            value={aed(totals.outstanding)}
            note="Won but not marked paid"
            lit
          />
          <Tile label="Paid" value={aed(totals.paid)} note="Settled by the partner" />
          <Tile
            label="Won, no fee recorded"
            value={String(totals.unpriced)}
            note={
              totals.unpriced > 0
                ? "Closed deals with no commission entered — likely untracked income"
                : "Every won deal has a fee against it"
            }
            lit={totals.unpriced > 0}
          />
        </div>
      </section>

      {/* ---------- what needs chasing ---------- */}
      <section className="mt-9">
        <h2 className="eyebrow">Pipeline</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile
            label="Not yet referred"
            value={String(totals.unreferred)}
            note="Still sitting at 'new'"
            lit={totals.unreferred > 0}
          />
          <Tile label="With a partner" value={String(totals.inFlight)} note="Referred, contacted or quoted" />
          <Tile label="Won" value={String(totals.won)} note="Introduction converted" />
          <Tile label="Lost" value={String(totals.lost)} note="Closed without a fee" />
        </div>
      </section>

      {/* ---------- partner performance ---------- */}
      {partners.length > 0 && (
        <section className="mt-9">
          <h2 className="eyebrow">By partner</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--hairline)]">
            <table className="w-full min-w-[640px] text-[12.5px]">
              <thead>
                <tr className="border-b border-[var(--hairline)] bg-[var(--surface-sunken)]">
                  <Th>Partner</Th>
                  <Th align="end">Referred</Th>
                  <Th align="end">Won</Th>
                  <Th align="end">Conversion</Th>
                  <Th align="end">Earned</Th>
                  <Th align="end">Outstanding</Th>
                </tr>
              </thead>
              <tbody>
                {partners.map((row) => (
                  <tr key={row.partner} className="border-b border-[var(--hairline)] last:border-0">
                    <Td>{row.partner}</Td>
                    <Td align="end" figure>
                      {row.leads}
                    </Td>
                    <Td align="end" figure>
                      {row.won}
                    </Td>
                    <Td align="end" figure>
                      {row.leads ? `${Math.round((row.won / row.leads) * 100)}%` : "—"}
                    </Td>
                    <Td align="end" figure>
                      {aed(row.earned)}
                    </Td>
                    <Td align="end" figure>
                      {aed(row.outstanding)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ---------- the leads ---------- */}
      <section className="mt-9">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="eyebrow">Enquiries</h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, phone, partner"
              className="w-56 rounded-full border border-[var(--hairline)] bg-[var(--surface-raised)] px-4 py-1.5 text-[11.5px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as LeadStatus | "all")}
              className="rounded-full border border-[var(--hairline)] bg-[var(--surface-raised)] px-4 py-1.5 text-[11.5px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            >
              <option value="all">All statuses</option>
              {LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="mt-6 rounded-xl border border-[var(--hairline)] px-5 py-10 text-center text-[12.5px] text-[var(--text-muted)]">
            {leads.length === 0
              ? "No enquiries yet. Once a visitor submits the form it lands here."
              : "Nothing matches that filter."}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--hairline)]">
            <table className="w-full min-w-[1180px] text-[12px]">
              <thead>
                <tr className="border-b border-[var(--hairline)] bg-[var(--surface-sunken)]">
                  <Th>Received</Th>
                  <Th>Enquiry</Th>
                  <Th>Service</Th>
                  <Th>Status</Th>
                  <Th>Partner</Th>
                  <Th align="end">Commission</Th>
                  <Th align="center">Paid</Th>
                  <Th>Internal notes</Th>
                </tr>
              </thead>
              <tbody>
                {visible.map((lead) => (
                  <tr
                    key={lead.id}
                    className={[
                      "border-b border-[var(--hairline)] align-top last:border-0",
                      pending.has(lead.id) ? "opacity-60" : "",
                    ].join(" ")}
                  >
                    <Td>
                      <span className="figure whitespace-nowrap text-[var(--text-muted)]">
                        {shortDate(lead.created_at)}
                      </span>
                    </Td>

                    <Td>
                      <span className="block font-medium text-[var(--text-primary)]">
                        {lead.full_name}
                      </span>
                      <a
                        href={`tel:${lead.phone}`}
                        className="figure mt-0.5 block text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)]"
                      >
                        {lead.phone}
                      </a>
                      {lead.email && (
                        <a
                          href={`mailto:${lead.email}`}
                          className="mt-0.5 block max-w-[16ch] truncate text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)]"
                        >
                          {lead.email}
                        </a>
                      )}
                      {lead.notes && (
                        <span className="mt-1 block max-w-[24ch] text-[11px] leading-relaxed text-[var(--text-muted)]">
                          {lead.notes}
                        </span>
                      )}
                    </Td>

                    <Td>
                      <span className="whitespace-nowrap text-[var(--text-secondary)]">
                        {lead.service}
                      </span>
                      <span className="figure mt-0.5 block text-[10.5px] uppercase text-[var(--text-muted)]">
                        {lead.locale}
                      </span>
                    </Td>

                    <Td>
                      <select
                        value={lead.status}
                        onChange={(event) => patch(lead.id, { status: event.target.value })}
                        className="rounded-md border border-[var(--hairline-strong)] bg-[var(--surface-raised)] px-2 py-1 text-[11.5px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                      >
                        {LEAD_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      {lead.referred_at && (
                        <span className="figure mt-1 block whitespace-nowrap text-[10.5px] text-[var(--text-muted)]">
                          ref. {shortDate(lead.referred_at)}
                        </span>
                      )}
                    </Td>

                    <Td>
                      <BlurInput
                        value={lead.partner ?? ""}
                        placeholder="—"
                        onCommit={(value) => patch(lead.id, { partner: value })}
                        className="w-32"
                      />
                    </Td>

                    <Td align="end">
                      <BlurInput
                        value={lead.commission_aed === null ? "" : String(lead.commission_aed)}
                        placeholder="—"
                        inputMode="decimal"
                        onCommit={(value) => patch(lead.id, { commission_aed: value })}
                        className="w-24 text-end"
                        figure
                      />
                    </Td>

                    <Td align="center">
                      <input
                        type="checkbox"
                        checked={Boolean(lead.commission_paid_at)}
                        onChange={(event) =>
                          patch(lead.id, { commission_paid: event.target.checked })
                        }
                        aria-label={`Commission paid for ${lead.full_name}`}
                        className="h-4 w-4 accent-[var(--accent-solid)]"
                      />
                      {lead.commission_paid_at && (
                        <span className="figure mt-1 block whitespace-nowrap text-[10.5px] text-[var(--text-muted)]">
                          {shortDate(lead.commission_paid_at)}
                        </span>
                      )}
                    </Td>

                    <Td>
                      <BlurInput
                        value={lead.internal_notes ?? ""}
                        placeholder="—"
                        onCommit={(value) => patch(lead.id, { internal_notes: value })}
                        className="w-44"
                      />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

/* ---------------------------------------------------------------------------
   Pieces
   ------------------------------------------------------------------------ */

function Tile({
  label,
  value,
  note,
  lit,
}: {
  label: string;
  value: string;
  note: string;
  lit?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border p-5",
        lit
          ? "border-[var(--glass-border-lit)] bg-[var(--accent-wash)]"
          : "border-[var(--hairline)] bg-[var(--surface-raised)]",
      ].join(" ")}
    >
      <span className="eyebrow">{label}</span>
      <span className="mt-2.5 block font-[family-name:var(--font-body)] text-[26px] font-bold leading-none tracking-[-0.02em] text-[var(--text-primary)]">
        {value}
      </span>
      <p className="mt-2.5 text-[11px] leading-relaxed text-[var(--text-muted)]">{note}</p>
    </div>
  );
}

/**
 * Commits on blur or Enter rather than on every keystroke — one PATCH per
 * edit instead of one per character, and the operator can still abandon a
 * half-typed value with Escape.
 */
function BlurInput({
  value,
  placeholder,
  onCommit,
  className = "",
  inputMode,
  figure,
}: {
  value: string;
  placeholder?: string;
  onCommit: (value: string) => void;
  className?: string;
  inputMode?: "decimal";
  figure?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? value;

  const commit = () => {
    if (draft === null) return;
    setDraft(null);
    if (draft !== value) onCommit(draft);
  };

  return (
    <input
      value={shown}
      placeholder={placeholder}
      inputMode={inputMode}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setDraft(null);
          event.currentTarget.blur();
        }
      }}
      className={[
        figure ? "figure" : "",
        "rounded-md border border-transparent bg-transparent px-2 py-1 text-[11.5px] text-[var(--text-primary)] outline-none transition-colors duration-200 hover:border-[var(--hairline)] focus:border-[var(--accent)] focus:bg-[var(--surface-raised)]",
        className,
      ].join(" ")}
    />
  );
}

/* Written out in full rather than interpolated: Tailwind scans source text
   for class names, so a `text-${align}` template produces a class that is
   never generated and an alignment that silently does nothing. */
const ALIGN = {
  start: "text-start",
  end: "text-end",
  center: "text-center",
} as const;

type Align = keyof typeof ALIGN;

function Th({ children, align = "start" }: { children: ReactNode; align?: Align }) {
  return (
    <th
      className={`px-3 py-2.5 ${ALIGN[align]} text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "start",
  figure,
}: {
  children: ReactNode;
  align?: Align;
  figure?: boolean;
}) {
  return (
    <td
      className={`px-3 py-3 ${ALIGN[align]} ${figure ? "figure" : ""} text-[var(--text-secondary)]`}
    >
      {children}
    </td>
  );
}
