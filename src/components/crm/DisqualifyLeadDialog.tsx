import { useState, type ReactNode } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/crm/ui-bits";
import { useCrm } from "@/lib/crm/provider";
import { DISQUALIFY_REASONS, type DisqualifyReason, type ID } from "@/lib/crm/types";

export function DisqualifyLeadDialog({ leadId, trigger }: { leadId: ID; trigger: ReactNode }) {
  const { updateLeadStage } = useCrm();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<DisqualifyReason>("Not ICP");
  const [note, setNote] = useState("");

  const submit = () => {
    updateLeadStage(leadId, "Disqualified", note.trim() || undefined, reason);
    setOpen(false);
    setNote("");
    setReason("Not ICP");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Disqualify lead</DialogTitle>
          <DialogDescription>Why isn&apos;t this lead worth pursuing right now?</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field label="Reason">
            <Select value={reason} onValueChange={(v) => setReason(v as DisqualifyReason)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISQUALIFY_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Note" hint="Optional">
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add context for the team…"
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submit}>
            Disqualify
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
