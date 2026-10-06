"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { api, Card, CardHead, Chip, Empty, Segmented, stamp } from "./shared";
import { CountText } from "./Motion";

interface Report {
  totals: { wrongPasswords: number; wrongCodes: number; refused: number; blocked: number; addresses: number; lockedNow: number };
  lockedNow: string[];
  addresses: { ip: string; country: string | null; fails: number; codes: number; accounts: string[]; last: string }[];
  targets: { email: string; known: boolean; passwords: number; codes: number; last: string }[];
  events: { id: string; at: string; action: string; account: string | null; name: string | null; ip: string | null; place: string | null; agent: string | null; reason: string | null }[];
  alerts: { at: string; title: string }[];
}

const PERIODS = [{ id: "1", label: "24 hours" }, { id: "7", label: "7 days" }, { id: "30", label: "30 days" }] as const;
const WHAT: Record<string, { label: string; tone: "bad" | "warn" | "ok" | "neutral" }> = {
  login_failed: { label: "Wrong password", tone: "warn" },
  otp_failed: { label: "Wrong emailed code", tone: "bad" },
  blocked_address: { label: "Address blocked", tone: "bad" },
  docs_denied: { label: "Refused: Company documents", tone: "bad" },
  ds_denied: { label: "Refused: DB Search", tone: "warn" },
  login: { label: "Signed in", tone: "ok" },
  docs_login: { label: "Opened Company documents", tone: "ok" },
  ds_login: { label: "Opened DB Search", tone: "ok" },
};
const device = (ua: string | null) => {
  if (!ua) return "";
  const b = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : /curl|python|bot|http/i.test(ua) ? "A script, not a browser" : "Browser";
  const o = /iPhone|iPad/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "";
  return o ? `${b} on ${o}` : b;
};

/** Every refused sign-in and who is behind it. Admin only. */
export function SecurityView() {
  const [days, setDays] = useState<(typeof PERIODS)[number]["id"]>("7");
  const [only, setOnly] = useState<"bad" | "all">("bad");
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const load = () => void api<Report>("GET", "security", undefined, `days=${days}`).then((r) => {
      if (!live) return;
      if (r.ok) { setData(r as Report); setError(null); } else setError(r.error ?? "unknown");
    });
    load();
    const t = window.setInterval(load, 60_000);
    return () => { live = false; window.clearInterval(t); };
  }, [days]);

  if (error) return <Card className="p-4 text-[13px] text-[var(--bad)]">Could not load security events ({error}).</Card>;
  if (!data) return <div className="panel h-64 animate-pulse" />;

  const t = data.totals;
  const stolen = data.targets.filter((x) => x.codes > 0);
  const calm = t.wrongCodes === 0 && t.blocked === 0 && t.wrongPasswords < 5;
  const kpis = [
    { label: "Wrong passwords", value: t.wrongPasswords, alert: t.wrongPasswords >= 5 },
    { label: "Wrong emailed codes", value: t.wrongCodes, alert: t.wrongCodes > 0 },
    { label: "Addresses blocked", value: t.blocked, alert: t.blocked > 0 },
    { label: "Refused by rule", value: t.refused, alert: false },
  ];
  const events = data.events.filter((e) => only === "all" || WHAT[e.action]?.tone !== "ok");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={days} options={PERIODS.map((p) => ({ ...p }))} onChange={setDays} />
        <span className="text-[12px] text-[var(--text-muted)]">Refreshes every minute. Alerts also go to the admin email.</span>
      </div>

      <Card className={`flex items-start gap-3 p-5 ${calm ? "" : "!border-[var(--bad-bd)]"}`}>
        {calm ? <ShieldCheck size={20} className="mt-0.5 shrink-0 text-[var(--ok)]" /> : <ShieldAlert size={20} className="mt-0.5 shrink-0 text-[var(--bad)]" />}
        <div className="min-w-0 text-[13.5px] leading-relaxed">
          <div className="font-bold text-[var(--text-primary)]">
            {stolen.length ? `Someone has the password of ${stolen.map((s) => s.email).join(", ")}` : calm ? "Nothing unusual" : "Sign-in attempts are being refused"}
          </div>
          <p className="mt-0.5 text-[var(--text-secondary)]">
            {stolen.length
              ? "The right password was entered and then a wrong emailed code. The code stopped them, but the password is known to someone else. Reset it now from Team."
              : calm
                ? "A few wrong passwords are normal: people mistype. Nobody has got past the password and the emailed code."
                : `${t.wrongPasswords} wrong passwords from ${t.addresses} address${t.addresses === 1 ? "" : "es"}. Nobody got in: each account pauses after 8 wrong tries and each address after 20.`}
            {t.lockedNow > 0 && <> Paused right now: <b className="text-[var(--text-primary)]">{data.lockedNow.join(", ")}</b> (15 minutes).</>}
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="px-5 py-4">
            <div className="text-[12px] font-medium text-[var(--text-secondary)]">{k.label}</div>
            <div className={`figure mt-2 text-[16px] font-semibold leading-none sm:text-[24px] ${k.alert ? "text-[var(--bad)]" : "text-[var(--accent)]"}`}><CountText text={String(k.value)} /></div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHead title="Addresses behind the attempts" count="worst first" />
          {data.addresses.length === 0 ? <Empty icon={<ShieldCheck size={18} />}>No refused sign-ins in this period.</Empty> : (
            <ul>
              {data.addresses.map((a) => (
                <li key={a.ip} className="border-b border-[var(--hairline-soft)] px-5 py-3 text-[13px] last:border-0">
                  <div className="flex items-baseline gap-3">
                    <span className="figure min-w-0 flex-1 truncate font-semibold">{a.ip}</span>
                    <Chip tone={a.fails >= 20 || a.codes > 0 ? "bad" : a.fails >= 5 ? "warn" : "neutral"}>{a.fails} refused</Chip>
                  </div>
                  <div className="mt-1 text-[12px] text-[var(--text-secondary)]">
                    {a.country ?? "Location unknown"} · last {stamp(a.last)}
                    {a.accounts.length > 0 && <> · tried {a.accounts.length > 1 ? `${a.accounts.length} accounts: ` : ""}{a.accounts.join(", ")}</>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHead title="Accounts they aimed at" count="wrong code = password known" />
          {data.targets.length === 0 ? <Empty icon={<ShieldCheck size={18} />}>No account was targeted.</Empty> : (
            <ul>
              {data.targets.map((x) => (
                <li key={x.email} className="flex items-center gap-3 border-b border-[var(--hairline-soft)] px-5 py-3 text-[13px] last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{x.email}</div>
                    <div className="text-[12px] text-[var(--text-secondary)]">{x.known ? "A real account" : "No such account: a guess"} · last {stamp(x.last)}</div>
                  </div>
                  {x.passwords > 0 && <Chip tone={x.passwords >= 5 ? "warn" : "neutral"}>{x.passwords} wrong password{x.passwords === 1 ? "" : "s"}</Chip>}
                  {x.codes > 0 && <Chip tone="bad">{x.codes} wrong code{x.codes === 1 ? "" : "s"}</Chip>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHead title="Sign-in events" count={`${events.length} shown`}
          action={<Segmented value={only} options={[{ id: "bad", label: "Refused only" }, { id: "all", label: "Everything" }]} onChange={setOnly} />} />
        {events.length === 0 ? <Empty icon={<ShieldCheck size={18} />}>Nothing to show.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[12.5px]">
              <thead><tr className="ds-label border-b border-[var(--hairline)]">
                {["When", "What", "Account", "From", "Address", "Device"].map((h) => <th key={h} className="px-5 py-2.5 font-normal">{h}</th>)}
              </tr></thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-b border-[var(--hairline-soft)] last:border-0">
                    <td className="figure whitespace-nowrap px-5 py-2.5 text-[var(--text-muted)]">{stamp(e.at)}</td>
                    <td className="px-5 py-2.5"><Chip tone={WHAT[e.action]?.tone ?? "neutral"}>{WHAT[e.action]?.label ?? e.action}</Chip></td>
                    <td className="max-w-[220px] truncate px-5 py-2.5">{e.name ?? e.account ?? "Unknown"}</td>
                    <td className="px-5 py-2.5 text-[var(--text-secondary)]">{e.place ?? "Unknown"}</td>
                    <td className="figure px-5 py-2.5 text-[var(--text-secondary)]">{e.ip ?? ""}</td>
                    <td className="px-5 py-2.5 text-[var(--text-secondary)]">{device(e.agent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {data.alerts.length > 0 && (
        <Card>
          <CardHead title="Alerts emailed to the admin" count={data.alerts.length} />
          <ul className="px-5 py-2">
            {data.alerts.map((a, i) => <li key={i} className="flex gap-3 py-1.5 text-[13px]"><span className="figure shrink-0 text-[var(--text-muted)]">{stamp(a.at)}</span><span>{a.title}</span></li>)}
          </ul>
        </Card>
      )}

      <Card>
        <CardHead title="How the CRM is protected" />
        <ul className="space-y-2 px-5 py-4 text-[13px] leading-relaxed text-[var(--text-secondary)]">
          <li><b className="text-[var(--text-primary)]">Two keys.</b> A password, then a code emailed to that person. A stolen password alone opens nothing.</li>
          <li><b className="text-[var(--text-primary)]">Guessing is cut off.</b> An account pauses for 15 minutes after 8 wrong passwords, an address after 20, and a code dies after 5 wrong tries.</li>
          <li><b className="text-[var(--text-primary)]">You are told.</b> Five wrong passwords on one account, a blocked address, or a wrong-code lock each send an alert to the admin email.</li>
          <li><b className="text-[var(--text-primary)]">You can shut a door at once.</b> In Access &amp; activity, block a person or press “Sign out everywhere”; it takes effect on their next click.</li>
          <li><b className="text-[var(--text-primary)]">What only you can do.</b> Use a password you use nowhere else, never share the emailed code, and reset an agent’s password the day they leave.</li>
        </ul>
      </Card>
    </div>
  );
}
