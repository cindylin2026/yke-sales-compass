/**
 * Deterministic mock dataset. Replaced by Supabase queries later — nothing in
 * the UI reads this file directly, only the repository in ./provider.tsx does.
 */
import type {
  Account,
  AccountSegment,
  AccountStatus,
  Campaign,
  Contact,
  CrmDatabase,
  Interaction,
  InteractionType,
  Lead,
  LeadLifecycleStage,
  LeadSource,
  Opportunity,
  OpportunityStage,
  Region,
  Task,
  TaskType,
  User,
} from "./types";
import { computeOpportunityAmount } from "./selectors";

/** Seeded PRNG so server and client render identical data. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const rand = rng(20260817);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!;
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

function today() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
export function dayOffset(days: number): string {
  const d = today();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function stampOffset(days: number, hour = 10): string {
  const d = today();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

export const users: User[] = [
  {
    id: "usr_cindy",
    full_name: "Cindy Lam",
    email: "cindy@yokaiexpress.com",
    role: "sales_rep",
    region: "North America",
    title: "Senior Account Executive",
    avatar_initials: "CL",
    active: true,
  },
  {
    id: "usr_marcus",
    full_name: "Marcus Reed",
    email: "marcus@yokaiexpress.com",
    role: "sales_rep",
    region: "North America",
    title: "Account Executive",
    avatar_initials: "MR",
    active: true,
  },
  {
    id: "usr_yuki",
    full_name: "Yuki Tanaka",
    email: "yuki@yokaiexpress.com",
    role: "sales_rep",
    region: "Southeast Asia",
    title: "Account Executive, APAC",
    avatar_initials: "YT",
    active: true,
  },
  {
    id: "usr_dana",
    full_name: "Dana Whitfield",
    email: "dana@yokaiexpress.com",
    role: "manager",
    region: "North America",
    title: "VP Global Sales",
    avatar_initials: "DW",
    active: true,
  },
  {
    id: "usr_priya",
    full_name: "Priya Nair",
    email: "priya@yokaiexpress.com",
    role: "marketing",
    region: "Global" as unknown as Region,
    title: "Demand Generation Lead",
    avatar_initials: "PN",
    active: true,
  },
  {
    id: "usr_admin",
    full_name: "Sam Ortega",
    email: "sam@yokaiexpress.com",
    role: "admin",
    region: "North America",
    title: "Revenue Operations",
    avatar_initials: "SO",
    active: true,
  },
];

export const campaigns: Campaign[] = [
  {
    id: "cmp_nra26",
    name: "NRA Show 2026 — Chicago",
    channel: "Trade Show",
    region: "North America",
    start_date: dayOffset(-60),
    end_date: dayOffset(-56),
    budget: 85000,
    is_active: false,
  },
  {
    id: "cmp_wix_q3",
    name: "Wix Site — Q3 Inbound",
    channel: "Website",
    region: "Global",
    start_date: dayOffset(-120),
    end_date: null,
    budget: 12000,
    is_active: true,
  },
  {
    id: "cmp_li_hotels",
    name: "LinkedIn — Hotel F&B Directors",
    channel: "Paid Social",
    region: "North America",
    start_date: dayOffset(-45),
    end_date: null,
    budget: 30000,
    is_active: true,
  },
  {
    id: "cmp_apac_expo",
    name: "FHA Food & Beverage Singapore",
    channel: "Event",
    region: "Southeast Asia",
    start_date: dayOffset(-30),
    end_date: dayOffset(-27),
    budget: 60000,
    is_active: false,
  },
  {
    id: "cmp_campus",
    name: "Campus Dining Webinar Series",
    channel: "Event",
    region: "North America",
    start_date: dayOffset(-20),
    end_date: dayOffset(10),
    budget: 15000,
    is_active: true,
  },
  {
    id: "cmp_outbound_air",
    name: "Outbound — Airport Concessions",
    channel: "Outbound",
    region: "Global",
    start_date: dayOffset(-90),
    end_date: null,
    budget: 0,
    is_active: true,
  },
  {
    id: "cmp_partner_dist",
    name: "Distributor Partner Referrals",
    channel: "Partner",
    region: "Southeast Asia",
    start_date: dayOffset(-150),
    end_date: null,
    budget: 5000,
    is_active: true,
  },
  {
    id: "cmp_email_reheat",
    name: "Email Nurture — Reheat 2026",
    channel: "Email",
    region: "Global",
    start_date: dayOffset(-14),
    end_date: dayOffset(45),
    budget: 8000,
    is_active: true,
  },
];

const accountSeeds: Array<
  [string, string, AccountSegment, Region, string, string, AccountStatus, number]
> = [
  [
    "ABC Hotel Group",
    "abchotelgroup.com",
    "Hotel",
    "North America",
    "United States",
    "Los Angeles",
    "Active Prospect",
    92,
  ],
  [
    "Hilton Pacific Properties",
    "hiltonpacific.com",
    "Hotel",
    "North America",
    "United States",
    "San Francisco",
    "Customer",
    88,
  ],
  [
    "SkyGate Airport Concessions",
    "skygateconcessions.com",
    "Airport",
    "North America",
    "United States",
    "Dallas",
    "Active Prospect",
    84,
  ],
  [
    "Stanford Campus Dining",
    "stanforddining.edu",
    "University",
    "North America",
    "United States",
    "Palo Alto",
    "Customer",
    79,
  ],
  [
    "Mercy General Health",
    "mercygeneral.org",
    "Healthcare",
    "North America",
    "United States",
    "Sacramento",
    "Target",
    71,
  ],
  [
    "Northline Tech Campus",
    "northline.io",
    "Office / Corporate",
    "North America",
    "United States",
    "Seattle",
    "Active Prospect",
    68,
  ],
  [
    "QuickStop Retail Partners",
    "quickstopretail.com",
    "Convenience Retail",
    "North America",
    "United States",
    "Phoenix",
    "Target",
    64,
  ],
  [
    "Sakura Rail Kiosks",
    "sakurarail.co.jp",
    "Convenience Retail",
    "Southeast Asia",
    "Japan",
    "Tokyo",
    "Customer",
    90,
  ],
  [
    "Changi Terminal Ventures",
    "changiventures.sg",
    "Airport",
    "Southeast Asia",
    "Singapore",
    "Singapore",
    "Active Prospect",
    86,
  ],
  [
    "Taipei Medical Center",
    "tpemedical.tw",
    "Healthcare",
    "Southeast Asia",
    "Taiwan",
    "Taipei",
    "Active Prospect",
    74,
  ],
  [
    "Grand Han Hospitality",
    "grandhan.kr",
    "Hotel",
    "North Asia",
    "South Korea",
    "Seoul",
    "Target",
    70,
  ],
  [
    "Lion City Distributors",
    "lioncitydist.sg",
    "Distributor",
    "Southeast Asia",
    "Singapore",
    "Singapore",
    "Customer",
    81,
  ],
  [
    "Vertex Arena Group",
    "vertexarena.com",
    "Entertainment",
    "North America",
    "United States",
    "Denver",
    "Target",
    58,
  ],
  [
    "Nanyang University Services",
    "nyuserv.edu.sg",
    "University",
    "Southeast Asia",
    "Singapore",
    "Singapore",
    "On Hold",
    62,
  ],
];

export const accounts: Account[] = accountSeeds.map(
  ([name, domain, segment, region, country, city, status, score], i) => ({
    id: `acc_${String(i + 1).padStart(3, "0")}`,
    name,
    domain,
    segment,
    region,
    country,
    city,
    status,
    account_fit_score: score,
    employee_count: int(120, 9000),
    locations_count: int(2, 140),
    owner_user_id:
      region === "Southeast Asia" ? "usr_yuki" : i % 2 === 0 ? "usr_cindy" : "usr_marcus",
    created_at: stampOffset(-int(120, 500)),
    notes:
      "Multi-site operator evaluating automated hot-food kiosks for 24/7 coverage where staffed kitchens are not viable.",
  }),
);

const firstNames = [
  "John",
  "Sarah",
  "Kenji",
  "Mei",
  "David",
  "Amara",
  "Luis",
  "Hana",
  "Priyanka",
  "Tom",
  "Grace",
  "Ravi",
  "Elena",
  "Jun",
];
const lastNames = [
  "Smith",
  "Chen",
  "Watanabe",
  "Lin",
  "Okafor",
  "Garcia",
  "Kim",
  "Patel",
  "Novak",
  "Alvarez",
  "Tan",
  "Brooks",
];
const titles = [
  "VP Operations",
  "F&B Director",
  "Director of Procurement",
  "General Manager",
  "Head of Retail",
  "Facilities Director",
  "Category Manager",
  "Chief Operating Officer",
];

export const contacts: Contact[] = [];
accounts.forEach((acc, ai) => {
  const count = int(2, 3);
  for (let c = 0; c < count; c++) {
    const fn = pick(firstNames);
    const ln = pick(lastNames);
    contacts.push({
      id: `con_${String(ai + 1).padStart(3, "0")}_${c + 1}`,
      account_id: acc.id,
      first_name: fn,
      last_name: ln,
      title: pick(titles),
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@${acc.domain}`,
      phone: `+1 415 555 0${int(100, 999)}`,
      is_primary: c === 0,
      owner_user_id: acc.owner_user_id,
      created_at: stampOffset(-int(20, 400)),
    });
  }
});
// Named contacts for the flagship Account 360 example.
contacts[0] = {
  ...contacts[0]!,
  first_name: "John",
  last_name: "Smith",
  title: "VP Operations",
  email: "john.smith@abchotelgroup.com",
};
contacts[1] = {
  ...contacts[1]!,
  first_name: "Sarah",
  last_name: "Chen",
  title: "F&B Director",
  email: "sarah.chen@abchotelgroup.com",
};

const companyPool = [
  ["Marriott Bay Center", "marriottbaycenter.com", "Hotel", "North America", "United States"],
  [
    "Union Station Retail",
    "unionstationretail.com",
    "Convenience Retail",
    "North America",
    "United States",
  ],
  ["Pacific Coast Health", "pchealth.org", "Healthcare", "North America", "United States"],
  [
    "Cascade Tech Offices",
    "cascadetech.com",
    "Office / Corporate",
    "North America",
    "United States",
  ],
  ["Osaka Metro Retail", "osakametro.jp", "Convenience Retail", "North Asia", "Japan"],
  ["Bangkok Airport Services", "bkkservices.th", "Airport", "Southeast Asia", "Thailand"],
  ["Kyoto Grand Stay", "kyotograndstay.jp", "Hotel", "North Asia", "Japan"],
  ["Seoul Sports Complex", "seoulsports.kr", "Entertainment", "North Asia", "South Korea"],
  ["Desert Ridge Campus", "desertridge.edu", "University", "North America", "United States"],
  ["Harborview Hospital", "harborview.org", "Healthcare", "North America", "United States"],
  ["Nova Cinemas", "novacinemas.com", "Entertainment", "North America", "United States"],
  ["Peak Fuel Stops", "peakfuelstops.com", "Convenience Retail", "North America", "United States"],
  ["Hanoi Rail Group", "hanoirail.vn", "Convenience Retail", "Southeast Asia", "Vietnam"],
  ["Manila Bay Hotels", "manilabayhotels.ph", "Hotel", "Southeast Asia", "Philippines"],
] as const;

const sources: LeadSource[] = [
  "Wix Website Inquiry",
  "Event Registration",
  "Trade Show",
  "LinkedIn",
  "Social Media",
  "Referral",
  "Partner",
  "Outbound",
  "Manual Entry",
];
const sourceDetail: Record<string, string[]> = {
  "Wix Website Inquiry": [
    "Contact form — Pricing page",
    "Contact form — Request demo",
    "Newsletter signup + reply",
  ],
  "Event Registration": ["Campus Dining Webinar", "Reheat 2026 virtual session"],
  "Trade Show": ["NRA Show booth 2418", "FHA Singapore booth C12"],
  LinkedIn: ["Sponsored InMail reply", "Lead Gen Form", "Inbound DM from post"],
  "Social Media": ["Instagram DM inquiry", "Comment thread follow-up"],
  Referral: ["Referred by Sakura Rail", "Referred by existing GM"],
  Partner: ["Lion City Distributors intro", "Reseller-sourced"],
  Outbound: ["Cold email sequence 4", "Cold call — concessions list"],
  "Manual Entry": ["Phone-in inquiry", "Conference hallway conversation"],
};

const stagePlan: LeadLifecycleStage[] = [
  ...Array<LeadLifecycleStage>(11).fill("New"),
  ...Array<LeadLifecycleStage>(9).fill("MQL"),
  ...Array<LeadLifecycleStage>(7).fill("SAL"),
  ...Array<LeadLifecycleStage>(6).fill("SQL"),
  ...Array<LeadLifecycleStage>(5).fill("Converted"),
  "Disqualified",
  "Disqualified",
];

export const leads: Lead[] = stagePlan.map((stage, i) => {
  const [company, domain, , region, country] = pick(companyPool);
  const fn = pick(firstNames);
  const ln = pick(lastNames);
  const src = pick(sources);
  const created = -int(1, 90);
  const owner =
    stage === "New" && rand() > 0.6
      ? null
      : region === "Southeast Asia"
        ? "usr_yuki"
        : rand() > 0.5
          ? "usr_cindy"
          : "usr_marcus";
  const order: LeadLifecycleStage[] = ["New", "MQL", "SAL", "SQL", "Converted"];
  const upTo = order.indexOf(stage) === -1 ? 1 : order.indexOf(stage) + 1;
  const history = order.slice(0, upTo).map((s, idx) => ({
    stage: s,
    changed_at: stampOffset(created + idx * 3, 9 + idx),
    changed_by_user_id: idx === 0 ? "usr_priya" : (owner ?? "usr_dana"),
    note: idx === 0 ? `Created from ${src}` : undefined,
  }));
  if (stage === "Disqualified") {
    history.push({
      stage: "Disqualified",
      changed_at: stampOffset(created + 5),
      changed_by_user_id: owner ?? "usr_dana",
      note: "No budget this cycle",
    });
  }
  return {
    id: `lea_${String(i + 1).padStart(3, "0")}`,
    first_name: fn,
    last_name: ln,
    email: `${fn.toLowerCase()}.${ln.toLowerCase()}@${domain}`,
    phone: `+1 628 555 0${int(100, 999)}`,
    title: pick(titles),
    company_name: company,
    company_domain: domain,
    region: region as Region,
    source: src,
    source_detail: pick(sourceDetail[src] ?? ["—"]),
    campaign_id: pick(campaigns).id,
    lifecycle_stage: stage,
    lead_score:
      stage === "SQL"
        ? int(72, 96)
        : stage === "SAL"
          ? int(58, 84)
          : stage === "MQL"
            ? int(45, 76)
            : int(12, 62),
    owner_user_id: owner,
    notes: `${country} operator asking about footprint, power requirements and menu localization.`,
    created_at: stampOffset(created, 8),
    last_contacted_at: stage === "New" ? null : stampOffset(created + int(1, 6), 14),
    lifecycle_history: history,
    converted_at: null,
    converted_account_id: null,
    converted_contact_id: null,
    converted_opportunity_id: null,
  };
});

// Wire the pre-converted leads to real records so the audit trail is truthful.
leads
  .filter((l) => l.lifecycle_stage === "Converted")
  .forEach((l, i) => {
    const acc = accounts[i % accounts.length]!;
    const con = contacts.find((c) => c.account_id === acc.id)!;
    l.company_name = acc.name;
    l.company_domain = acc.domain;
    l.region = acc.region;
    l.converted_at = stampOffset(-int(5, 40));
    l.converted_account_id = acc.id;
    l.converted_contact_id = con.id;
  });

const oppNames = [
  "Lobby kiosk pilot — 4 units",
  "Terminal concourse rollout",
  "Campus late-night dining",
  "Night-shift staff cafeteria",
  "Rail kiosk expansion",
  "Hotel grab-and-go program",
  "Arena concourse pilot",
  "Distributor stocking order",
];
const stages: OpportunityStage[] = [
  "Discovery",
  "Discovery",
  "Discovery",
  "Proposal",
  "Proposal",
  "Proposal",
  "Negotiation",
  "Negotiation",
  "Won",
  "Won",
  "Won",
  "Lost",
];

export const opportunities: Opportunity[] = [];
stages.forEach((stage, i) => {
  const acc = accounts[i % accounts.length]!;
  const con = contacts.find((c) => c.account_id === acc.id)!;
  const closed = stage === "Won" || stage === "Lost";
  const boba_machine_qty = int(0, 2);
  const ramen_machine_qty = int(0, 3);
  opportunities.push({
    id: `opp_${String(i + 1).padStart(3, "0")}`,
    name: `${acc.name} — ${oppNames[i % oppNames.length]}`,
    account_id: acc.id,
    primary_contact_id: con.id,
    owner_user_id: acc.owner_user_id,
    stage,
    boba_machine_qty,
    ramen_machine_qty,
    amount: computeOpportunityAmount({ boba_machine_qty, ramen_machine_qty }),
    probability:
      stage === "Won"
        ? 100
        : stage === "Lost"
          ? 0
          : stage === "Negotiation"
            ? int(60, 80)
            : stage === "Proposal"
              ? int(35, 55)
              : int(10, 30),
    expected_close_date: dayOffset(closed ? -int(3, 60) : int(-9, 90)),
    next_action: closed
      ? undefined
      : pick([
          "Send revised pricing",
          "Schedule site survey",
          "Confirm power spec",
          "Follow up on legal review",
        ]),
    region: acc.region,
    created_at: stampOffset(-int(30, 200)),
    closed_at: closed ? stampOffset(-int(3, 50)) : null,
  });
});
// Extra flagship opportunities on ABC Hotel Group for the Account 360 example.
opportunities.push(
  {
    id: "opp_101",
    name: "ABC Hotel Group — 12-property rollout",
    account_id: "acc_001",
    primary_contact_id: contacts[0]!.id,
    owner_user_id: "usr_cindy",
    stage: "Proposal",
    boba_machine_qty: 2,
    ramen_machine_qty: 3,
    amount: computeOpportunityAmount({ boba_machine_qty: 2, ramen_machine_qty: 3 }),
    probability: 55,
    expected_close_date: dayOffset(24),
    next_action: "Send proposal v2 with 12-property pricing",
    region: "North America",
    created_at: stampOffset(-64),
    closed_at: null,
  },
  {
    id: "opp_102",
    name: "ABC Hotel Group — Airport shuttle lounge",
    account_id: "acc_001",
    primary_contact_id: contacts[1]!.id,
    owner_user_id: "usr_cindy",
    stage: "Discovery",
    boba_machine_qty: 1,
    ramen_machine_qty: 0,
    amount: computeOpportunityAmount({ boba_machine_qty: 1, ramen_machine_qty: 0 }),
    probability: 20,
    expected_close_date: dayOffset(58),
    next_action: "Discovery call with facilities team",
    region: "North America",
    created_at: stampOffset(-18),
    closed_at: null,
  },
);

const interactionTypes: InteractionType[] = [
  "Email",
  "Call",
  "Meeting",
  "Demo",
  "LinkedIn",
  "Event",
  "Other",
];
export const interactions: Interaction[] = [];
for (let i = 0; i < 46; i++) {
  const type = pick(interactionTypes);
  const onLead = rand() < 0.35;
  const lead = pick(leads.filter((l) => l.lifecycle_stage !== "Converted"));
  const opp = pick(opportunities);
  const acc = accounts.find((a) => a.id === opp.account_id)!;
  const con = contacts.find((c) => c.account_id === acc.id)!;
  const isMeeting = type === "Meeting" || type === "Demo";
  interactions.push({
    id: `int_${String(i + 1).padStart(3, "0")}`,
    type,
    occurred_at: stampOffset(-int(0, 30), int(8, 18)),
    owner_user_id: onLead ? lead.owner_user_id : acc.owner_user_id,
    account_id: onLead ? null : acc.id,
    contact_id: onLead ? null : con.id,
    lead_id: onLead ? lead.id : null,
    opportunity_id: onLead || rand() < 0.4 ? null : opp.id,
    subject: onLead
      ? `${type} with ${lead.first_name} ${lead.last_name} (${lead.company_name})`
      : `${type} — ${acc.name}`,
    notes: pick([
      "Walked through unit footprint, power draw and service cadence. Ops team wants a 90-day pilot before committing.",
      "Discussed menu localization and restocking logistics with the distributor.",
      "Reviewed pricing tiers; procurement needs a formal quote for the finance committee.",
      "Site survey scheduled. Two locations have suitable 220V drops.",
    ]),
    next_steps: pick([
      "Send pilot scope + pricing",
      "Book site survey",
      "Introduce distributor partner",
      "Share ROI model",
    ]),
    next_action: pick(["Send proposal", "Follow up call", "Schedule demo", "Share case study"]),
    next_action_due_date: dayOffset(int(-4, 12)),
    source_doc_url:
      isMeeting && rand() < 0.5
        ? "https://docs.google.com/document/d/1yke-meeting-notes-example/edit"
        : null,
    ai_summary:
      isMeeting && rand() < 0.35
        ? "Buying committee is operations-led. Primary driver is 24/7 food coverage without added labor. Blocker: capital approval timing in Q4."
        : null,
    ai_summary_status: isMeeting && rand() < 0.35 ? "ready" : "none",
    created_at: stampOffset(-int(0, 30)),
  });
}

const taskTypes: TaskType[] = [
  "Call",
  "Email",
  "Meeting",
  "Follow-up",
  "Send Proposal",
  "Demo",
  "Other",
];
export const tasks: Task[] = [];
const taskOffsets = [
  -6, -4, -3, -1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 3, 4, 5, 6, 8, 9, 11, 14, -2, -5, 2, 3, 7, 12, 0, 1,
];
taskOffsets.forEach((off, i) => {
  const useLead = rand() < 0.4;
  const lead = pick(leads.filter((l) => l.lifecycle_stage !== "Converted"));
  const opp = pick(opportunities.filter((o) => o.stage !== "Won" && o.stage !== "Lost"));
  const acc = accounts.find((a) => a.id === opp.account_id)!;
  const con = contacts.find((c) => c.account_id === acc.id)!;
  const type = pick(taskTypes);
  tasks.push({
    id: `tsk_${String(i + 1).padStart(3, "0")}`,
    title: useLead
      ? `${type} — ${lead.first_name} ${lead.last_name} at ${lead.company_name}`
      : `${type} — ${acc.name}`,
    type,
    owner_user_id: useLead ? (lead.owner_user_id ?? "usr_cindy") : acc.owner_user_id,
    lead_id: useLead ? lead.id : null,
    account_id: useLead ? null : acc.id,
    contact_id: useLead ? null : con.id,
    opportunity_id: useLead ? null : rand() < 0.6 ? opp.id : null,
    due_date: dayOffset(off),
    status: rand() < 0.15 ? "Completed" : "Open",
    next_action: pick([
      "Confirm pilot scope",
      "Get quote approved",
      "Re-engage after budget cycle",
      "Share install checklist",
    ]),
    priority: rand() < 0.3 ? "High" : rand() < 0.8 ? "Normal" : "Low",
    created_at: stampOffset(off - int(3, 20)),
    completed_at: null,
  });
});
// Guarantee the flagship follow-ups from the Account 360 spec exist.
tasks.push(
  {
    id: "tsk_101",
    title: "Send proposal — ABC Hotel Group",
    type: "Send Proposal",
    owner_user_id: "usr_cindy",
    lead_id: null,
    account_id: "acc_001",
    contact_id: contacts[0]!.id,
    opportunity_id: "opp_101",
    due_date: dayOffset(2),
    status: "Open",
    next_action: "Attach 12-property pricing grid",
    priority: "High",
    created_at: stampOffset(-4),
    completed_at: null,
  },
  {
    id: "tsk_102",
    title: "Follow up with John Smith",
    type: "Follow-up",
    owner_user_id: "usr_cindy",
    lead_id: null,
    account_id: "acc_001",
    contact_id: contacts[0]!.id,
    opportunity_id: "opp_101",
    due_date: dayOffset(4),
    status: "Open",
    next_action: "Confirm exec review date",
    priority: "Normal",
    created_at: stampOffset(-2),
    completed_at: null,
  },
);

export function createSeedDatabase(): CrmDatabase {
  return {
    users,
    accounts,
    contacts,
    leads,
    opportunities,
    interactions,
    tasks,
    campaigns,
  };
}

const _unusedStatus: AccountStatus[] = [];
void _unusedStatus;
