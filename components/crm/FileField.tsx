"use client";

import { useRef, useState } from "react";
import { Camera, ExternalLink, Paperclip, X } from "lucide-react";

import { shrinkImage, uploadFile } from "./shared";

/**
 * Attach a real file instead of pasting a link: an ID copy, a signed form, a
 * listing photo. On a phone it offers the camera. Photos are resized to a
 * sensible size first, which also turns an iPhone HEIC into a JPEG every
 * laptop can open. The parent stores the returned address.
 */
const pick = "inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-[var(--hairline)] px-3 text-[12.5px] font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--hairline-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-50";

export async function sendFile(file: File, kind: "doc" | "photo"): Promise<{ url?: string; error?: string }> {
  const image = file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name);
  const ready = image ? await shrinkImage(file, kind === "photo" ? 1800 : 2000) : file;
  return uploadFile(ready, kind);
}

/** One file: shows Attach, or the attached file with Open and Remove. */
export function FileField({ value, onChange, kind = "doc", label = "Attach file", disabled = false }: {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  kind?: "doc" | "photo";
  label?: string;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function chosen(file: File | undefined) {
    if (!file) return;
    setBusy(true); setError(null);
    const r = await sendFile(file, kind);
    setBusy(false);
    if (r.url) onChange(r.url); else setError(r.error ?? "Upload failed.");
    if (input.current) input.current.value = "";
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <input ref={input} type="file" hidden accept={kind === "photo" ? "image/*" : "image/*,application/pdf"} onChange={(e) => void chosen(e.target.files?.[0])} />
      {value ? (
        <>
          <a href={value} target="_blank" rel="noopener noreferrer" className={pick}><ExternalLink size={13} /> Open</a>
          {!disabled && <button type="button" onClick={() => onChange(null)} aria-label="Remove file" className={`${pick} !px-2`}><X size={13} /></button>}
        </>
      ) : (
        <button type="button" disabled={busy || disabled} onClick={() => input.current?.click()} className={pick}>
          {kind === "photo" ? <Camera size={13} /> : <Paperclip size={13} />} {busy ? "Uploading…" : label}
        </button>
      )}
      {error && <span role="alert" className="text-[12px] text-[var(--bad)]">{error}</span>}
    </span>
  );
}

/** Several photos at once, from the gallery or the camera. */
export function PhotoPicker({ onAdd, disabled = false }: { onAdd: (urls: string[]) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function chosen(files: FileList | null) {
    const list = [...(files ?? [])].slice(0, 12);
    if (!list.length) return;
    setError(null);
    const urls: string[] = [];
    for (let i = 0; i < list.length; i++) {
      setBusy(`Uploading ${i + 1} of ${list.length}…`);
      const r = await sendFile(list[i], "photo");
      if (r.url) urls.push(r.url); else { setError(r.error ?? "One photo could not be uploaded."); break; }
    }
    setBusy(null);
    if (urls.length) onAdd(urls);
    if (input.current) input.current.value = "";
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <input ref={input} type="file" hidden multiple accept="image/*" onChange={(e) => void chosen(e.target.files)} />
      <button type="button" disabled={!!busy || disabled} onClick={() => input.current?.click()} className={pick}><Camera size={13} /> {busy ?? "Add photos"}</button>
      {error && <span role="alert" className="text-[12px] text-[var(--bad)]">{error}</span>}
    </span>
  );
}
