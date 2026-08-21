import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Mail, Pencil, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Panel, DetailRow, Field } from "@/components/crm/ui-bits";
import { useCrm } from "@/lib/crm/provider";
import { accountName, formatDate, userName } from "@/lib/crm/selectors";
import type { Contact } from "@/lib/crm/types";

export function EditableContactInfo({ contact }: { contact: Contact }) {
  const { db, currentUser, updateContact } = useCrm();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState(contact.first_name);
  const [lastName, setLastName] = useState(contact.last_name);
  const [title, setTitle] = useState(contact.title ?? "");
  const [email, setEmail] = useState(contact.email);
  const [phone, setPhone] = useState(contact.phone ?? "");
  const [isPrimary, setIsPrimary] = useState(contact.is_primary);

  const canEdit =
    currentUser.role === "manager" ||
    currentUser.role === "admin" ||
    currentUser.id === contact.owner_user_id;

  const startEdit = () => {
    setFirstName(contact.first_name);
    setLastName(contact.last_name);
    setTitle(contact.title ?? "");
    setEmail(contact.email);
    setPhone(contact.phone ?? "");
    setIsPrimary(contact.is_primary);
    setEditing(true);
  };

  const save = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error("First name, last name and email are required.");
      return;
    }
    setSaving(true);
    try {
      await updateContact(contact.id, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        title: title.trim() || undefined,
        email: email.trim(),
        phone: phone.trim() || undefined,
        is_primary: isPrimary,
      });
      toast.success("Contact updated");
      setEditing(false);
    } catch (e) {
      toast.error("Failed to update contact", { description: (e as Error).message });
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
            href={`mailto:${contact.email}`}
            className="flex min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-surface-muted"
          >
            <Mail className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{contact.email}</span>
          </a>
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-surface-muted"
            >
              <Phone className="size-4 text-muted-foreground" />
              {contact.phone}
            </a>
          )}
        </div>
        <div className="mt-3 divide-y divide-border">
          {contact.title && <DetailRow label="Title" value={contact.title} />}
          <DetailRow
            label="Account"
            value={
              <Link
                to="/accounts/$accountId"
                params={{ accountId: contact.account_id }}
                className="text-info hover:underline"
              >
                {accountName(db, contact.account_id)}
              </Link>
            }
          />
          <DetailRow label="Owner" value={userName(db, contact.owner_user_id)} />
          <DetailRow label="Created" value={formatDate(contact.created_at)} />
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
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={isPrimary} onCheckedChange={(v) => setIsPrimary(v === true)} />
          Primary contact
        </label>
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
