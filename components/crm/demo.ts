import type { CrmActivity, CrmAgentDocument, CrmAgentRequest, CrmContact, CrmDeal, CrmEvent, CrmLead, CrmListing, CrmOwnerRequest, CrmProperty, CrmTask, CrmTempLead, CrmTemplate, CrmUser } from "@/lib/crm";

/* In-browser fake backend for /admin?demo (development only). Nothing is saved. */

const iso = (daysFromNow: number, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
let n = 100;
const id = () => `demo-${n++}`;

const users: CrmUser[] = [
  { id: "u1", email: "lababidioussama@gmail.com", full_name: "Oussama Lababidi", role: "admin", active: true, phone: "+971 54 704 4047", languages: "English, Arabic", specialties: "Company-wide", bio: "Founder and principal broker." },
  { id: "u2", email: "sara@lababidi.ae", full_name: "Sara Haddad", role: "agent", active: true, slab_pct: 55, quarterly_target_aed: 3000000, phone: "+971 50 111 2233", languages: "English, Arabic", specialties: "Dubai Marina, JVC", bio: "7 years in Dubai secondary sales.", avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=70" },
  { id: "u3", email: "omar@lababidi.ae", full_name: "Omar Nasser", role: "agent", active: true, slab_pct: 45, quarterly_target_aed: 8000000, phone: "+971 50 444 5566", languages: "English, Arabic, Russian", specialties: "Downtown, Business Bay", bio: "Off-plan specialist.", avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=70" },
];

const lead = (p: Partial<CrmLead> & Pick<CrmLead, "full_name" | "service" | "stage">): CrmLead => ({
  id: id(), created_at: iso(-3), source: "website", phone: `+971 50 123 ${4000 + n}`, email: null, notes: null, locale: "en",
  payload: {}, owner_id: null, contact_id: null, next_follow_up_at: null, deal_value_aed: null,
  internal_notes: null, deal_kind: null, property_type: null, beds: null, budget_aed: null, location: null,
  ready_status: null, medium: null, starred: false, expires_at: null, lost_reason: null,
  partner_agency: null, partner_split_pct: null, partner_approved: false, ...p,
});

const contacts: CrmContact[] = [
  { id: "c1", created_at: iso(-20), full_name: "James Whitmore", phone: "+44 7700 900123", email: "james@example.com", nationality: "British", kind: "investor", owner_id: "u2", notes: "Wants 2 units in JVC for yield.", roles: ["Buyer", "Investor"], status: "serious" },
  { id: "c2", created_at: iso(-12), full_name: "Elena Petrova", phone: "+7 916 555 0102", email: null, nationality: "Russian", kind: "buyer", owner_id: "u3", notes: null, roles: ["Buyer"], status: "vip" },
];

const leads: CrmLead[] = [
  lead({ full_name: "Ahmed Al Mansoori", service: "advisory", stage: "new", created_at: iso(0, 9), notes: "Looking for off-plan in Dubai Hills, budget around 3M.", payload: { budgetAed: 3000000, goal: "appreciation" } }),
  lead({ full_name: "Priya Sharma", service: "mortgage", stage: "new", created_at: iso(-1), source: "bayut" }),
  lead({ full_name: "Li Wei", service: "advisory", stage: "contacted", locale: "zh", source: "property_finder", owner_id: "u2", next_follow_up_at: iso(-1), deal_value_aed: 1850000, deal_kind: "sale", medium: "Portal", expires_at: iso(0, 21), starred: true }),
  lead({ full_name: "James Whitmore", service: "netRoi", stage: "viewing", owner_id: "u1", contact_id: "c1", next_follow_up_at: iso(1), deal_value_aed: 2400000, deal_kind: "sale", property_type: "apartment", beds: "1BR", budget_aed: 1200000, location: "Jumeirah Village Circle", ready_status: "any", medium: "WhatsApp", expires_at: iso(1, 15) }),
  lead({ full_name: "Elena Petrova", service: "advisory", stage: "offer", locale: "ru", owner_id: "u3", contact_id: "c2", next_follow_up_at: iso(0, 16), deal_value_aed: 4200000 }),
  lead({ full_name: "Khalid Rahman", service: "fitout", stage: "won", source: "instagram", owner_id: "u3", deal_value_aed: 320000 }),
  lead({ full_name: "Maria Gomez", service: "relocation", stage: "lost", source: "referral", owner_id: "u2", lost_reason: "Low budget" }),
  lead({ full_name: "Rashid Khan", service: "advisory", stage: "new", source: "dubizzle", phone: "+971 55 987 6543", notes: "Wants a 2BR in Dubai Marina to rent.", deal_kind: "rent", beds: "2BR", location: "Dubai Marina", budget_aed: 150000 }),
];

const tasks: CrmTask[] = [
  { id: "t1", created_at: iso(-2), title: "Call Li Wei back about payment plan", due_at: iso(-1), done_at: null, assignee_id: "u2", lead_id: leads[2].id, contact_id: null },
  { id: "t2", created_at: iso(-1), title: "Send Elena the SPA draft", due_at: iso(0, 15), done_at: null, assignee_id: "u3", lead_id: leads[4].id, contact_id: "c2" },
  { id: "t3", created_at: iso(-1), title: "Book viewing at Sobha One for James", due_at: iso(2), done_at: null, assignee_id: "u2", lead_id: leads[3].id, contact_id: "c1" },
  { id: "t4", created_at: iso(-5), title: "Collect Khalid's floor plan", due_at: iso(-3), done_at: iso(-3), assignee_id: "u3", lead_id: null, contact_id: null },
];

const properties: CrmProperty[] = [
  { id: "p1", contact_id: "c1", relation: "wants", community: "Jumeirah Village Circle", building: "Binghatti", unit: null, bedrooms: "1BR", price_aed: 1200000, notes: null },
  { id: "p2", contact_id: "c1", relation: "owns", community: "Dubai Marina", building: "Marina Gate 1", unit: "2304", bedrooms: "2BR", price_aed: 2600000, notes: null },
];

const activities: CrmActivity[] = [
  { id: "a1", created_at: iso(-2, 11), lead_id: leads[3].id, contact_id: null, user_id: "u2", kind: "call", body: "Discussed yield targets, wants 6%+ net." },
  { id: "a2", created_at: iso(-1, 14), lead_id: leads[4].id, contact_id: null, user_id: "u3", kind: "whatsapp", body: "Sent brochure and payment plan." },
];

const PHOTO = (q: string) => `https://images.unsplash.com/${q}?w=800&q=70`;
const month = (m: number, d = 12) => { const x = new Date(); x.setMonth(x.getMonth() - m, d); return x.toISOString().slice(0, 10); };
const listings: CrmListing[] = [
  { id: "l1", created_at: iso(-10), title: "Upgraded 2BR with full Marina view", purpose: "sale", property_type: "apartment", community: "Dubai Marina", building: "Marina Gate 1", unit: "2304", bedrooms: "2BR", size_sqft: 1310, price_aed: 2600000, permit_no: "7117223344", status: "available", owner_contact_id: "c1", agent_id: "u2", description: null, photos: [PHOTO("photo-1512917774080-9991f1c4c750")], ref_code: "AS-000101", form_a_start: month(1), form_a_end: month(-5), permit_status: "approved", approval: "approved", approval_note: null, key_status: "With security", exclusive: true, off_market: false, low_performing: false, price_reduced_at: null, price_was_aed: null },
  { id: "l2", created_at: iso(-8), title: "Brand new 1BR, handover Q4", purpose: "sale", property_type: "apartment", community: "Jumeirah Village Circle", building: "Binghatti Phantom", unit: null, bedrooms: "1BR", size_sqft: 720, price_aed: 1150000, permit_no: "7117225566", status: "available", owner_contact_id: null, agent_id: "u2", description: null, photos: [PHOTO("photo-1600585154340-be6161a56a0c")], ref_code: "AS-000102", form_a_start: month(2), form_a_end: month(-4), permit_status: "approved", approval: "approved", approval_note: null, key_status: "No key (off-plan)", exclusive: false, off_market: false, low_performing: false, price_reduced_at: null, price_was_aed: null },
  { id: "l3", created_at: iso(-6), title: "4BR family villa, Maple cluster", purpose: "rent", property_type: "villa", community: "Dubai Hills Estate", building: "Maple 2", unit: "V-41", bedrooms: "4BR", size_sqft: 3200, price_aed: 420000, permit_no: null, status: "reserved", owner_contact_id: null, agent_id: "u3", description: null, photos: [PHOTO("photo-1613490493576-7fde63acd811")], ref_code: "VR-000103", form_a_start: month(0, 20), form_a_end: month(-11, 20), permit_status: "under_process", approval: "pending", approval_note: null, key_status: "With the client", exclusive: false, off_market: false, low_performing: false, price_reduced_at: null, price_was_aed: null },
  { id: "l4", created_at: iso(-30), title: "Downtown studio, Burj view", purpose: "sale", property_type: "apartment", community: "Downtown Dubai", building: "Burj Royale", unit: "1805", bedrooms: "Studio", size_sqft: 460, price_aed: 1250000, permit_no: "7117220011", status: "sold", owner_contact_id: null, agent_id: "u3", description: null, photos: [PHOTO("photo-1502672260266-1c1ef2d93688")], ref_code: "AS-000104", form_a_start: month(4), form_a_end: month(-2), permit_status: "approved", approval: "approved", approval_note: null, key_status: "Available", exclusive: false, off_market: false, low_performing: false, price_reduced_at: null, price_was_aed: null },
];
const deals: CrmDeal[] = [
  { id: "d1", created_at: iso(-5), title: "Burj Royale 1805 sale", deal_type: "sale", lead_id: null, listing_id: "l4", contact_id: null, agent_id: "u3", price_aed: 1250000, commission_pct: 2, agent_split_pct: 50, closed_at: month(0, 3), paid_at: month(0, 10), notes: null },
  { id: "d2", created_at: iso(-40), title: "Emaar Beachfront off-plan 2BR", deal_type: "offplan", lead_id: null, listing_id: null, contact_id: null, agent_id: "u2", price_aed: 3400000, commission_pct: 4, agent_split_pct: 50, closed_at: month(1), paid_at: null, notes: null },
  { id: "d3", created_at: iso(-70), title: "JLT 1BR annual lease", deal_type: "rent", lead_id: null, listing_id: null, contact_id: null, agent_id: "u2", price_aed: 95000, commission_pct: 5, agent_split_pct: 50, closed_at: month(2), paid_at: month(2, 20), notes: null },
  { id: "d4", created_at: iso(-100), title: "Arabian Ranches villa sale", deal_type: "sale", lead_id: null, listing_id: null, contact_id: null, agent_id: "u3", price_aed: 5200000, commission_pct: 2, agent_split_pct: 40, closed_at: month(3), paid_at: month(3, 25), notes: null },
];
const events: CrmEvent[] = [
  { id: "e1", created_at: iso(-1), title: "Viewing: Marina Gate 2304 with James", kind: "viewing", starts_at: iso(1, 11), ends_at: null, status: "scheduled", agent_id: "u2", lead_id: null, contact_id: "c1", listing_id: "l1", location: "Marina Gate 1, Dubai Marina", notes: null },
  { id: "e2", created_at: iso(-1), title: "Offer meeting: Elena Petrova", kind: "meeting", starts_at: iso(0, 17), ends_at: null, status: "scheduled", agent_id: "u3", lead_id: null, contact_id: "c2", listing_id: null, location: "Office 327, Al Mansoori Building", notes: null },
  { id: "e3", created_at: iso(-2), title: "Viewing: Maple 2 villa", kind: "viewing", starts_at: iso(3, 10), ends_at: null, status: "scheduled", agent_id: "u3", lead_id: null, contact_id: null, listing_id: "l3", location: "Dubai Hills Estate", notes: null },
  { id: "e4", created_at: iso(-6), title: "Handover: Burj Royale 1805", kind: "handover", starts_at: iso(-4, 14), ends_at: null, status: "done", agent_id: "u3", lead_id: null, contact_id: null, listing_id: "l4", location: "Downtown Dubai", notes: null },
];
const ownerRequests: CrmOwnerRequest[] = [
  { id: "or1", created_at: iso(-2), owner_name: "Fatima Al Suwaidi", phone: "+971 50 222 3344", email: null, purpose: "sale", property_type: "apartment", community: "Business Bay", building: "Paramount Tower", asking_price_aed: 1900000, notes: "Wants a quick sale, relocating.", status: "new", owner_id: null, listing_id: null },
  { id: "or2", created_at: iso(-6), owner_name: "Michael Carter", phone: "+971 55 887 1122", email: "mcarter@example.com", purpose: "rent", property_type: "villa", community: "Arabian Ranches", building: null, asking_price_aed: 250000, notes: null, status: "in_progress", owner_id: "u2", listing_id: null },
];

const tempLeads: CrmTempLead[] = [
  { id: "tl1", created_at: iso(-1), full_name: "Youssef Hariri", phone: "+971 55 111 0099", source: "Cold list", status: "interested", notes: "Wants a 2BR in Marina.", owner_id: "u2" },
  { id: "tl2", created_at: iso(-3), full_name: "Anna Kowalski", phone: "+971 55 222 0088", source: "Cold list", status: "to_call", notes: null, owner_id: null },
  { id: "tl3", created_at: iso(-4), full_name: "Rami Fares", phone: "+971 55 333 0077", source: "Cold list", status: "wrong_number", notes: null, owner_id: "u3" },
];

const agentRequests: CrmAgentRequest[] = [
  { id: "rq1", created_at: iso(-2), user_id: "u2", kind: "video_shoot", title: "Video for Marina Gate 2304", details: "Buyer wants a walkthrough video.", listing_id: "l1", status: "pending", admin_note: null },
  { id: "rq2", created_at: iso(-5), user_id: "u3", kind: "sim_esim", title: "SIM / eSIM", details: "New number for the office line.", listing_id: null, status: "approved", admin_note: "Picking up Thursday" },
];

const agentDocuments: CrmAgentDocument[] = [
  { id: "ad1", created_at: iso(-30), user_id: "u2", title: "RERA card", url: "https://example.com/rera-card.pdf", kind: "license" },
  { id: "ad2", created_at: iso(-20), user_id: "u3", title: "Passport copy", url: "https://example.com/passport.pdf", kind: "id" },
];

const templates: CrmTemplate[] = [
  { id: "w1", name: "First reply", body: "Hello {name}, thank you for contacting Lababidi Properties. I'm {agent} and I'll be helping you. When is a good time to speak?" },
  { id: "w2", name: "Follow-up", body: "Hi {name}, just following up on your enquiry. Are you still looking? I have a few options that may suit you." },
  { id: "w3", name: "Viewing confirmation", body: "Hi {name}, your viewing is confirmed. I'll share the location pin shortly. See you there, {agent} - Lababidi Properties" },
];

type Row = Record<string, unknown>;
const tables: Record<string, Row[]> = {
  leads: leads as unknown as Row[],
  contacts: contacts as unknown as Row[],
  tasks: tasks as unknown as Row[],
  users: users as unknown as Row[],
  properties: properties as unknown as Row[],
  activities: activities as unknown as Row[],
  audit: [] as Row[],
  "data/owner_requests": ownerRequests as unknown as Row[],
  "data/temp_leads": tempLeads as unknown as Row[],
  "data/campaigns": [] as Row[],
  "data/requests": agentRequests as unknown as Row[],
  "data/agent_documents": agentDocuments as unknown as Row[],
  "data/listings": listings as unknown as Row[],
  "data/deals": deals as unknown as Row[],
  "data/events": events as unknown as Row[],
  "data/templates": templates as unknown as Row[],
};
const single: Record<string, string> = {
  leads: "lead", contacts: "contact", tasks: "task", users: "user", properties: "property", activities: "activity",
};

export async function demoApi(method: string, resource: string, body?: Row, query?: string): Promise<Row> {
  if (resource === "data/leads" && method === "POST") {
    const added = ((body?.rows as Row[]) ?? []).map((r) => {
      const row = lead({ full_name: String(r.full_name), service: "advisory", stage: "new" }) as unknown as Row;
      Object.assign(row, { phone: r.phone, email: r.email ?? null, notes: r.notes ?? null, source: r.source, owner_id: r.owner_id ?? null, created_at: new Date().toISOString() });
      tables.leads.unshift(row);
      return row;
    });
    return { ok: true, rows: added, skipped: 0 };
  }
  if (resource === "audit") return { ok: true, entries: tables.audit };
  const generic = resource.startsWith("data/");
  const table = tables[resource];
  if (!table) return { ok: false, error: "not_found" };
  const q = new URLSearchParams(query ?? "");

  if (method === "GET") {
    let rows = table;
    if (q.get("contact_id")) rows = rows.filter((r) => r.contact_id === q.get("contact_id"));
    if (q.get("lead_id")) rows = rows.filter((r) => r.lead_id === q.get("lead_id"));
    return { ok: true, [generic ? "rows" : resource]: [...rows] };
  }
  if (method === "DELETE") {
    const i = table.findIndex((r) => r.id === q.get("id"));
    if (i >= 0) table.splice(i, 1);
    return { ok: true };
  }
  if (method === "POST") {
    const row: Row = { id: id(), created_at: new Date().toISOString(), active: true, role: "agent", ...body };
    if (resource === "tasks") row.done_at = null;
    if (resource === "activities") row.user_id = "u1";
    if (resource === "contacts" && body?.lead_id) {
      const l = tables.leads.find((r) => r.id === body.lead_id);
      if (l) l.contact_id = row.id;
    }
    if (generic) table.unshift(row); else table.push(row);
    return { ok: true, [generic ? "row" : single[resource]]: row };
  }
  if (method === "PATCH") {
    const row = table.find((r) => r.id === body?.id);
    if (!row) return { ok: false, error: "not_found" };
    const soon = () => new Date(Date.now() + 48 * 3_600_000).toISOString();
    const log = (text: string) => tables.activities.unshift({ id: id(), created_at: new Date().toISOString(), lead_id: row.id, contact_id: null, user_id: "u1", kind: "system", body: text });
    if (resource === "leads" && body?.claim) {
      if (row.owner_id) return { ok: false, error: "already_claimed" };
      Object.assign(row, { owner_id: "u1", expires_at: soon() });
      log("Claimed from the open pool (contact details revealed)");
      return { ok: true, lead: { ...row } };
    }
    if (resource === "leads" && body?.release) {
      if (!body.reason || !body.note) return { ok: false, error: "reason_and_note_required" };
      Object.assign(row, { owner_id: null, expires_at: null });
      log(`Released to the pool: ${String(body.reason)}. ${String(body.note)}`);
      return { ok: true, lead: { ...row } };
    }
    if (resource === "leads" && body?.stage === "lost" && (!body.lost_reason || !body.note)) {
      return { ok: false, error: "reason_and_note_required" };
    }
    if (resource === "leads" && body?.starred && !row.starred && tables.leads.filter((r) => r.starred && r.owner_id === row.owner_id).length >= 10) {
      return { ok: false, error: "star_limit" };
    }
    const { id: _id, done, password: _pw, note: _note, claim: _c, release: _r, reason: _rs, ...rest } = body ?? {};
    Object.assign(row, rest);
    if (resource === "leads") row.expires_at = row.owner_id && !["won", "lost"].includes(String(row.stage)) ? soon() : null;
    if (done !== undefined) row.done_at = done ? new Date().toISOString() : null;
    if (resource === "leads" && rest.stage) {
      tables.activities.unshift({ id: id(), created_at: new Date().toISOString(), lead_id: row.id, contact_id: null, user_id: "u1", kind: "stage", body: `Moved to ${String(rest.stage)}` });
    }
    return { ok: true, [generic ? "row" : single[resource]]: { ...row } };
  }
  return { ok: false, error: "bad_method" };
}
