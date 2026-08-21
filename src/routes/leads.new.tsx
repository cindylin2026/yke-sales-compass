import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, Panel, Field } from "@/components/crm/ui-bits";
import { LeadScore } from "@/components/crm/badges";
import { useCrm } from "@/lib/crm/provider";
import { computeLeadScore, findLeadDuplicates } from "@/lib/crm/selectors";
import {
  ACCOUNT_SEGMENTS,
  LEAD_SOURCES,
  LEAD_STAGES,
  REGIONS,
  type AccountSegment,
  type LeadLifecycleStage,
  type LeadSource,
  type Region,
} from "@/lib/crm/types";

export const Route = createFileRoute("/leads/new")({
  head: () => ({
    meta: [{ title: "New Lead — Yo-Kai Express Sales OS" }],
  }),
  component: NewLeadPage,
});

function NewLeadPage() {
  const { db, currentUser, createLead } = useCrm();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyDomain, setCompanyDomain] = useState("");
  const [region, setRegion] = useState<Region>("North America");
  const [segment, setSegment] = useState<AccountSegment>("Unknown");
  const [source, setSource] = useState<LeadSource>("Manual Entry");
  const [sourceDetail, setSourceDetail] = useState("");
  const [campaignId, setCampaignId] = useState<string>("none");
  const [stage, setStage] = useState<LeadLifecycleStage>("New");
  const [ownerId, setOwnerId] = useState<string>(currentUser.id);
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);

  const activeCampaigns = db.campaigns.filter((c) => c.is_active);

  const leadScore = useMemo(
    () => computeLeadScore({ source, phone, title, company_domain: companyDomain }),
    [source, phone, title, companyDomain],
  );

  const duplicates = useMemo(
    () =>
      findLeadDuplicates(db, {
        email,
        companyDomain,
        companyName,
      }),
    [db, email, companyDomain, companyName],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !companyName.trim()) {
      toast.error("First name, last name, email and company are required.");
      return;
    }
    setSaving(true);
    const lead = await createLead({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      title: title.trim() || undefined,
      company_name: companyName.trim(),
      company_domain: companyDomain.trim() || undefined,
      region,
      segment,
      source,
      source_detail: sourceDetail.trim() || undefined,
      campaign_id: campaignId === "none" ? null : campaignId,
      lifecycle_stage: stage,
      lead_score: leadScore,
      owner_user_id: ownerId === "unassigned" ? null : ownerId,
      notes: notes.trim() || undefined,
      last_contacted_at: null,
      converted_at: null,
      converted_account_id: null,
      converted_contact_id: null,
      converted_opportunity_id: null,
    });
    toast.success(`Lead created — ${firstName} ${lastName}`);
    void navigate({ to: "/leads/$leadId", params: { leadId: lead.id } });
  };

  return (
    <>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to="/leads">
            <ArrowLeft className="size-4" /> All leads
          </Link>
        </Button>
      </div>

      <PageHeader
        eyebrow="Pipeline entry point"
        title="New lead"
        description="A lead is meaningful commercial interest. Fill in what you know — you can always add more later."
      />

      <form onSubmit={submit} className="mx-auto max-w-3xl space-y-5">
        {duplicates.length > 0 && (
          <div className="rounded-lg border border-warning/40 bg-warning/[0.07] p-4 ring-1 ring-warning/35">
            <div className="flex items-start gap-2.5">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-warning-foreground">
                  This looks like it might already exist
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Found {duplicates.length} possible match{duplicates.length > 1 ? "es" : ""} by
                  email or company. You can still create this lead if it&apos;s genuinely new.
                </p>
                <ul className="mt-2.5 space-y-1.5">
                  {duplicates.map((d) => (
                    <li key={`${d.kind}-${d.id}`}>
                      <Link
                        to={d.kind === "lead" ? "/leads/$leadId" : "/accounts/$accountId"}
                        params={d.kind === "lead" ? { leadId: d.id } : { accountId: d.id }}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs hover:border-ring/40"
                      >
                        <span className="font-medium">{d.label}</span>
                        <span className="text-muted-foreground">
                          {d.reason} · {d.detail}
                        </span>
                        <ArrowRight className="size-3 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <Panel title="Contact information">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name *">
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
                required
              />
            </Field>
            <Field label="Last name *">
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
                required
              />
            </Field>
            <Field label="Email *">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane.smith@example.com"
                required
              />
            </Field>
            <Field label="Phone">
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 415 555 0100"
              />
            </Field>
            <Field label="Job title">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Head of Food & Beverage"
              />
            </Field>
          </div>
        </Panel>

        <Panel title="Company">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name *">
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Marriott International"
                required
              />
            </Field>
            <Field label="Company domain">
              <Input
                value={companyDomain}
                onChange={(e) => setCompanyDomain(e.target.value)}
                placeholder="marriott.com"
              />
            </Field>
            <Field label="Region">
              <Select value={region} onValueChange={(v) => setRegion(v as Region)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Segment" hint="Leave as Unknown if you're not sure yet">
              <Select value={segment} onValueChange={(v) => setSegment(v as AccountSegment)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_SEGMENTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </Panel>

        <Panel title="Lead qualification">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Source *">
              <Select value={source} onValueChange={(v) => setSource(v as LeadSource)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Source detail" hint="Event name, referrer, ad campaign etc.">
              <Input
                value={sourceDetail}
                onChange={(e) => setSourceDetail(e.target.value)}
                placeholder="HITEC 2026 booth #412"
              />
            </Field>
            <Field label="Campaign">
              <Select value={campaignId} onValueChange={setCampaignId}>
                <SelectTrigger>
                  <SelectValue placeholder="No campaign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No campaign</SelectItem>
                  {activeCampaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Initial stage">
              <Select value={stage} onValueChange={(v) => setStage(v as LeadLifecycleStage)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Lead score" hint="Computed from source, phone, title and domain">
              <div className="flex h-9 items-center">
                <LeadScore value={leadScore} />
              </div>
            </Field>
            <Field label="Owner">
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {db.users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </Panel>

        <Panel title="Notes">
          <Field
            label="Internal notes"
            hint="What do you know about this prospect that isn't captured above?"
          >
            <Textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Met at HITEC. Runs a 400-room airport hotel. Keen on automation…"
            />
          </Field>
        </Panel>

        <div className="flex justify-end gap-3 pt-2">
          <Button asChild type="button" variant="outline">
            <Link to="/leads">Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create lead"}
          </Button>
        </div>
      </form>
    </>
  );
}
