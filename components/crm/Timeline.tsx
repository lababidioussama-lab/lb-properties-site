"use client";

import { useEffect, useState } from "react";
import { ACTIVITY_KINDS, type ActivityKind, type CrmActivity } from "@/lib/crm";
import { api, stamp, INPUT, BTN, Label, Empty } from "./shared";

const KIND_LABEL: Record<ActivityKind, string> = {
  note: "Note",
  call: "Call",
  whatsapp: "WhatsApp",
  email: "Email",
  meeting: "Meeting",
  stage: "Stage change",
  system: "System",
};

/** Activity history for one lead or one contact, with a quick log form. */
export function Timeline({ leadId, contactId, userName, refreshKey = 0 }: {
  leadId?: string;
  contactId?: string;
  userName: (id: string | null) => string;
  refreshKey?: number;
}) {
  const [items, setItems] = useState<CrmActivity[]>([]);
  const [kind, setKind] = useState<ActivityKind>("call");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const query = leadId ? `lead_id=${leadId}` : `contact_id=${contactId}`;

  useEffect(() => {
    let live = true;
    api<{ activities: CrmActivity[] }>("GET", "activities", undefined, query).then((r) => {
      if (live) setItems(r.activities ?? []);
    });
    return () => { live = false; };
  }, [query, refreshKey]);

  async function add() {
    if (!body.trim()) return;
    setBusy(true);
    const r = await api<{ activity: CrmActivity }>("POST", "activities", {
      kind, body, lead_id: leadId ?? null, contact_id: contactId ?? null,
    });
    setBusy(false);
    if (r.activity) {
      setItems((all) => [r.activity as CrmActivity, ...all]);
      setBody("");
    }
  }

  return (
    <section>
      <Label>Activity</Label>
      <div className="flex gap-2">
        <select value={kind} onChange={(e) => setKind(e.target.value as ActivityKind)} className={`${INPUT} !w-32`}>
          {ACTIVITY_KINDS.filter((k) => k !== "stage" && k !== "system").map((k) => (
            <option key={k} value={k}>{KIND_LABEL[k]}</option>
          ))}
        </select>
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="What happened?"
          className={INPUT}
        />
        <button onClick={add} disabled={busy || !body.trim()} className={BTN}>Log</button>
      </div>

      {items.length === 0 ? (
        <Empty>No activity yet.</Empty>
      ) : (
        <ol className="mt-4 space-y-3 border-s border-[var(--hairline)] ps-4">
          {items.map((a) => (
            <li key={a.id} className="relative">
              <span className="absolute -start-[21px] top-1.5 h-2 w-2 rounded-full bg-[var(--accent)]" />
              <div className="text-[11px] text-[var(--text-muted)]">
                {KIND_LABEL[a.kind]} · {userName(a.user_id)} · {stamp(a.created_at)}
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-[13px] text-[var(--text-primary)]">{a.body}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
