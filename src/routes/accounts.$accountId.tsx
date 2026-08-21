import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, DetailRow, EmptyState, StatCard } from "@/components/crm/ui-bits";
import { StageBadge } from "@/components/crm/badges";
import { InteractionTimeline } from "@/components/crm/InteractionTimeline";
import { TaskList } from "@/components/crm/TaskList";
import { LogInteractionDialog } from "@/components/crm/LogInteractionDialog";
import { CreateOpportunityDialog } from "@/components/crm/CreateOpportunityDialog";
import { CreateContactDialog } from "@/components/crm/CreateContactDialog";
import { EditableAccountDetails } from "@/components/crm/EditableAccountDetails";
import { useCrm } from "@/lib/crm/provider";
import {
  formatCurrency,
  formatDate,
  formatShortDate,
  openPipeline,
  relatedInteractions,
  relatedTasks,
  sumAmount,
  userName,
  weightedAmount,
} from "@/lib/crm/selectors";

export const Route = createFileRoute("/accounts/$accountId")({
  head: () => ({
    meta: [{ title: "Account 360 — Yo-Kai Express Sales OS" }],
  }),
  component: AccountDetailPage,
});

function AccountDetailPage() {
  const { accountId } = Route.useParams();
  const { db } = useCrm();

  const account = db.accounts.find((a) => a.id === accountId);
  if (!account) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Account not found.</p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/accounts">Back to accounts</Link>
        </Button>
      </div>
    );
  }

  const contacts = db.contacts.filter((c) => c.account_id === accountId);
  const opps = db.opportunities.filter((o) => o.account_id === accountId);
  const open = openPipeline(opps);
  const interactions = relatedInteractions(db.interactions, { accountId });
  const tasks = relatedTasks(db.tasks, { accountId });
  const openTasks = tasks.filter((t) => t.status === "Open");
  const originatingLeads = db.leads.filter((l) => l.converted_account_id === accountId);

  return (
    <>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to="/accounts">
            <ArrowLeft className="size-4" /> All accounts
          </Link>
        </Button>
      </div>

      <PageHeader
        eyebrow={`${account.segment} · ${account.region} · ${account.country}`}
        title={account.name}
        {...(account.domain ? { description: account.domain } : {})}
        actions={
          <LogInteractionDialog
            trigger={<Button size="sm">Log interaction</Button>}
            related={{ accountId }}
          />
        }
      />

      {/* KPI strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Open pipeline"
          value={formatCurrency(sumAmount(open))}
          hint={`${formatCurrency(weightedAmount(open))} weighted`}
          tone="success"
        />
        <StatCard label="Open opps" value={open.length} />
        <StatCard label="Contacts" value={contacts.length} />
        <StatCard label="Interactions" value={interactions.length} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-5">
          <EditableAccountDetails account={account} />

          {account.notes && (
            <Panel title="Notes">
              <p className="text-sm text-muted-foreground whitespace-pre-line">{account.notes}</p>
            </Panel>
          )}

          {/* Contacts */}
          <Panel
            title="Contacts"
            actions={
              <div className="flex items-center gap-2">
                <CreateContactDialog
                  account={account}
                  trigger={
                    <Button size="sm" variant="outline">
                      New contact
                    </Button>
                  }
                />
                <span className="text-xs text-muted-foreground">{contacts.length}</span>
              </div>
            }
            bodyClassName="p-0"
          >
            {contacts.length ? (
              <ul className="divide-y divide-border">
                {contacts.map((c) => (
                  <li key={c.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to="/contacts/$contactId"
                        params={{ contactId: c.id }}
                        className="hover:text-ember hover:underline"
                      >
                        <p className="text-sm font-medium">
                          {c.first_name} {c.last_name}
                          {c.is_primary && (
                            <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-ember">
                              Primary
                            </span>
                          )}
                        </p>
                        {c.title && <p className="text-xs text-muted-foreground">{c.title}</p>}
                      </Link>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      <a
                        href={`mailto:${c.email}`}
                        className="inline-flex min-w-0 max-w-full items-center gap-1 text-xs text-info hover:underline"
                      >
                        <Mail className="size-3 shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </a>
                      {c.phone && (
                        <a
                          href={`tel:${c.phone}`}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                        >
                          <Phone className="size-3" /> {c.phone}
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4">
                <EmptyState>No contacts yet. Convert a lead to add one.</EmptyState>
              </div>
            )}
          </Panel>

          {/* Originating leads */}
          {originatingLeads.length > 0 && (
            <Panel title="Originating leads" bodyClassName="p-0">
              <ul className="divide-y divide-border">
                {originatingLeads.map((l) => (
                  <li key={l.id}>
                    <Link
                      to="/leads/$leadId"
                      params={{ leadId: l.id }}
                      className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface-muted"
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {l.first_name} {l.last_name}
                      </span>
                      <span className="text-xs text-muted-foreground">{l.source}</span>
                      <ArrowRight className="size-3.5 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        {/* Right 2 columns */}
        <div className="space-y-5 lg:col-span-2">
          {/* Opportunities */}
          <Panel
            title="Opportunities"
            actions={
              <div className="flex items-center gap-2">
                <CreateOpportunityDialog
                  account={account}
                  contacts={contacts}
                  trigger={
                    <Button size="sm" variant="outline">
                      New opportunity
                    </Button>
                  }
                />
                <Button asChild size="sm" variant="ghost">
                  <Link to="/opportunities">
                    Pipeline <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            }
            bodyClassName="p-0"
          >
            {opps.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-muted text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium">Name</th>
                      <th className="px-4 py-2.5 text-left font-medium">Stage</th>
                      <th className="px-4 py-2.5 text-left font-medium">Amount</th>
                      <th className="px-4 py-2.5 text-left font-medium">Close date</th>
                      <th className="px-4 py-2.5 text-left font-medium">Next action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {opps.map((o) => (
                      <tr key={o.id} className="transition-colors hover:bg-surface-muted">
                        <td className="px-4 py-2.5">
                          <Link
                            to="/opportunities/$opportunityId"
                            params={{ opportunityId: o.id }}
                            className="font-medium hover:text-ember hover:underline"
                          >
                            {o.name}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5">
                          <StageBadge stage={o.stage} />
                        </td>
                        <td className="px-4 py-2.5 font-display font-semibold tabular-nums">
                          {formatCurrency(o.amount)}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {formatShortDate(o.expected_close_date)}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {o.next_action ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4">
                <EmptyState>No opportunities yet.</EmptyState>
              </div>
            )}
          </Panel>

          {/* Open tasks */}
          <Panel
            title="Open follow-ups"
            bodyClassName="p-4 pt-1"
            actions={<span className="text-xs text-muted-foreground">{openTasks.length}</span>}
          >
            <TaskList tasks={openTasks} emptyLabel="No open tasks." />
          </Panel>

          {/* Interaction timeline */}
          <Panel
            title="Activity timeline"
            actions={
              <LogInteractionDialog
                trigger={
                  <Button size="sm" variant="outline">
                    Log interaction
                  </Button>
                }
                related={{ accountId }}
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
