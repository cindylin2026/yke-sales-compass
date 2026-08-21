import { useState } from "react";
import { Pencil } from "lucide-react";
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
import { AccountStatusBadge, FitScore } from "@/components/crm/badges";
import { useCrm } from "@/lib/crm/provider";
import { formatDate, userName } from "@/lib/crm/selectors";
import { ACCOUNT_SEGMENTS, REGIONS } from "@/lib/crm/types";
import type { Account, AccountSegment, AccountStatus, Region } from "@/lib/crm/types";

const STATUSES: AccountStatus[] = ["Target", "Active Prospect", "Customer", "On Hold", "Churned"];

export function EditableAccountDetails({ account }: { account: Account }) {
  const { db, currentUser, updateAccount } = useCrm();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(account.name);
  const [domain, setDomain] = useState(account.domain ?? "");
  const [segment, setSegment] = useState<AccountSegment>(account.segment);
  const [region, setRegion] = useState<Region>(account.region);
  const [market, setMarket] = useState(account.market ?? "");
  const [country, setCountry] = useState(account.country);
  const [city, setCity] = useState(account.city ?? "");
  const [status, setStatus] = useState<AccountStatus>(account.status);
  const [employeeCount, setEmployeeCount] = useState(account.employee_count ?? 0);
  const [locationsCount, setLocationsCount] = useState(account.locations_count ?? 0);
  const [notes, setNotes] = useState(account.notes ?? "");

  const canEdit =
    currentUser.role === "manager" ||
    currentUser.role === "admin" ||
    currentUser.id === account.owner_user_id;

  const startEdit = () => {
    setName(account.name);
    setDomain(account.domain ?? "");
    setSegment(account.segment);
    setRegion(account.region);
    setMarket(account.market ?? "");
    setCountry(account.country);
    setCity(account.city ?? "");
    setStatus(account.status);
    setEmployeeCount(account.employee_count ?? 0);
    setLocationsCount(account.locations_count ?? 0);
    setNotes(account.notes ?? "");
    setEditing(true);
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error("Account name is required.");
      return;
    }
    setSaving(true);
    try {
      await updateAccount(account.id, {
        name: name.trim(),
        domain: domain.trim() || undefined,
        segment,
        region,
        market: market.trim() || undefined,
        country: country.trim(),
        city: city.trim() || undefined,
        status,
        employee_count: employeeCount || undefined,
        locations_count: locationsCount || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success("Account updated");
      setEditing(false);
    } catch (e) {
      toast.error("Failed to update account", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <Panel
        title="Account details"
        actions={
          canEdit && (
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil className="size-3.5" /> Edit
            </Button>
          )
        }
      >
        <div className="flex flex-col items-center gap-3 pb-4">
          <FitScore value={account.account_fit_score} size="lg" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Account Fit Score</p>
            <p className="text-xs text-muted-foreground">ICP alignment</p>
          </div>
          <AccountStatusBadge status={account.status} />
        </div>
        <div className="divide-y divide-border">
          <DetailRow label="Segment" value={account.segment} />
          <DetailRow label="Region" value={account.region} />
          <DetailRow label="Country" value={account.country} />
          {account.city && <DetailRow label="City" value={account.city} />}
          {account.employee_count && (
            <DetailRow label="Employees" value={account.employee_count.toLocaleString()} />
          )}
          {account.locations_count && (
            <DetailRow label="Locations" value={account.locations_count} />
          )}
          {account.market && <DetailRow label="Market" value={account.market} />}
          {account.operating_days_per_year && (
            <DetailRow
              label="Operating profile"
              value={`${account.operating_hours_per_day}h/day · ${account.operating_days_per_year} days/yr`}
            />
          )}
          <DetailRow label="Owner" value={userName(db, account.owner_user_id)} />
          <DetailRow label="Created" value={formatDate(account.created_at)} />
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Edit account details">
      <div className="space-y-3">
        <Field label="Account name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Domain">
          <Input value={domain} onChange={(e) => setDomain(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
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
          <Field label="Status">
            <Select value={status} onValueChange={(v) => setStatus(v as AccountStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <Field label="Market">
            <Input value={market} onChange={(e) => setMarket(e.target.value)} />
          </Field>
          <Field label="Country">
            <Input value={country} onChange={(e) => setCountry(e.target.value)} />
          </Field>
          <Field label="City">
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </Field>
          <Field label="Employees">
            <Input
              type="number"
              min={0}
              value={employeeCount}
              onChange={(e) => setEmployeeCount(Math.max(0, Number(e.target.value)))}
            />
          </Field>
          <Field label="Locations">
            <Input
              type="number"
              min={0}
              value={locationsCount}
              onChange={(e) => setLocationsCount(Math.max(0, Number(e.target.value)))}
            />
          </Field>
        </div>
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
