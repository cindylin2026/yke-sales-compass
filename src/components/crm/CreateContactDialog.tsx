import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ContactForm } from "@/components/crm/ContactForm";
import type { Account } from "@/lib/crm/types";

export function CreateContactDialog({
  account,
  trigger,
}: {
  account: Account;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New contact — {account.name}</DialogTitle>
          <DialogDescription>
            Add a person at this account directly — no lead needed.
          </DialogDescription>
        </DialogHeader>

        <ContactForm
          account={account}
          onCreated={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
