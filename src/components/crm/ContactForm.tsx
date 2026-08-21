import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/crm/ui-bits";
import { useCrm } from "@/lib/crm/provider";
import type { Account, Contact } from "@/lib/crm/types";

/**
 * Shared contact-creation fields — used by both CreateContactDialog
 * (account already known, e.g. from the Account page) and the standalone
 * /contacts/new page (account picked first, no dialog).
 */
export function ContactForm({
  account,
  onCreated,
  onCancel,
}: {
  account: Account;
  onCreated?: (contact: Contact) => void;
  onCancel?: () => void;
}) {
  const { currentUser, createContact } = useCrm();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error("First name, last name and email are required.");
      return;
    }
    setSubmitting(true);
    try {
      const contact = await createContact({
        account_id: account.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        title: title.trim() || undefined,
        email: email.trim(),
        phone: phone.trim() || undefined,
        is_primary: isPrimary,
        owner_user_id: currentUser.id,
      });
      toast.success(`Contact created — ${contact.first_name} ${contact.last_name}`);
      onCreated?.(contact);
      void navigate({ to: "/contacts/$contactId", params: { contactId: contact.id } });
    } catch (e) {
      toast.error("Failed to create contact", { description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
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
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Director of Ops"
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@company.com"
          />
        </Field>
        <Field label="Phone">
          <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={isPrimary} onCheckedChange={(v) => setIsPrimary(v === true)} />
          Primary contact for {account.name}
        </label>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button onClick={() => void submit()} disabled={submitting}>
          {submitting ? "Creating…" : "Create contact"}
          {!submitting && <ArrowRight className="size-4" />}
        </Button>
      </div>
    </>
  );
}
