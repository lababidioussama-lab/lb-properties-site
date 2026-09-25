"use client";

import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import { fillTemplate, type CrmLead, type CrmTemplate } from "@/lib/crm";
import { api, whatsapp, INPUT, BTN, Label, Card } from "./shared";

type ListKey = "all" | "new" | "unassigned" | "starred";

export function QuickWhatsAppView({ leads, templates, meName }: { leads: CrmLead[]; templates: CrmTemplate[]; meName: string }) {
  const [templateId, setTemplateId] = useState("");
  const [custom, setCustom] = useState("");
  const [list, setList] = useState<ListKey>("new");
  const [sent, setSent] = useState<{ count: number; total: number } | null>(null);

  const recipients = useMemo(() => leads.filter((l) => {
    if (!l.phone) return false;
    if (list === "new") return l.stage === "new";
    if (list === "unassigned") return !l.owner_id;
    if (list === "starred") return l.starred;
    return true;
  }), [leads, list]);

  const message = templateId ? templates.find((t) => t.id === templateId)?.body ?? "" : custom;

  async function send() {
    if (!message.trim() || recipients.length === 0) return;
    setSent({ count: 0, total: recipients.length });
    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];
      window.open(`${whatsapp(r.phone)}?text=${encodeURIComponent(fillTemplate(message, r.full_name, meName))}`, "_blank", "noopener,noreferrer");
      setSent({ count: i + 1, total: recipients.length });
      if (i < recipients.length - 1) await new Promise((res) => setTimeout(res, 400));
    }
    await api("POST", "data/campaigns", { message, recipients: recipients.length });
  }

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-[12.5px] text-[var(--text-muted)]">
        Sends the same message to every lead in a list, one WhatsApp chat at a time — your browser has to allow the pop-ups.
      </p>
      <Card className="space-y-3 p-4">
        <label><Label>Send to</Label>
          <select value={list} onChange={(e) => setList(e.target.value as ListKey)} className={INPUT}>
            <option value="new">New leads not yet contacted</option>
            <option value="unassigned">Unassigned (open pool)</option>
            <option value="starred">Starred leads</option>
            <option value="all">All leads with a phone number</option>
          </select>
          <span className="mt-1 block text-[11px] text-[var(--text-muted)]">{recipients.length} recipient{recipients.length === 1 ? "" : "s"}</span>
        </label>
        <label><Label>Template</Label>
          <select value={templateId} onChange={(e) => { setTemplateId(e.target.value); setCustom(""); }} className={INPUT}>
            <option value="">Write my own…</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        {!templateId && (
          <label><Label>Message</Label>
            <textarea rows={4} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Hi {name}, …" className={`${INPUT} resize-none`} />
          </label>
        )}
        {message && <p className="rounded-lg border border-[var(--hairline)] bg-[var(--surface)] p-3 text-[12px] text-[var(--text-secondary)]">{fillTemplate(message, "Ahmed", meName)}</p>}
        <button onClick={send} disabled={!message.trim() || recipients.length === 0} className={BTN}>
          <Send size={14} /> Send to {recipients.length}
        </button>
        {sent && <p className="text-[12px] text-[var(--text-muted)]">Opened {sent.count} of {sent.total} chats.</p>}
      </Card>
    </div>
  );
}
