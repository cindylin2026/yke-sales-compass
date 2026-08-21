import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, StatCard } from "@/components/crm/ui-bits";
import { InteractionTimeline } from "@/components/crm/InteractionTimeline";
import { TaskList } from "@/components/crm/TaskList";
import { LogInteractionDialog } from "@/components/crm/LogInteractionDialog";
import { EditableContactInfo } from "@/components/crm/EditableContactInfo";
import { useCrm } from "@/lib/crm/provider";
import { accountName, relatedInteractions, relatedTasks } from "@/lib/crm/selectors";

export const Route = createFileRoute("/contacts/$contactId")({
  head: () => ({
    meta: [{ title: "Contact — Yo-Kai Express Sales OS" }],
  }),
  component: ContactDetailPage,
});

function ContactDetailPage() {
  const { contactId } = Route.useParams();
  const { db } = useCrm();

  const contact = db.contacts.find((c) => c.id === contactId);
  if (!contact) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Contact not found.</p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/contacts">Back to contacts</Link>
        </Button>
      </div>
    );
  }

  const interactions = relatedInteractions(db.interactions, { contactId: contact.id });
  const tasks = relatedTasks(db.tasks, { contactId: contact.id });
  const openTasks = tasks.filter((t) => t.status === "Open");

  return (
    <>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to="/contacts">
            <ArrowLeft className="size-4" /> All contacts
          </Link>
        </Button>
      </div>

      <PageHeader
        eyebrow={contact.title ?? "Contact"}
        title={`${contact.first_name} ${contact.last_name}`}
        description={accountName(db, contact.account_id)}
        actions={
          <LogInteractionDialog
            trigger={<Button size="sm">Log interaction</Button>}
            related={{ contactId: contact.id, accountId: contact.account_id }}
          />
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Interactions" value={interactions.length} />
        <StatCard label="Open tasks" value={openTasks.length} />
        <StatCard label="Role" value={contact.is_primary ? "Primary" : "Contact"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-5">
          <EditableContactInfo contact={contact} />
        </div>

        {/* Right column */}
        <div className="space-y-5 lg:col-span-2">
          <Panel
            title="Open tasks"
            bodyClassName="p-4 pt-1"
            actions={<span className="text-xs text-muted-foreground">{openTasks.length} open</span>}
          >
            <TaskList tasks={openTasks} emptyLabel="No open tasks." />
          </Panel>

          <Panel
            title="Interaction timeline"
            actions={
              <LogInteractionDialog
                trigger={
                  <Button size="sm" variant="outline">
                    Log interaction
                  </Button>
                }
                related={{ contactId: contact.id, accountId: contact.account_id }}
              />
            }
          >
            <InteractionTimeline
              interactions={interactions}
              showLinks={false}
              emptyLabel="No interactions logged yet."
            />
          </Panel>
        </div>
      </div>
    </>
  );
}
