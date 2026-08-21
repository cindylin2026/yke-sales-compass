import { useState } from "react";
import { Mail, Pencil, Phone } from "lucide-react";
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
import { Panel, DetailRow, Field } from "@/components/crm/ui-bits";
import { LeadScore, LifecycleBadge, FitScore, SourceBadge } from "@/components/crm/badges";
import { useCrm } from "@/lib/crm/provider";
import { formatDate, relativeDay, userName } from "@/lib/crm/selectors";
import { ACCOUNT_SEGMENTS, REGIONS } from "@/lib/crm/types";
import type { AccountSegment, Lead, Region } from "@/lib/crm/types";

/** Editable version of the "Lead details" panel — region, segment, source detail, notes. */
export function EditableLeadDetails({ lead }: { lead: Lead }) {
  const { db, currentUser, updateLeadDetails } = useCrm();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [region, setRegion] = useState<Region>(lead.region);
  const [segment, setSegment] = useState<AccountSegment>(lead.segment ?? "Unknown");
  const [market, setMarket] = useState(lead.market ?? "");
  const [sourceDetail, setSourceDetail] = useState(lead.source_detail ?? "");
  const [notes, setNotes] = useState(lead.notes ?? "");

  const isDisqualified = lead.lifecycle_stage === "Disqualified";
  const canEdit =
    currentUser.role === "manager" ||
    currentUser.role === "marketing" ||
    currentUser.role === "admin" ||
    currentUser.id === lead.owner_user_id;

  const startEdit = () => {
    setRegion(lead.region);
    setSegment(lead.segment ?? "Unknown");
    setMarket(lead.market ?? "");
    setSourceDetail(lead.source_detail ?? "");
    setNotes(lead.notes ?? "");
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateLeadDetails(lead.id, {
        region,
        segment,
        market: market.trim() || undefined,
        source_detail: sourceDetail.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success("Lead updated");
      setEditing(false);
    } catch (e) {
      toast.error("Failed to update lead", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <Panel
        title="Lead details"
        actions={
          canEdit && (
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil className="size-3.5" /> Edit
            </Button>
          )
        }
      >
        <div className="divide-y divide-border">
          <DetailRow label="Stage" value={<LifecycleBadge stage={lead.lifecycle_stage} />} />
          {isDisqualified && lead.disqualify_reason && (
            <DetailRow label="Disqualify reason" value={lead.disqualify_reason} />
          )}
          <DetailRow label="Lead Score" value={<LeadScore value={lead.lead_score} />} />
          {lead.site_fit_score != null && (
            <DetailRow
              label="Site Fit Score"
              value={<FitScore value={lead.site_fit_score} size="sm" />}
            />
          )}
          <DetailRow label="Source" value={<SourceBadge source={lead.source} />} />
          {lead.source_detail && <DetailRow label="Source detail" value={lead.source_detail} />}
          <DetailRow label="Segment" value={lead.segment ?? "Unknown"} />
          <DetailRow label="Owner" value={userName(db, lead.owner_user_id)} />
          <DetailRow label="Region" value={lead.region} />
          {lead.market && <DetailRow label="Market" value={lead.market} />}
          <DetailRow label="Created" value={formatDate(lead.created_at)} />
          <DetailRow
            label="Last contacted"
            value={lead.last_contacted_at ? relativeDay(lead.last_contacted_at) : "Never"}
          />
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Edit lead details">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
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
          <Field label="Segment">
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
        <Field label="Market">
          <Input value={market} onChange={(e) => setMarket(e.target.value)} />
        </Field>
        <Field label="Source detail">
          <Input value={sourceDetail} onChange={(e) => setSourceDetail(e.target.value)} />
        </Field>
        <Field label="Notes">
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </Panel>
  );
}

/** Editable version of the "Contact info" panel — name, email, phone, title, company. */
export function EditableLeadContactInfo({ lead }: { lead: Lead }) {
  const { currentUser, updateLeadDetails } = useCrm();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState(lead.first_name);
  const [lastName, setLastName] = useState(lead.last_name);
  const [email, setEmail] = useState(lead.email);
  const [phone, setPhone] = useState(lead.phone ?? "");
  const [title, setTitle] = useState(lead.title ?? "");
  const [companyName, setCompanyName] = useState(lead.company_name);
  const [companyDomain, setCompanyDomain] = useState(lead.company_domain ?? "");

  const canEdit =
    currentUser.role === "manager" ||
    currentUser.role === "marketing" ||
    currentUser.role === "admin" ||
    currentUser.id === lead.owner_user_id;

  const startEdit = () => {
    setFirstName(lead.first_name);
    setLastName(lead.last_name);
    setEmail(lead.email);
    setPhone(lead.phone ?? "");
    setTitle(lead.title ?? "");
    setCompanyName(lead.company_name);
    setCompanyDomain(lead.company_domain ?? "");
    setEditing(true);
  };

  const save = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !companyName.trim()) {
      toast.error("First name, last name, email and company are required.");
      return;
    }
    setSaving(true);
    try {
      await updateLeadDetails(lead.id, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        title: title.trim() || undefined,
        company_name: companyName.trim(),
        company_domain: companyDomain.trim() || undefined,
      });
      toast.success("Lead updated");
      setEditing(false);
    } catch (e) {
      toast.error("Failed to update lead", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <Panel
        title="Contact info"
        actions={
          canEdit && (
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil className="size-3.5" /> Edit
            </Button>
          )
        }
      >
        <div className="space-y-2">
          <a
            href={`mailto:${lead.email}`}
            className="flex min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-surface-muted"
          >
            <Mail className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{lead.email}</span>
          </a>
          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-surface-muted"
            >
              <Phone className="size-4 text-muted-foreground" />
              {lead.phone}
            </a>
          )}
        </div>
        <div className="mt-3 divide-y divide-border">
          <DetailRow label="Company" value={lead.company_name} />
          {lead.company_domain && (
            <DetailRow
              label="Domain"
              value={
                <a
                  href={`https://${lead.company_domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-info hover:underline"
                >
                  {lead.company_domain}
                </a>
              }
            />
          )}
          {lead.title && <DetailRow label="Title" value={lead.title} />}
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Edit contact info">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name">
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </Field>
          <Field label="Last name">
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </Field>
        </div>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Company name">
          <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </Field>
        <Field label="Company domain">
          <Input value={companyDomain} onChange={(e) => setCompanyDomain(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </Panel>
  );
}
