"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Json } from "./shared";

/** Load + create/update/delete for one /api/crm/data/<table> resource. */
export function useTable<T extends { id: string }>(table: string, enabled = true) {
  const [rows, setRows] = useState<T[]>([]);
  const [error, setError] = useState<string | null>(null);
  const resource = `data/${table}`;

  const reload = useCallback(async () => {
    if (!enabled) return;
    const r = await api<{ rows: T[] }>("GET", resource);
    if (r.ok) setRows(r.rows ?? []);
    else setError(r.error ?? "load_failed");
  }, [resource, enabled]);

  useEffect(() => { void reload(); }, [reload]);

  async function create(body: Json): Promise<T | null> {
    setError(null);
    const r = await api<{ row: T }>("POST", resource, body);
    if (!r.row) { setError(r.error ?? "save_failed"); return null; }
    setRows((all) => [r.row as T, ...all]);
    return r.row as T;
  }

  async function update(id: string, patch: Json): Promise<T | null> {
    setError(null);
    const r = await api<{ row: T }>("PATCH", resource, { id, ...patch });
    if (!r.row) { setError(r.error ?? "save_failed"); return null; }
    setRows((all) => all.map((x) => (x.id === id ? (r.row as T) : x)));
    return r.row as T;
  }

  async function remove(id: string) {
    const r = await api("DELETE", resource, undefined, `id=${id}`);
    if (r.ok) setRows((all) => all.filter((x) => x.id !== id));
  }

  return { rows, error, reload, create, update, remove };
}

export type Table<T extends { id: string }> = ReturnType<typeof useTable<T>>;
