import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Mail, Phone, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, Panel, EmptyState, StatCard } from "@/components/crm/ui-bits";
import { useCrm } from "@/lib/crm/provider";
import { accountName, formatShortDate, userName } from "@/lib/crm/selectors";
import type { Region } from "@/lib/crm/types";

export const Route = createFileRoute("/contacts")({
  head: () => ({
    meta: [{ title: "Contacts — Yo-Kai Express Sales OS" }],
  }),
  component: ContactsPage,
});

function ContactsPage() {
  const { db } = useCrm();
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<Region | "all">("all");
  const [owner, setOwner] = useState<string>("all");
  const [primaryOnly, setPrimaryOnly] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.contacts
      .filter((c) => {
        if (primaryOnly && !c.is_primary) return false;
        const acc = db.accounts.find((a) => a.id === c.account_id);
        if (region !== "all" && acc?.region !== region) return false;
        if (owner !== "all" && c.owner_user_id !== owner) return false;
        if (!q) return true;
        return (
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          accountName(db, c.account_id).toLowerCase().includes(q)
        );
      })
      .sort((a, b) => `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`));
  }, [db, query, region, owner, primaryOnly]);

  const primaryCount = db.contacts.filter((c) => c.is_primary).length;

  return (
    <>
      <PageHeader
        eyebrow="CRM"
        title="Contacts"
        description="People at your accounts. Primary contacts are the go-to decision makers."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Total contacts" value={db.contacts.length} />
        <StatCard label="Primary contacts" value={primaryCount} hint="One per account" tone="brand" />
        <StatCard label="Accounts covered" value={db.accounts.length} />
      </div>

      <Panel bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search name, email or account"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select value={region} onValueChange={(v) => setRegion(v as Region | "all")}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All regions</SelectItem>
              <SelectItem value="US">US</SelectItem>
              <SelectItem value="Asia">Asia</SelectItem>
            </SelectContent>
          </Select>
          <Select value={owner} onValueChange={setOwner}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All owners</SelectItem>
              {db.users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={primaryOnly}
              onChange={(e) => setPrimaryOnly(e.target.checked)}
              className="rounded border-border"
            />
            Primary only
          </label>
        </div>

        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Name</th>
                  <th className="px-4 py-2.5 text-left font-medium">Account</th>
                  <th className="px-4 py-2.5 text-left font-medium">Email</th>
                  <th className="px-4 py-2.5 text-left font-medium">Phone</th>
                  <th className="px-4 py-2.5 text-left font-medium">Owner</th>
                  <th className="px-4 py-2.5 text-left font-medium">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-surface-muted">
                    <td className="px-4 py-2.5">
                      <span className="font-medium">
                        {c.first_name} {c.last_name}
                      </span>
                      {c.is_primary && (
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-ember">
                          Primary
                        </span>
                      )}
                      {c.title && (
                        <p className="text-xs text-muted-foreground">{c.title}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        to="/accounts/$accountId"
                        params={{ accountId: c.account_id }}
                        className="hover:text-ember hover:underline"
                      >
                        {accountName(db, c.account_id)}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <a
                        href={`mailto:${c.email}`}
                        className="inline-flex items-center gap-1 text-info hover:underline"
                      >
                        <Mail className="size-3" /> {c.email}
                      </a>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 hover:underline">
                          <Phone className="size-3" /> {c.phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {userName(db, c.owner_user_id)}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatShortDate(c.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4">
            <EmptyState>No contacts match these filters.</EmptyState>
          </div>
        )}
      </Panel>
    </>
  );
}
