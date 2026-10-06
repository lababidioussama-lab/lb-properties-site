"use client";

import { useEffect, useState } from "react";
import { Globe2 } from "lucide-react";
import { api, Card, CardHead, Empty, Segmented, stamp } from "./shared";
import { CountText } from "./Motion";

type Line = { name: string; views: number; visitors: number };
interface Report {
  days: number;
  truncated: boolean;
  totals: { views: number; visitors: number; todayViews: number; todayVisitors: number };
  series: { day: string; views: number; visitors: number }[];
  sources: Line[]; referrers: Line[]; countries: Line[]; cities: Line[]; pages: Line[]; devices: Line[]; browsers: Line[]; campaigns: Line[];
  recent: { at: string; path: string; source: string; ref: string | null; country: string | null; city: string | null; device: string; browser: string; team: boolean }[];
}

const PERIODS = [{ id: "1", label: "Today" }, { id: "7", label: "7 days" }, { id: "30", label: "30 days" }, { id: "90", label: "90 days" }] as const;
const WHERE = [{ id: "site", label: "Website" }, { id: "crm", label: "CRM" }] as const;

/** Who came to the website or the CRM, from where, and what they looked at. Admin only. */
export function VisitorsView() {
  const [days, setDays] = useState<(typeof PERIODS)[number]["id"]>("7");
  const [where, setWhere] = useState<(typeof WHERE)[number]["id"]>("site");
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setError(null);
    void api<Report>("GET", "visitors", undefined, `days=${days}&where=${where}`).then((r) => {
      if (!live) return;
      if (r.ok) setData(r as Report); else setError(r.error ?? "unknown");
    });
    return () => { live = false; };
  }, [days, where]);

  const peak = Math.max(1, ...(data?.series ?? []).map((s) => s.visitors));
  const kpis = data ? [
    { label: "Visitors today", value: data.totals.todayVisitors },
    { label: "Pages opened today", value: data.totals.todayViews },
    { label: days === "1" ? "Visitors" : `Visitors, ${days} days`, value: data.totals.visitors },
    { label: days === "1" ? "Pages opened" : `Pages opened, ${days} days`, value: data.totals.views },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={where} options={WHERE.map((w) => ({ ...w }))} onChange={setWhere} />
        <Segmented value={days} options={PERIODS.map((p) => ({ ...p }))} onChange={setDays} />
        <span className="text-[12px] text-[var(--text-muted)]">
          {where === "site" ? "People on lababidiproperties.com. The team's own visits are left out." : "Everyone who opened the CRM or its sign-in page, team included."}
        </span>
      </div>
      {error && <Card className="p-4 text-[13px] text-[var(--bad)]">Could not load visitors ({error}).</Card>}
      {data?.truncated && <Card className="p-4 text-[13px] text-[var(--warn)]">This period has more visits than one report reads, so the totals are a little low. Pick a shorter period for exact figures.</Card>}

      {!data && !error ? <div className="panel h-64 animate-pulse" /> : data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {kpis.map((k) => (
              <Card key={k.label} className="px-5 py-4">
                <div className="text-[12px] font-medium text-[var(--text-secondary)]">{k.label}</div>
                <div className="figure mt-2 whitespace-nowrap text-[16px] font-semibold leading-none text-[var(--accent)] sm:text-[24px]"><CountText text={String(k.value)} /></div>
              </Card>
            ))}
          </div>

          {data.totals.views === 0 ? (
            <Card><Empty icon={<Globe2 size={18} />}>No visits recorded for this period yet. Counting starts from the day this screen went live; earlier visits were never recorded.</Empty></Card>
          ) : (
            <>
              {data.series.length > 1 && (
                <Card>
                  <CardHead title="Visitors by day" count={`${data.totals.visitors} in ${data.days} days`} />
                  <div className="flex h-44 items-end gap-[3px] px-5 pb-3 pt-5">
                    {data.series.map((s) => (
                      <div key={s.day} title={`${s.day}: ${s.visitors} visitors, ${s.views} pages`} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                        <div className="rounded-t-[3px] bg-[image:var(--grad)]" style={{ height: `${Math.max(s.visitors ? 4 : 0, (s.visitors / peak) * 100)}%` }} />
                      </div>
                    ))}
                  </div>
                  <div className="figure flex justify-between border-t border-[var(--hairline)] px-5 py-2 text-[11px] text-[var(--text-muted)]">
                    <span>{data.series[0].day}</span><span>{data.series[data.series.length - 1].day}</span>
                  </div>
                </Card>
              )}

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <List title="Where they came from" hint="Instagram, Google, a typed address…" rows={data.sources} />
                <List title="Countries" rows={data.countries} />
                <List title="Pages they opened" rows={data.pages} mono />
                <List title="Cities" rows={data.cities} />
                <List title="Devices" rows={data.devices} />
                <List title="Browsers" rows={data.browsers} />
                {data.referrers.length > 0 && <List title="Sites that linked to us" rows={data.referrers} mono />}
                {data.campaigns.length > 0 && <List title="Campaigns" hint="From links tagged with utm_campaign" rows={data.campaigns} />}
              </div>

              <Card>
                <CardHead title="Latest visits" count={`${data.recent.length} shown`} />
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-[12.5px]">
                    <thead><tr className="ds-label border-b border-[var(--hairline)]">
                      {["When", "Page", "Came from", "Where", "Device"].map((h) => <th key={h} className="px-5 py-2.5 font-normal">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {data.recent.map((r, i) => (
                        <tr key={i} className="border-b border-[var(--hairline-soft)] last:border-0">
                          <td className="figure whitespace-nowrap px-5 py-2.5 text-[var(--text-muted)]">{stamp(r.at)}</td>
                          <td className="figure max-w-[220px] truncate px-5 py-2.5">{r.path}</td>
                          <td className="px-5 py-2.5">{r.source}{r.team && <span className="ms-1.5 text-[var(--text-muted)]">(team)</span>}</td>
                          <td className="px-5 py-2.5 text-[var(--text-secondary)]">{[r.city, r.country].filter(Boolean).join(", ") || "Unknown"}</td>
                          <td className="px-5 py-2.5 text-[var(--text-secondary)]">{r.device} · {r.browser}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
          <p className="text-[11.5px] leading-relaxed text-[var(--text-muted)]">
            A visitor is one person on one day, counted without cookies and without storing their address. Robots and search crawlers are left out.
            Visits that arrive with no link behind them (a typed address, a bookmark, some apps) show as Direct.
          </p>
        </>
      )}
    </div>
  );
}

function List({ title, hint, rows, mono }: { title: string; hint?: string; rows: Line[]; mono?: boolean }) {
  const most = Math.max(1, ...rows.map((r) => r.visitors));
  return (
    <Card>
      <CardHead title={title} count={hint ?? "visitors"} />
      {rows.length === 0 ? <Empty>Nothing yet.</Empty> : (
        <ul className="px-5 py-3">
          {rows.map((r) => (
            <li key={r.name} className="py-1.5">
              <div className="flex items-baseline gap-3 text-[13px]">
                <span className={`min-w-0 flex-1 truncate ${mono ? "figure text-[12.5px]" : ""}`}>{r.name}</span>
                <span className="figure shrink-0 font-semibold text-[var(--text-primary)]">{r.visitors}</span>
                <span className="figure w-16 shrink-0 text-end text-[11.5px] text-[var(--text-muted)]">{r.views} pages</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--surface-hover)]">
                <div className="h-full rounded-full bg-[image:var(--grad)]" style={{ width: `${(r.visitors / most) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
