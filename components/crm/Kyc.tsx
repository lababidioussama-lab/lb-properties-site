"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, ExternalLink } from "lucide-react";
import { kycMissing, kycStatusOf, PAYMENT_METHODS, PAYMENT_METHOD_LABEL, type CrmContact, type CrmKyc } from "@/lib/crm";
import { INPUT, BTN, BTN_GHOST, Label, stamp } from "./shared";
import type { Table } from "./useTable";

export const KYC_TONE: Record<ReturnType<typeof kycStatusOf>, string> = {
  missing: "bg-zinc-100 text-zinc-600",
  incomplete: "bg-amber-50 text-amber-700",
  complete: "bg-sky-50 text-sky-700",
  approved: "bg-emerald-50 text-emerald-700",
};
export const KYC_LABEL: Record<ReturnType<typeof kycStatusOf>, string> = {
  missing: "No KYC", incomplete: "KYC incomplete", complete: "KYC complete", approved: "KYC approved",
};

export function KycBadge({ file }: { file: CrmKyc | null | undefined }) {
  const s = kycStatusOf(file);
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${KYC_TONE[s]}`}>{KYC_LABEL[s]}</span>;
}

type Form = Partial<Record<keyof CrmKyc, unknown>>;

/** Client due-diligence file (UAE AML): identity, PEP & sanctions, source of funds, risk. */
export function KycSection({ contact, t, isAdmin, userName }: { contact: CrmContact; t: Table<CrmKyc>; isAdmin: boolean; userName: (id: string | null) => string }) {
  const file = t.rows.find((k) => k.contact_id === contact.id) ?? null;
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Form>(() => file ?? { party_type: "individual", legal_name: contact.full_name, nationality: contact.nationality, sanctions_result: "pending" });
  const [saved, setSaved] = useState<string | null>(null);
  // The file may load after the panel opens.
  useEffect(() => { if (file) setF(file); }, [file?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: keyof CrmKyc) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value || null });
  const status = kycStatusOf(file);
  const preview = kycMissing(f as Partial<CrmKyc>);

  async function save(extra: Form = {}) {
    const body = { ...f, ...extra };
    const r = file ? await t.update(file.id, body) : await t.create({ ...body, contact_id: contact.id });
    if (r) { setF(r); setSaved(kycMissing(r).length ? "Saved — still incomplete." : "Saved — file complete."); setTimeout(() => setSaved(null), 3000); }
  }

  const date = (k: keyof CrmKyc, label: string) => (
    <label><Label>{label}</Label><input type="date" value={(f[k] as string) ?? ""} onChange={set(k)} className={INPUT} /></label>
  );
  const text = (k: keyof CrmKyc, label: string, span?: boolean) => (
    <label className={span ? "sm:col-span-2" : ""}><Label>{label}</Label><input value={(f[k] as string) ?? ""} onChange={set(k)} className={INPUT} /></label>
  );

  return (
    <section className="rounded-xl border border-[var(--hairline)] bg-white p-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center gap-2">
        {status === "approved" || status === "complete" ? <ShieldCheck size={17} className="text-emerald-600" /> : <ShieldAlert size={17} className="text-amber-600" />}
        <span className="text-[13.5px] font-semibold">KYC / AML file</span>
        <KycBadge file={file} />
        <button onClick={() => setOpen((v) => !v)} className={`${BTN_GHOST} ms-auto !h-9`}>{open ? "Close" : file ? "Open file" : "Start KYC"}</button>
      </div>
      {!open && file && kycMissing(file).length > 0 && (
        <p className="mt-2 text-[12px] text-amber-700">Missing: {kycMissing(file).join(", ")}</p>
      )}
      {!open && file?.approved_at && <p className="mt-2 text-[12px] text-[var(--text-muted)]">Approved by {userName(file.approved_by)} · {stamp(file.approved_at)}</p>}

      {open && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label><Label>Client type</Label>
              <select value={(f.party_type as string) ?? "individual"} onChange={set("party_type")} className={INPUT}>
                <option value="individual">Individual</option><option value="company">Company</option>
              </select>
            </label>
            {text("legal_name", "Full legal name (as on ID)")}
            {f.party_type === "company" ? (
              <>
                {text("trade_license_no", "Trade licence no.")}
                {date("trade_license_expiry", "Trade licence expiry")}
                <label className="sm:col-span-2"><Label>Beneficial owners (UBO) — names, % held</Label><textarea rows={2} value={(f.ubo_details as string) ?? ""} onChange={set("ubo_details")} className={`${INPUT} resize-none`} /></label>
              </>
            ) : (
              <>
                {text("nationality", "Nationality")}
                {date("date_of_birth", "Date of birth")}
                {text("emirates_id_no", "Emirates ID no.")}
                {date("emirates_id_expiry", "Emirates ID expiry")}
                {text("passport_no", "Passport no.")}
                {date("passport_expiry", "Passport expiry")}
              </>
            )}
            {text("id_doc_url", "Link to ID copy", true)}
            {text("passport_doc_url", "Link to passport copy", true)}
          </div>

          <div className="grid gap-3 rounded-lg bg-[var(--surface-sunken)] p-3 sm:grid-cols-2">
            <label><Label>Politically exposed person (PEP)?</Label>
              <select value={f.is_pep === true ? "yes" : f.is_pep === false ? "no" : ""} onChange={(e) => setF({ ...f, is_pep: e.target.value === "" ? null : e.target.value === "yes" })} className={INPUT}>
                <option value="">Not checked</option><option value="no">No</option><option value="yes">Yes — enhanced due diligence</option>
              </select>
            </label>
            <label><Label>Sanctions screening (UN / UAE lists)</Label>
              <select value={(f.sanctions_result as string) ?? "pending"} onChange={set("sanctions_result")} className={INPUT}>
                <option value="pending">Not screened</option><option value="clear">Clear — no match</option><option value="match">Possible match — escalate</option>
              </select>
            </label>
            {f.is_pep === true && text("pep_details", "PEP details", true)}
            <label className="sm:col-span-2"><Label>Source of funds</Label><input value={(f.source_of_funds as string) ?? ""} onChange={set("source_of_funds")} placeholder="e.g. salary and savings, sale of property, business income" className={INPUT} /></label>
            <label><Label>Payment method</Label>
              <select value={(f.payment_method as string) ?? ""} onChange={set("payment_method")} className={INPUT}>
                <option value="">Choose…</option>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>)}
              </select>
            </label>
            <label><Label>Risk rating</Label>
              <select value={(f.risk_rating as string) ?? ""} onChange={set("risk_rating")} className={INPUT}>
                <option value="">Choose…</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High — enhanced due diligence</option>
              </select>
            </label>
            {(f.payment_method === "cash" || f.payment_method === "crypto") && (
              <p className="text-[12px] font-medium text-amber-700 sm:col-span-2">Cash or virtual-asset payments of AED 55,000 or more need a goAML report (REAR). The deal will be flagged for the admin.</p>
            )}
          </div>

          <label className="block"><Label>Notes</Label><textarea rows={2} value={(f.notes as string) ?? ""} onChange={set("notes")} className={`${INPUT} resize-none`} /></label>

          {preview.length > 0
            ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">Still needed: {preview.join(", ")}</p>
            : <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-800">Everything required is filled in.</p>}
          {t.error && <p className="text-[12.5px] text-[#c0392b]">{t.error}</p>}
          {saved && <p className="text-[12.5px] font-medium text-emerald-700">{saved}</p>}

          <div className="flex flex-wrap gap-2">
            <button onClick={() => save()} className={BTN}>Save KYC file</button>
            {isAdmin && file && preview.length === 0 && file.status !== "approved" && (
              <button onClick={() => save({ status: "approved" })} className={BTN_GHOST}><ShieldCheck size={14} /> Approve (compliance)</button>
            )}
            {!!(f.id_doc_url || f.passport_doc_url) && (
              <a href={(f.id_doc_url || f.passport_doc_url) as string} target="_blank" rel="noopener noreferrer" className={BTN_GHOST}><ExternalLink size={14} /> Open ID copy</a>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
