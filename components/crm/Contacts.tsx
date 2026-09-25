"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, MessageCircle, Phone } from "lucide-react";
import { CONTACT_KINDS, CONTACT_ROLES, CONTACT_STATUSES, CONTACT_STATUS_LABEL, CONTACT_STATUS_TONE, type CrmListing, type CrmContact, type CrmLead, type CrmProperty, type CrmTask, type CrmUser } from "@/lib/crm";
import { api, money, shortDate, whatsapp, STAGE_STYLE, INPUT, BTN, BTN_GHOST, Label, Card, SidePanel, Empty } from "./shared";
import { Timeline } from "./Timeline";
import { NewTask, TaskRow } from "./TaskList";
import { serviceLabel } from "./LeadPanel";

export function ContactsView({ contacts, isAdmin, users, userName, onContact, onOpen }: {
  contacts: CrmContact[];
  isAdmin: boolean;
  users: CrmUser[];
  userName: (id: string | null) => string;
  onContact: (c: CrmContact) => void;
  onOpen: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", kind: "buyer", owner_id: "" });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? contacts.filter((c) => `${c.full_name} ${c.phone ?? ""} ${c.email ?? ""}`.toLowerCase().includes(q)) : contacts;
  }, [contacts, query]);

  async function create() {
    const r = await api<{ contact: CrmContact }>("POST", "contacts", { ...form, owner_id: form.owner_id || null });
    if (r.contact) {
      onContact(r.contact as CrmContact);
      setForm({ full_name: "", phone: "", email: "", kind: "buyer", owner_id: "" });
      setAdding(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search contacts" className={`${INPUT} ps-8`} />
        </div>
        <button onClick={() => setAdding((v) => !v)} className={BTN}><Plus size={14} /> New contact</button>
      </div>

      {adding && (
        <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <input placeholder="Full name *" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={INPUT} />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={INPUT} />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={INPUT} />
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className={INPUT}>
            {CONTACT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <div className="flex gap-2">
            {isAdmin && (
              <select value={form.owner_id} onChange={(e) => setForm({ ...form, owner_id: e.target.value })} className={INPUT}>
                <option value="">Me</option>
                {users.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            )}
            <button onClick={create} disabled={!form.full_name.trim()} className={BTN}>Save</button>
          </div>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[var(--hairline)] text-start text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {["Name", "Type", "Status", "Phone", "Email", "Agent", "Added"].map((h) => <th key={h} className="px-4 py-3 text-start font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} onClick={() => onOpen(c.id)} className="cursor-pointer border-b border-[var(--hairline)] last:border-0 hover:bg-[var(--surface)]">
                <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{c.full_name}</td>
                <td className="px-4 py-3 capitalize text-[var(--text-secondary)]">{c.kind}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${CONTACT_STATUS_TONE[c.status]}`}>{CONTACT_STATUS_LABEL[c.status]}</span></td>
                <td className="figure px-4 py-3 text-[var(--text-secondary)]">{c.phone ?? "—"}</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{c.email ?? "—"}</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{userName(c.owner_id)}</td>
                <td className="px-4 py-3 text-[var(--text-muted)]">{shortDate(c.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <Empty>No contacts yet. Save one from a lead, or add one above.</Empty>}
      </Card>
    </div>
  );
}

export function ContactPanel({ contact, listings, leads, tasks, users, isAdmin, userName, onContact, onTask, onRemoveTask, onOpenLead, onClose }: {
  contact: CrmContact;
  listings: CrmListing[];
  leads: CrmLead[];
  tasks: CrmTask[];
  users: CrmUser[];
  isAdmin: boolean;
  userName: (id: string | null) => string;
  onContact: (c: CrmContact) => void;
  onTask: (t: CrmTask) => void;
  onRemoveTask: (id: string) => void;
  onOpenLead: (id: string) => void;
  onClose: () => void;
}) {
  const [properties, setProperties] = useState<CrmProperty[]>([]);
  const [prop, setProp] = useState({ relation: "wants", community: "", building: "", unit: "", bedrooms: "", price_aed: "" });

  useEffect(() => {
    let live = true;
    api<{ properties: CrmProperty[] }>("GET", "properties", undefined, `contact_id=${contact.id}`).then((r) => {
      if (live) setProperties(r.properties ?? []);
    });
    return () => { live = false; };
  }, [contact.id]);

  async function save(field: string, value: string) {
    if (value === ((contact as unknown as Record<string, unknown>)[field] ?? "")) return;
    const r = await api<{ contact: CrmContact }>("PATCH", "contacts", { id: contact.id, [field]: value });
    if (r.contact) onContact(r.contact as CrmContact);
  }

  async function addProperty() {
    const r = await api<{ property: CrmProperty }>("POST", "properties", { ...prop, contact_id: contact.id });
    if (r.property) {
      setProperties((all) => [...all, r.property as CrmProperty]);
      setProp({ relation: prop.relation, community: "", building: "", unit: "", bedrooms: "", price_aed: "" });
    }
  }

  async function removeProperty(id: string) {
    const r = await api("DELETE", "properties", undefined, `id=${id}`);
    if (r.ok) setProperties((all) => all.filter((p) => p.id !== id));
  }

  // Available listings that fit what this client wants: same community or bedrooms, within budget +15%.
  const wants = properties.filter((p) => p.relation === "wants");
  const matches = listings.filter((l) => l.status === "available" && wants.some((w) => {
    const area = (w.community ?? "").trim().toLowerCase();
    const sameArea = !!area && (l.community ?? "").toLowerCase().includes(area);
    const sameBeds = !!w.bedrooms && (l.bedrooms ?? "").toLowerCase() === w.bedrooms.toLowerCase();
    const inBudget = !w.price_aed || !l.price_aed || Number(l.price_aed) <= Number(w.price_aed) * 1.15;
    return (sameArea || sameBeds) && inBudget;
  }));

  const text = (field: keyof CrmContact, label: string) => (
    <label><Label>{label}</Label>
      <input defaultValue={(contact[field] as string | null) ?? ""} onBlur={(e) => save(field, e.target.value)} className={INPUT} />
    </label>
  );

  return (
    <SidePanel
      title={contact.full_name}
      subtitle={<span className="flex items-center gap-2 capitalize"><span className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${CONTACT_STATUS_TONE[contact.status]}`}>{CONTACT_STATUS_LABEL[contact.status]}</span> {contact.kind} · agent {userName(contact.owner_id)}</span>}
      onClose={onClose}
    >
      {contact.phone && (
        <div className="flex gap-2">
          <a href={whatsapp(contact.phone)} target="_blank" rel="noopener noreferrer" className={BTN_GHOST}><MessageCircle size={14} /> WhatsApp</a>
          <a href={`tel:${contact.phone}`} className={BTN_GHOST}><Phone size={14} /> <span className="figure">{contact.phone}</span></a>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {text("full_name", "Name")}
        {text("phone", "Phone")}
        {text("email", "Email")}
        {text("nationality", "Nationality")}
        <label><Label>Type</Label>
          <select defaultValue={contact.kind} onChange={(e) => save("kind", e.target.value)} className={INPUT}>
            {CONTACT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
        <label><Label>Status</Label>
          <select defaultValue={contact.status} onChange={(e) => save("status", e.target.value)} className={INPUT}>
            {CONTACT_STATUSES.map((s) => <option key={s} value={s}>{CONTACT_STATUS_LABEL[s]}</option>)}
          </select>
        </label>
        {isAdmin && (
          <label><Label>Agent</Label>
            <select defaultValue={contact.owner_id ?? ""} onChange={(e) => save("owner_id", e.target.value)} className={INPUT}>
              <option value="">Unassigned</option>
              {users.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </label>
        )}
      </div>
      <div>
        <Label>Roles</Label>
        <div className="flex flex-wrap gap-1.5">
          {CONTACT_ROLES.map((role) => {
            const active = contact.roles.includes(role);
            return (
              <button
                key={role}
                onClick={() => {
                  const roles = active ? contact.roles.filter((r) => r !== role) : [...contact.roles, role];
                  void api<{ contact: CrmContact }>("PATCH", "contacts", { id: contact.id, roles }).then((r) => r.contact && onContact(r.contact as CrmContact));
                }}
                className={`rounded-full border px-2.5 py-1 text-[11.5px] transition-colors ${active ? "border-[var(--glass-border-lit)] bg-[var(--accent-wash)] text-[var(--accent)]" : "border-[var(--hairline)] text-[var(--text-muted)] hover:border-[var(--hairline-strong)]"}`}
              >
                {role}
              </button>
            );
          })}
        </div>
      </div>

      <label className="block"><Label>Notes</Label>
        <textarea rows={3} defaultValue={contact.notes ?? ""} onBlur={(e) => save("notes", e.target.value)} className={`${INPUT} resize-none`} />
      </label>

      <section>
        <Label>Properties</Label>
        {properties.length > 0 && (
          <ul className="mb-3 space-y-1.5">
            {properties.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-lg border border-[var(--hairline)] px-3 py-2 text-[12.5px]">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${p.relation === "owns" ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700"}`}>{p.relation}</span>
                <span className="flex-1 text-[var(--text-primary)]">
                  {[p.community, p.building, p.unit && `Unit ${p.unit}`, p.bedrooms].filter(Boolean).join(" · ") || "—"}
                </span>
                <span className="figure text-[var(--text-secondary)]">{money(p.price_aed)}</span>
                <button onClick={() => removeProperty(p.id)} aria-label="Remove" className="text-[var(--text-muted)] hover:text-[#c0392b]"><Trash2 size={13} /></button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-3 gap-2">
          <select value={prop.relation} onChange={(e) => setProp({ ...prop, relation: e.target.value })} className={INPUT}>
            <option value="wants">Wants</option>
            <option value="owns">Owns</option>
          </select>
          <input placeholder="Community" value={prop.community} onChange={(e) => setProp({ ...prop, community: e.target.value })} className={INPUT} />
          <input placeholder="Building" value={prop.building} onChange={(e) => setProp({ ...prop, building: e.target.value })} className={INPUT} />
          <input placeholder="Unit" value={prop.unit} onChange={(e) => setProp({ ...prop, unit: e.target.value })} className={INPUT} />
          <input placeholder="Beds" value={prop.bedrooms} onChange={(e) => setProp({ ...prop, bedrooms: e.target.value })} className={INPUT} />
          <input placeholder="Price / budget AED" type="number" value={prop.price_aed} onChange={(e) => setProp({ ...prop, price_aed: e.target.value })} className={INPUT} />
        </div>
        <button onClick={addProperty} disabled={!prop.community && !prop.building} className={`${BTN} mt-2`}><Plus size={14} /> Add property</button>
      </section>

      {wants.length > 0 && (
        <section>
          <Label>Matching listings ({matches.length})</Label>
          {matches.length === 0 ? (
            <p className="text-[12.5px] text-[var(--text-muted)]">No available listing fits yet. It will show here as soon as one is added.</p>
          ) : (
            <ul className="space-y-1.5">
              {matches.slice(0, 8).map((l) => (
                <li key={l.id} className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-[12.5px]">
                  <span className="text-[var(--text-primary)]">{l.title} <span className="text-[var(--text-muted)]">· {[l.bedrooms, l.community].filter(Boolean).join(", ")}</span></span>
                  <span className="figure text-[var(--text-secondary)]">{money(l.price_aed)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {leads.length > 0 && (
        <section>
          <Label>Deals</Label>
          <ul className="space-y-1.5">
            {leads.map((l) => (
              <li key={l.id}>
                <button onClick={() => onOpenLead(l.id)} className="flex w-full items-center justify-between rounded-lg border border-[var(--hairline)] px-3 py-2 text-[12.5px] hover:border-[var(--accent)]">
                  <span className="text-[var(--text-primary)]">{serviceLabel(l.service)} · {shortDate(l.created_at)}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] ${STAGE_STYLE[l.stage]}`}>{l.stage}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <Label>Tasks</Label>
        <NewTask users={users} isAdmin={isAdmin} link={{ contact_id: contact.id }} onCreated={onTask} />
        <ul className="mt-2">
          {tasks.map((t) => <TaskRow key={t.id} task={t} onChange={onTask} onRemove={onRemoveTask} userName={userName} showAssignee={isAdmin} />)}
        </ul>
      </section>

      <Timeline contactId={contact.id} userName={userName} />
    </SidePanel>
  );
}
