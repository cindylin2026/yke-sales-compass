import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { OpportunityForm } from "@/components/crm/OpportunityForm";
import type { Account, Contact } from "@/lib/crm/types";

export function CreateOpportunityDialog({
  account,
  contacts,
  trigger,
}: {
  account: Account;
  contacts: Contact[];
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New opportunity — {account.name}</DialogTitle>
          <DialogDescription>
            Amount is calculated automatically from machine count.
          </DialogDescription>
        </DialogHeader>

        <OpportunityForm
          account={account}
          contacts={contacts}
          onCreated={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
