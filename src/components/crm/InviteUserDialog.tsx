import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/crm/ui-bits";
import { supabase } from "@/lib/supabase/client";
import { inviteTeamMember } from "@/lib/supabase/admin";
import { REGIONS, USER_ROLES, type Region, type UserRole } from "@/lib/crm/types";

const ROLE_LABELS: Record<UserRole, string> = {
  sales_rep: "Sales Rep",
  manager: "Manager",
  marketing: "Marketing",
  admin: "Admin",
};

export function InviteUserDialog({
  trigger,
  onInvited,
}: {
  trigger?: ReactNode;
  onInvited?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState<UserRole>("sales_rep");
  const [region, setRegion] = useState<Region>("North America");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setEmail("");
    setFullName("");
    setTitle("");
    setRole("sales_rep");
    setRegion("North America");
  };

  const submit = async () => {
    if (!email.trim() || !fullName.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error("Your session has expired — sign in again.");

      await inviteTeamMember({
        data: {
          accessToken,
          email: email.trim(),
          full_name: fullName.trim(),
          role,
          region,
          title: title.trim() || undefined,
        },
      });

      toast.success("Invite sent", { description: `${email} will receive a sign-in email.` });
      setOpen(false);
      reset();
      onInvited?.();
    } catch (e) {
      toast.error("Failed to invite user", { description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <UserPlus className="size-4" /> Invite teammate
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a teammate</DialogTitle>
          <DialogDescription>
            They&apos;ll get an email to set their password and sign in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field label="Full name">
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@yokaiexpress.com"
            />
          </Field>
          <Field label="Title" hint="Optional">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Account Executive"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role">
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger>
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
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={submitting}>
            {submitting ? "Sending invite…" : "Send invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { ROLE_LABELS };
