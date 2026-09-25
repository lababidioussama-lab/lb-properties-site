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
  need_to_validate: "bg-zinc-100 text-zinc-600", validated: "bg-sky-50 text-sky-700",
  serious: "bg-emerald-50 text-emerald-700", motivated: "bg-emerald-50 text-emerald-700",
  vip: "bg-amber-50 text-amber-700", not_serious: "bg-zinc-100 text-zinc-600",
  unrealistic: "bg-zinc-100 text-zinc-600", wrong_client: "bg-red-50 text-red-700",
  blocked: "bg-red-50 text-red-700", archived: "bg-zinc-100 text-zinc-500",
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
  brn_no?: string | null;
  brn_expiry?: string | null;
  visa_expiry?: string | null;
  emirates_id_expiry?: string | null;
  rera_cert_date?: string | null;
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
  first_response_at?: string | null;
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
  permit_expiry?: string | null;
  permit_price_aed?: number | null;
  permit_agent_id?: string | null;
  dld_unit_no?: string | null;
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
  milestones?: Record<string, string | null>;
  noc_expiry?: string | null;
  transfer_at?: string | null;
  developer?: string | null;
  project?: string | null;
  unit_no?: string | null;
  spa_signed_at?: string | null;
  oqood_no?: string | null;
  payment_plan?: PlanInstalment[];
  commission_trigger_pct?: number | null;
  developer_invoice_status?: "not_due" | "sent" | "paid" | null;
  payment_method?: PaymentMethod | null;
  cash_amount_aed?: number | null;
  goaml_required?: boolean;
  goaml_ref?: string | null;
  goaml_reported_at?: string | null;
  kyc_override_reason?: string | null;
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
export function complianceIssues(
  l: Pick<CrmListing, "permit_no" | "permit_status" | "form_a_end" | "photos" | "price_aed"> &
    Partial<Pick<CrmListing, "permit_expiry" | "permit_price_aed" | "permit_agent_id" | "agent_id">>,
  agent?: Pick<CrmUser, "brn_no" | "brn_expiry"> | null,
): string[] {
  const out: string[] = [];
  const today = new Date().toISOString().slice(0, 10);
  if (!l.form_a_end) out.push("Form A missing");
  else if (l.form_a_end < today) out.push("Form A expired");
  if (!l.permit_no) out.push(l.permit_status === "under_process" ? "Permit under process" : "Trakheesi permit missing");
  else if (l.permit_status === "expired" || (l.permit_expiry && l.permit_expiry < today)) out.push("Trakheesi permit expired");
  if (l.permit_no && l.permit_price_aed && l.price_aed && Number(l.permit_price_aed) !== Number(l.price_aed)) {
    out.push(`Price differs from the permit (AED ${Number(l.permit_price_aed).toLocaleString()}) — renew the permit`);
  }
  if (l.permit_no && l.permit_agent_id && l.agent_id && l.permit_agent_id !== l.agent_id) out.push("Listing agent is not the agent on the permit");
  if (agent !== undefined && l.agent_id && !licenceValid(agent)) out.push("Listing agent's BRN is missing or expired");
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
  if (pct >= 100) return { pct, label: "Target hit: bonus in full, slab upgrade", tone: "text-emerald-700" };
  if (pct >= 50) return { pct, label: "Partial: bonus prorated, slab unchanged", tone: "text-amber-700" };
  return { pct, label: "Below target: bonus forfeited, slab downgrade", tone: "text-red-700" };
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
  new: "bg-sky-50 text-sky-700", in_progress: "bg-amber-50 text-amber-700",
  listed: "bg-emerald-50 text-emerald-700", declined: "bg-zinc-100 text-zinc-600",
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
  pending: "bg-amber-50 text-amber-700", approved: "bg-sky-50 text-sky-700",
  done: "bg-emerald-50 text-emerald-700", rejected: "bg-red-50 text-red-700",
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


/* ---------------------------------------------------------------- licences */

const todayIso = () => new Date().toISOString().slice(0, 10);
const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);

/** An agent may deal only with a current RERA broker card (BRN). */
export function licenceValid(u: Pick<CrmUser, "brn_no" | "brn_expiry"> | null | undefined): boolean {
  return !!u?.brn_no && !!u.brn_expiry && u.brn_expiry >= todayIso();
}

export function licenceAlerts(u: CrmUser): { level: "expired" | "soon" | "missing"; text: string }[] {
  const out: { level: "expired" | "soon" | "missing"; text: string }[] = [];
  if (!u.brn_no || !u.brn_expiry) out.push({ level: "missing", text: "BRN not recorded" });
  const checks: [string, string | null | undefined][] = [["BRN", u.brn_expiry], ["Visa", u.visa_expiry], ["Emirates ID", u.emirates_id_expiry]];
  for (const [label, date] of checks) {
    if (!date) continue;
    const d = daysUntil(date);
    if (d < 0) out.push({ level: "expired", text: `${label} expired ${-d} days ago` });
    else if (d <= 30) out.push({ level: "soon", text: `${label} expires in ${d} days` });
  }
  return out;
}

/* ---------------------------------------------------------------- KYC / AML */

export type PaymentMethod = "transfer" | "cheque" | "mortgage" | "cash" | "crypto" | "mixed";
export const PAYMENT_METHODS: PaymentMethod[] = ["transfer", "cheque", "mortgage", "cash", "crypto", "mixed"];
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  transfer: "Bank transfer", cheque: "Cheque", mortgage: "Mortgage", cash: "Cash", crypto: "Virtual assets (crypto)", mixed: "Mixed",
};

/** UAE AML rules: real-estate deals paid in cash or virtual assets at or above this need a goAML (REAR) report. */
export const GOAML_CASH_THRESHOLD_AED = 55_000;

export function goamlRequired(d: { payment_method?: string | null; cash_amount_aed?: number | null; price_aed?: number | null }): boolean {
  if (d.payment_method === "crypto") return true;
  if (d.payment_method === "cash") return Number(d.cash_amount_aed ?? d.price_aed ?? 0) >= GOAML_CASH_THRESHOLD_AED;
  return Number(d.cash_amount_aed ?? 0) >= GOAML_CASH_THRESHOLD_AED;
}

export interface CrmKyc {
  id: string;
  created_at: string;
  updated_at: string;
  contact_id: string;
  owner_id: string | null;
  party_type: "individual" | "company";
  legal_name: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  emirates_id_no: string | null;
  emirates_id_expiry: string | null;
  passport_no: string | null;
  passport_expiry: string | null;
  trade_license_no: string | null;
  trade_license_expiry: string | null;
  ubo_details: string | null;
  id_doc_url: string | null;
  passport_doc_url: string | null;
  is_pep: boolean | null;
  pep_details: string | null;
  sanctions_result: "pending" | "clear" | "match";
  sanctions_checked_at: string | null;
  screened_by: string | null;
  source_of_funds: string | null;
  payment_method: PaymentMethod | null;
  risk_rating: "low" | "medium" | "high" | null;
  status: "incomplete" | "complete" | "approved";
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
}

/** What still stops this client file from being complete. Empty list = complete. */
export function kycMissing(k: Partial<CrmKyc> | null | undefined): string[] {
  if (!k) return ["No KYC file"];
  const out: string[] = [];
  const today = todayIso();
  if (!k.legal_name) out.push("Legal name");
  if (k.party_type === "company") {
    if (!k.trade_license_no) out.push("Trade licence number");
    if (!k.trade_license_expiry) out.push("Trade licence expiry");
    else if (k.trade_license_expiry < today) out.push("Trade licence expired");
    if (!k.ubo_details) out.push("Beneficial owners (UBO)");
  } else {
    if (!k.nationality) out.push("Nationality");
    if (!k.date_of_birth) out.push("Date of birth");
    if (!k.emirates_id_no && !k.passport_no) out.push("Emirates ID or passport number");
    if (k.emirates_id_no && !k.emirates_id_expiry) out.push("Emirates ID expiry");
    if (k.passport_no && !k.passport_expiry) out.push("Passport expiry");
    if (k.emirates_id_expiry && k.emirates_id_expiry < today) out.push("Emirates ID expired");
    if (k.passport_expiry && k.passport_expiry < today) out.push("Passport expired");
  }
  if (!k.id_doc_url && !k.passport_doc_url) out.push("Copy of ID / passport");
  if (k.is_pep === null || k.is_pep === undefined) out.push("PEP check");
  if (k.sanctions_result !== "clear") out.push(k.sanctions_result === "match" ? "Sanctions match — escalate" : "Sanctions screening");
  if (!k.source_of_funds) out.push("Source of funds");
  if (!k.payment_method) out.push("Payment method");
  if (!k.risk_rating) out.push("Risk rating");
  return out;
}

export function kycStatusOf(k: Partial<CrmKyc> | null | undefined): "missing" | "incomplete" | "complete" | "approved" {
  if (!k) return "missing";
  if (kycMissing(k).length) return "incomplete";
  return k.status === "approved" ? "approved" : "complete";
}

/* ---------------------------------------------------------------- deals */

export interface PlanInstalment { label: string; pct: number; due: string | null; paid_at: string | null }

export const DEAL_MILESTONES: Record<"sale" | "offplan" | "rent", { key: string; label: string }[]> = {
  sale: [
    { key: "form_b", label: "Form B signed (buyer agreement)" },
    { key: "form_f", label: "Form F / MOU signed" },
    { key: "deposit", label: "10% security deposit received" },
    { key: "noc_applied", label: "Developer NOC applied" },
    { key: "noc_received", label: "Developer NOC received" },
    { key: "mortgage", label: "Mortgage approval / bank clearance" },
    { key: "transfer_booked", label: "Transfer appointment booked" },
    { key: "title_deed", label: "Title deed issued" },
  ],
  offplan: [
    { key: "eoi", label: "EOI / booking paid" },
    { key: "spa", label: "SPA signed" },
    { key: "oqood", label: "Oqood registered" },
    { key: "commission_trigger", label: "Commission trigger payment reached" },
    { key: "developer_invoice", label: "Developer invoiced" },
  ],
  rent: [
    { key: "offer_accepted", label: "Offer accepted by landlord" },
    { key: "contract", label: "Tenancy contract signed" },
    { key: "cheques", label: "Cheques and deposit collected" },
    { key: "ejari", label: "Ejari registered" },
    { key: "keys", label: "Keys handed over" },
  ],
};

/* ---------------------------------------------------------------- invoices & rentals */

export interface CrmInvoice {
  id: string;
  created_at: string;
  number: string;
  deal_id: string | null;
  bill_to_name: string;
  bill_to_trn: string | null;
  bill_to_address: string | null;
  description: string;
  net_aed: number;
  vat_pct: number;
  vat_aed: number;
  total_aed: number;
  issue_date: string;
  due_date: string | null;
  status: "draft" | "sent" | "paid" | "void";
  paid_aed: number;
  paid_at: string | null;
  notes: string | null;
}

export interface Cheque { no: string; bank: string; date: string; amount: number; status: "pending" | "deposited" | "cleared" | "bounced" }

export interface CrmTenancy {
  id: string;
  created_at: string;
  deal_id: string | null;
  listing_id: string | null;
  landlord_contact_id: string | null;
  tenant_contact_id: string | null;
  agent_id: string | null;
  property_label: string;
  start_date: string;
  end_date: string;
  annual_rent_aed: number;
  cheques_count: number | null;
  security_deposit_aed: number | null;
  ejari_no: string | null;
  ejari_expiry: string | null;
  cheques: Cheque[];
  status: "active" | "renewing" | "renewed" | "ended";
  renewal_notice_sent_at: string | null;
  notes: string | null;
}

export interface CrmSourceSpend { id: string; created_at: string; month: string; source: string; amount_aed: number; notes: string | null }

export const daysLeft = daysUntil;
