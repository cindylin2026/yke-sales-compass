import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, Panel, StatCard } from "@/components/crm/ui-bits";
import { InviteUserDialog, ROLE_LABELS } from "@/components/crm/InviteUserDialog";
import { useCrm } from "@/lib/crm/provider";
import { REGIONS, USER_ROLES, type Region, type UserRole } from "@/lib/crm/types";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [{ title: "Team — Yo-Kai Express Sales OS" }],
  }),
  component: TeamPage,
});

function TeamPage() {
  const { db, currentUser, updateUserProfile } = useCrm();
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const rows = db.users
    .filter((u) => !q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  const activeCount = db.users.filter((u) => u.active).length;

  const handleUpdate = async (
    userId: string,
    patch: Partial<Pick<(typeof db.users)[number], "role" | "region" | "active">>,
  ) => {
    setSavingId(userId);
    try {
      await updateUserProfile(userId, patch);
    } catch (e) {
      toast.error("Failed to update teammate", { description: (e as Error).message });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Team"
        description="Manage teammates, roles and regions."
        actions={<InviteUserDialog />}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Total teammates" value={db.users.length} />
        <StatCard label="Active" value={activeCount} tone="success" />
        <StatCard label="Inactive" value={db.users.length - activeCount} />
      </div>

      <Panel bodyClassName="p-0">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search name or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Name</th>
                <th className="px-4 py-2.5 text-left font-medium">Email</th>
                <th className="px-4 py-2.5 text-left font-medium">Role</th>
                <th className="px-4 py-2.5 text-left font-medium">Region</th>
                <th className="px-4 py-2.5 text-left font-medium">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((u) => {
                const isSelf = u.id === currentUser.id;
                const saving = savingId === u.id;
                return (
                  <tr key={u.id} className="transition-colors hover:bg-surface-muted">
                    <td className="px-4 py-2.5">
                      <span className="font-medium">{u.full_name}</span>
                      {isSelf && (
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          You
                        </span>
                      )}
                      {u.title && <p className="text-xs text-muted-foreground">{u.title}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-2.5">
                      <Select
                        value={u.role}
                        disabled={isSelf || saving}
                        onValueChange={(v) => void handleUpdate(u.id, { role: v as UserRole })}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {USER_ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-2.5">
                      <Select
                        value={u.region}
                        disabled={saving}
                        onValueChange={(v) => void handleUpdate(u.id, { region: v as Region })}
                      >
                        <SelectTrigger className="w-[110px]">
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
                    </td>
                    <td className="px-4 py-2.5">
                      <Switch
                        checked={u.active}
                        disabled={isSelf || saving}
                        onCheckedChange={(checked) => void handleUpdate(u.id, { active: checked })}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
