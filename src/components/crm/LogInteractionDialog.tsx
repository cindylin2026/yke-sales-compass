import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/crm/ui-bits";
import { useCrm } from "@/lib/crm/provider";
import { todayIso } from "@/lib/crm/selectors";
import { INTERACTION_TYPES, type ID, type InteractionType } from "@/lib/crm/types";

export function LogInteractionDialog({
  trigger,
  related,
}: {
  trigger: ReactNode;
  related: { accountId?: ID | null; contactId?: ID | null; leadId?: ID | null; opportunityId?: ID | null };
}) {
  const { currentUser, createInteraction, createTask, requestAiSummary } = useCrm();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<InteractionType>("Meeting");
  const [subject, setSubject] = useState("");
  const [occurredOn, setOccurredOn] = useState(todayIso());
  const [notes, setNotes] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [summarize, setSummarize] = useState(false);
  const [createFollowUp, setCreateFollowUp] = useState(true);

  const reset = () => {
    setSubject("");
    setNotes("");
    setNextSteps("");
    setNextAction("");
    setDueDate("");
    setDocUrl("");
    setSummarize(false);
  };

  const submit = () => {
    if (!subject.trim()) {
      toast.error("Give the interaction a subject.");
      return;
    }
    const created = createInteraction({
      type,
      occurred_at: `${occurredOn}T12:00:00.000Z`,
      owner_user_id: currentUser.id,
      account_id: related.accountId ?? null,
      contact_id: related.contactId ?? null,
      lead_id: related.leadId ?? null,
      opportunity_id: related.opportunityId ?? null,
      subject: subject.trim(),
      notes: notes.trim(),
      next_steps: nextSteps.trim(),
      next_action: nextAction.trim(),
      next_action_due_date: dueDate || null,
      source_doc_url: docUrl.trim() || null,
      ai_summary: null,
      ai_summary_status: docUrl.trim() && summarize ? "pending" : "none",
    });

    if (docUrl.trim() && summarize) requestAiSummary(created.id);

    if (createFollowUp && nextAction.trim() && dueDate) {
      createTask({
        title: nextAction.trim(),
        type: "Follow-up",
        owner_user_id: currentUser.id,
        lead_id: related.leadId ?? null,
        account_id: related.accountId ?? null,
        contact_id: related.contactId ?? null,
        opportunity_id: related.opportunityId ?? null,
        due_date: dueDate,
        status: "Open",
        next_action: nextAction.trim(),
        priority: "Normal",
        completed_at: null,
      });
    }

    toast.success("Interaction logged", {
      description: createFollowUp && nextAction && dueDate ? "Follow-up task created too." : undefined,
    });
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Log interaction</DialogTitle>
          <DialogDescription>
            Everything you log stays attached to this record and rolls up into the activity timeline.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type">
            <Select value={type} onValueChange={(v) => setType(v as InteractionType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERACTION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Date">
            <Input type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Subject">
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Site survey walkthrough with operations"
              />
            </Field>
          </div>

          <div className="sm:col-span-2 rounded-lg border border-border bg-surface-muted p-3">
            <Field
              label="Meeting notes doc URL"
              hint="Paste a Google Doc link. The AI summarizer will be wired to this field."
            >
              <Input
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
                placeholder="https://docs.google.com/document/d/…"
              />
            </Field>
            <label className="mt-2 flex items-center gap-2 text-xs">
              <Checkbox checked={summarize} onCheckedChange={(v) => setSummarize(Boolean(v))} />
              <Sparkles className="size-3.5 text-ember" />
              Generate AI summary from the doc
            </label>
          </div>

          <div className="sm:col-span-2">
            <Field label="Notes">
              <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Next steps">
              <Textarea rows={2} value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} />
            </Field>
          </div>
          <Field label="Next action">
            <Input
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="Send pilot pricing"
            />
          </Field>
          <Field label="Due date">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <label className="sm:col-span-2 flex items-center gap-2 text-sm">
            <Checkbox checked={createFollowUp} onCheckedChange={(v) => setCreateFollowUp(Boolean(v))} />
            Create a follow-up task from the next action
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Log interaction</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
