"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { CrmTemplate } from "@/lib/crm";
import { INPUT, BTN, Card, Empty } from "./shared";

export function TemplatesView({ templates, isAdmin, onCreate, onUpdate, onRemove }: {
  templates: CrmTemplate[];
  isAdmin: boolean;
  onCreate: (body: { name: string; body: string }) => Promise<unknown>;
  onUpdate: (id: string, patch: { name?: string; body?: string }) => Promise<unknown>;
  onRemove: (id: string) => Promise<unknown>;
}) {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");

  return (
    <div className="space-y-4">
      <p className="text-[12.5px] text-[var(--text-muted)]">
        Use <code className="figure text-[var(--text-secondary)]">{"{name}"}</code> for the client&apos;s first name and{" "}
        <code className="figure text-[var(--text-secondary)]">{"{agent}"}</code> for the agent. Agents send these from any lead with one click.
      </p>

      {isAdmin && (
        <Card className="space-y-2 p-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name, e.g. Price drop" className={INPUT} />
          <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Hi {name}, …" className={`${INPUT} resize-none`} />
          <button
            onClick={async () => { await onCreate({ name, body }); setName(""); setBody(""); }}
            disabled={!name.trim() || !body.trim()}
            className={BTN}
          >
            <Plus size={14} /> Add template
          </button>
        </Card>
      )}

      {templates.length === 0 ? <Card><Empty>No templates yet.</Empty></Card> : (
        <div className="grid gap-3 md:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-center gap-2">
                <input
                  defaultValue={t.name}
                  disabled={!isAdmin}
                  onBlur={(e) => e.target.value !== t.name && onUpdate(t.id, { name: e.target.value })}
                  className="flex-1 bg-transparent text-[13.5px] font-semibold text-[var(--text-primary)] outline-none"
                />
                {isAdmin && (
                  <button onClick={() => window.confirm(`Delete "${t.name}"?`) && onRemove(t.id)} aria-label="Delete" className="text-[var(--text-muted)] hover:text-[#c0392b]">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <textarea
                rows={4}
                defaultValue={t.body}
                disabled={!isAdmin}
                onBlur={(e) => e.target.value !== t.body && onUpdate(t.id, { body: e.target.value })}
                className={`${INPUT} mt-2 resize-none`}
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
