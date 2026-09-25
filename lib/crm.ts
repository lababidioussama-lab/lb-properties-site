export const STAGES = ["new", "contacted", "viewing", "offer", "won", "lost"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  new: "New",
  contacted: "Contacted",
  viewing: "Viewing",
  offer: "Offer",
  won: "Won",
  lost: "Lost",
};

export const CONTACT_KINDS = ["buyer", "seller", "landlord", "tenant", "investor", "other"] as const;

export const CONTACT_ROLES = ["Buyer", "Seller", "Landlord", "Tenant", "Investor", "POA holder", "Developer", "Agent"] as const;
export const CONTACT_STATUSES = [
  "need_to_validate", "validated", "serious", "motivated", "vip",
  "not_serious", "unrealistic", "wrong_client", "blocked", "archived",
] as const;
export const CONTACT_STATUS_LABEL: Record<string, string> = {
  need_to_validate: "Need to validate", validated: "Validated", serious: "Serious", motivated: "Motivated", vip: "VIP",
  not_serious: "Not serious", unrealistic: "Unrealistic", wrong_client: "Wrong client", blocked: "Blocked", archived: "Archived",
};
export const CONTACT_STATUS_TONE: Record<string, string> = {
  need_to_validate: "bg-zinc-500/15 text-zinc-300", validated: "bg-sky-500/15 text-sky-300",
  serious: "bg-emerald-500/15 text-emerald-300", motivated: "bg-emerald-500/15 text-emerald-300",
  vip: "bg-amber-500/20 text-amber-200", not_serious: "bg-zinc-500/15 text-zinc-400",
  unrealistic: "bg-zinc-500/15 text-zinc-400", wrong_client: "bg-red-500/15 text-red-300",
  blocked: "bg-red-500/15 text-red-300", archived: "bg-zinc-500/15 text-zinc-500",
};
export const ACTIVITY_KINDS = ["note", "call", "whatsapp", "email", "meeting", "stage", "system"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export interface CrmUser {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "agent";
  active: boolean;
  slab_pct?: number;
  quarterly_target_aed?: number | null;
  phone?: string | null;
  languages?: string | null;
  specialties?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
}

export interface CrmLead {
  id: string;
  created_at: string;
  service: string;
  source: string | null;
  full_name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  locale: string;
  payload: Record<string, unknown>;
  stage: Stage;
  owner_id: string | null;
  contact_id: string | null;
  next_follow_up_at: string | null;
  deal_value_aed: number | null;
  internal_notes: string | null;
  deal_kind: "sale" | "rent" | null;
  property_type: string | null;
  beds: string | null;
  budget_aed: number | null;
  location: string | null;
  ready_status: "ready" | "offplan" | "any" | null;
  medium: string | null;
  starred: boolean;
  expires_at: string | null;
  lost_reason: string | null;
  partner_agency: string | null;
  partner_split_pct: number | null;
  partner_approved: boolean;
}

export interface CrmContact {
  id: string;
  created_at: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  nationality: string | null;
  kind: (typeof CONTACT_KINDS)[number];
  owner_id: string | null;
  notes: string | null;
  roles: string[];
  status: (typeof CONTACT_STATUSES)[number];
}

export interface CrmProperty {
  id: string;
  contact_id: string;
  relation: "owns" | "wants";
  community: string | null;
  building: string | null;
  unit: string | null;
  bedrooms: string | null;
  price_aed: number | null;
  notes: string | null;
}

export interface CrmActivity {
  id: string;
  created_at: string;
  lead_id: string | null;
  contact_id: string | null;
  user_id: string | null;
  kind: ActivityKind;
  body: string;
  duration_seconds?: number | null;
}

export interface CrmTask {
  id: string;
  created_at: string;
  title: string;
  due_at: string | null;
  done_at: string | null;
  assignee_id: string | null;
  lead_id: string | null;
  contact_id: string | null;
}

export const LEAD_SOURCES = ["website", "bayut", "property_finder", "dubizzle", "instagram", "referral", "walk_in", "other"] as const;
export const SOURCE_LABEL: Record<string, string> = {
  website: "Website", bayut: "Bayut", property_finder: "Property Finder", dubizzle: "Dubizzle",
  instagram: "Instagram", referral: "Referral", walk_in: "Walk-in", other: "Other",
};

export const LISTING_STATUSES = ["available", "reserved", "sold", "rented", "off_market"] as const;
export const PROPERTY_TYPES = ["apartment", "villa", "townhouse", "penthouse", "plot", "office", "retail"] as const;

export interface CrmListing {
  id: string;
  created_at: string;
  title: string;
  purpose: "sale" | "rent";
  property_type: (typeof PROPERTY_TYPES)[number];
  community: string | null;
  building: string | null;
  unit: string | null;
  bedrooms: string | null;
  size_sqft: number | null;
  price_aed: number | null;
  permit_no: string | null;
  status: (typeof LISTING_STATUSES)[number];
  owner_contact_id: string | null;
  agent_id: string | null;
  description: string | null;
  photos: string[];
  ref_code: string | null;
  form_a_start: string | null;
  form_a_end: string | null;
  permit_status: "none" | "under_process" | "approved" | "expired";
  approval: "pending" | "approved" | "rejected";
  approval_note: string | null;
  key_status: string | null;
  exclusive: boolean;
  off_market: boolean;
  low_performing: boolean;
  price_reduced_at: string | null;
  price_was_aed: number | null;
}

export interface CrmDeal {
  id: string;
  created_at: string;
  title: string;
  deal_type: "sale" | "rent" | "offplan";
  lead_id: string | null;
  listing_id: string | null;
  contact_id: string | null;
  agent_id: string | null;
  price_aed: number;
  commission_pct: number;
  agent_split_pct: number;
  closed_at: string;
  paid_at: string | null;
  notes: string | null;
}

export const commissionOf = (d: Pick<CrmDeal, "price_aed" | "commission_pct">) =>
  (Number(d.price_aed) * Number(d.commission_pct)) / 100;

export interface CrmEvent {
  id: string;
  created_at: string;
  title: string;
  kind: "viewing" | "meeting" | "call" | "handover";
  starts_at: string;
  ends_at: string | null;
  status: "scheduled" | "done" | "cancelled";
  agent_id: string | null;
  lead_id: string | null;
  contact_id: string | null;
  listing_id: string | null;
  location: string | null;
  notes: string | null;
}

export interface CrmTemplate {
  id: string;
  name: string;
  body: string;
}

/** Fill {name} and {agent} placeholders in a WhatsApp template. */
export const fillTemplate = (body: string, name: string, agent: string) =>
  body.replaceAll("{name}", name.split(" ")[0] || name).replaceAll("{agent}", agent);

/** Website enquiries store the page URL as their source; portal/manual leads store a key. */
export const sourceKey = (s: string | null) =>
  (LEAD_SOURCES as readonly string[]).includes(s ?? "") ? (s as string) : "website";

/** Hours an agent has to update an open lead before it returns to the pool. */
export const LEAD_SLA_HOURS = 48;
export const STAR_LIMIT = 10;

export const MEDIUMS = ["Phone", "WhatsApp", "Website form", "Portal", "Walk-in", "Email", "Instagram", "Referral"] as const;

export const LOST_REASONS = [
  "No answer (WhatsApp sent)",
  "Low budget",
  "Not interested anymore",
  "Already bought / rented",
  "Don't have stock",
  "General enquiry",
  "Wrong contact details",
  "Client unreachable",
  "It was an agent",
  "Spam",
] as const;

/** Stage guidance shown to the agent, fäm-style "What next?". */
export function whatNext(l: Pick<CrmLead, "stage" | "deal_kind" | "budget_aed" | "location" | "contact_id" | "next_follow_up_at">): string {
  const missing = [!l.deal_kind && "sale or rent", !l.budget_aed && "budget", !l.location && "location"].filter(Boolean);
  switch (l.stage) {
    case "new":
      return "Call or WhatsApp the client, then move the lead to Contacted.";
    case "contacted":
      if (missing.length) return `Qualify the client: add their ${missing.join(", ")} under Requirements.`;
      return l.contact_id ? "Book a viewing from the matched listings, then move to Viewing." : "Save the client as a contact, then book a viewing.";
    case "viewing":
      return l.next_follow_up_at ? "After the viewing, collect feedback and move to Offer if they want to proceed." : "Set a follow-up date for the viewing.";
    case "offer":
      return "Negotiate the price, sign Form F (MOU) in Dubai REST, collect the deposit, then mark Won.";
    case "won":
      return "Record the closed deal under Deals so the commission is tracked.";
    case "lost":
      return "Closed. Reopen by moving it back to New if the client comes back.";
  }
}

export const KEY_STATUSES = ["Available", "With security", "With the client", "Door is open", "Sales center", "No key (off-plan)"] as const;

/** What stops a listing from being approved and advertised (fäm: "Pending DOCs"). */
export function complianceIssues(l: Pick<CrmListing, "permit_no" | "permit_status" | "form_a_end" | "photos" | "price_aed">): string[] {
  const out: string[] = [];
  const today = new Date().toISOString().slice(0, 10);
  if (!l.form_a_end) out.push("Form A missing");
  else if (l.form_a_end < today) out.push("Form A expired");
  if (!l.permit_no) out.push(l.permit_status === "under_process" ? "Permit under process" : "Trakheesi permit missing");
  else if (l.permit_status === "expired") out.push("Permit expired");
  if (!l.photos?.length) out.push("No photos");
  if (!l.price_aed) out.push("No price");
  return out;
}

/** Portal ad-title rules: 30–50 characters, no bedroom count or project name. */
export function adTitleIssues(title: string, building?: string | null, community?: string | null): string[] {
  const t = title.trim();
  const out: string[] = [];
  if (t.length < 30 || t.length > 50) out.push(`Title is ${t.length} characters; portals want 30–50`);
  if (/\b(\d+\s?(br|bed|beds|bedroom|bedrooms)|studio)\b/i.test(t)) out.push("Remove the bedroom count from the title");
  for (const name of [building, community]) {
    if (name && name.length > 3 && t.toLowerCase().includes(name.toLowerCase())) out.push(`Remove "${name}" from the title`);
  }
  return out;
}

export function quarterOf(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
}

/** fäm-style slab rule applied to one quarter's achievement. */
export function slabOutcome(achieved: number, target: number | null | undefined) {
  if (!target) return { pct: 0, label: "No target set", tone: "text-[var(--text-muted)]" };
  const pct = Math.round((achieved / target) * 100);
  if (pct >= 100) return { pct, label: "Target hit: bonus in full, slab upgrade", tone: "text-emerald-300" };
  if (pct >= 50) return { pct, label: "Partial: bonus prorated, slab unchanged", tone: "text-amber-300" };
  return { pct, label: "Below target: bonus forfeited, slab downgrade", tone: "text-red-300" };
}

export interface CrmAuditEntry {
  id: string;
  created_at: string;
  user_id: string | null;
  entity: string;
  entity_id: string | null;
  action: string;
  detail: Record<string, unknown>;
}

export const OWNER_REQUEST_STATUSES = ["new", "in_progress", "listed", "declined"] as const;
export type OwnerRequestStatus = (typeof OWNER_REQUEST_STATUSES)[number];
export const OWNER_REQUEST_LABEL: Record<OwnerRequestStatus, string> = {
  new: "New", in_progress: "Listing in progress", listed: "Listed", declined: "Declined",
};
export const OWNER_REQUEST_TONE: Record<OwnerRequestStatus, string> = {
  new: "bg-sky-500/15 text-sky-300", in_progress: "bg-amber-500/15 text-amber-300",
  listed: "bg-emerald-500/15 text-emerald-300", declined: "bg-zinc-500/15 text-zinc-400",
};

export interface CrmOwnerRequest {
  id: string;
  created_at: string;
  owner_name: string;
  phone: string;
  email: string | null;
  purpose: "sale" | "rent";
  property_type: string | null;
  community: string | null;
  building: string | null;
  asking_price_aed: number | null;
  notes: string | null;
  status: OwnerRequestStatus;
  owner_id: string | null;
  listing_id: string | null;
}

export const TEMP_LEAD_STATUSES = [
  "to_call", "call_back", "called_done", "interested", "not_interested",
  "wrong_number", "do_not_call", "it_is_agent", "pre_exist", "sold_rented",
] as const;
export const TEMP_LEAD_LABEL: Record<string, string> = {
  to_call: "To call", call_back: "Call back", called_done: "Called, done", interested: "Interested",
  not_interested: "Not interested", wrong_number: "Wrong number", do_not_call: "Do not call",
  it_is_agent: "It is an agent", pre_exist: "Pre-existing client", sold_rented: "Sold / rented",
};

export interface CrmTempLead {
  id: string;
  created_at: string;
  full_name: string;
  phone: string;
  source: string | null;
  status: (typeof TEMP_LEAD_STATUSES)[number];
  notes: string | null;
  owner_id: string | null;
}

export interface CrmCampaign {
  id: string;
  created_at: string;
  user_id: string | null;
  message: string;
  recipients: number;
}

export interface AgentQuarterStats {
  deals: number;
  earned: number;
  revenue: number;
}

export const REQUEST_KINDS = ["sim_esim", "video_shoot", "document", "other"] as const;
export const REQUEST_KIND_LABEL: Record<string, string> = {
  sim_esim: "SIM / eSIM", video_shoot: "Property video shoot", document: "Document", other: "Other",
};
export const REQUEST_STATUSES = ["pending", "approved", "done", "rejected"] as const;
export const REQUEST_STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300", approved: "bg-sky-500/15 text-sky-300",
  done: "bg-emerald-500/15 text-emerald-300", rejected: "bg-red-500/15 text-red-300",
};

export interface CrmAgentRequest {
  id: string;
  created_at: string;
  user_id: string;
  kind: (typeof REQUEST_KINDS)[number];
  title: string;
  details: string | null;
  listing_id: string | null;
  status: (typeof REQUEST_STATUSES)[number];
  admin_note: string | null;
}

export const DOC_KINDS = ["id", "visa", "license", "contract", "other"] as const;
export const DOC_KIND_LABEL: Record<string, string> = {
  id: "ID / passport", visa: "Visa", license: "RERA license/card", contract: "Contract", other: "Other",
};

export interface CrmAgentDocument {
  id: string;
  created_at: string;
  user_id: string;
  title: string;
  url: string;
  kind: (typeof DOC_KINDS)[number];
}
