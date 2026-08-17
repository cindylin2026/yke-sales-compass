import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3,
  Building2,
  CalendarCheck,
  Command as CommandIcon,
  Contact as ContactIcon,
  Home,
  Megaphone,
  MessagesSquare,
  Search,
  Target,
  UserRound,
  Users,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCrm } from "@/lib/crm/provider";
import { bucketTasks, globalSearch, scopeForUser } from "@/lib/crm/selectors";
import type { UserRole } from "@/lib/crm/types";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
  roles: UserRole[];
  badge?: number;
}

const ALL: UserRole[] = ["sales_rep", "manager", "marketing", "admin"];

export function AppShell({ children }: { children: ReactNode }) {
  const { db, currentUser, setCurrentUserId } = useCrm();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const myTasks = scopeForUser(db.tasks, currentUser);
  const buckets = bucketTasks(myTasks);
  const dueCount = buckets.overdue.length + buckets.dueToday.length;

  const nav: NavItem[] = [
    { to: "/", label: "Sales Home", icon: Home, roles: ALL },
    { to: "/leads", label: "Leads", icon: Target, roles: ALL },
    { to: "/accounts", label: "Accounts", icon: Building2, roles: ALL },
    { to: "/contacts", label: "Contacts", icon: ContactIcon, roles: ALL },
    { to: "/opportunities", label: "Opportunities", icon: BarChart3, roles: ALL },
    { to: "/tasks", label: "Follow-ups", icon: CalendarCheck, roles: ALL, badge: dueCount },
    { to: "/interactions", label: "Interactions", icon: MessagesSquare, roles: ALL },
    { to: "/marketing", label: "Marketing Funnel", icon: Megaphone, roles: ["marketing", "manager", "admin"] },
    { to: "/dashboard", label: "Manager Dashboard", icon: Users, roles: ["manager", "marketing", "admin"] },
  ];

  const hits = globalSearch(db, query);
  const groups = ["Account", "Contact", "Lead", "Opportunity"] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="grid size-9 place-items-center rounded-lg bg-ember font-display text-sm font-bold text-ember-foreground">
            YK
          </span>
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold">Yo-Kai Express</p>
            <p className="text-[11px] text-sidebar-foreground/60">Sales Operating System</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 pb-4">
          {nav
            .filter((item) => item.roles.includes(currentUser.role))
            .map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <span className="rounded-full bg-ember px-1.5 py-0.5 text-[10px] font-semibold text-ember-foreground">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
        </nav>

        <div className="border-t border-sidebar-border px-2.5 py-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-sidebar-accent/60">
                <span className="grid size-8 place-items-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
                  {currentUser.avatar_initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{currentUser.full_name}</span>
                  <span className="block truncate text-[11px] text-sidebar-foreground/60">
                    {currentUser.title}
                  </span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Switch view (same data, different lens)</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {db.users.map((u) => (
                <DropdownMenuItem key={u.id} onSelect={() => setCurrentUserId(u.id)}>
                  <UserRound className="size-4" />
                  <span className="flex-1">{u.full_name}</span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {u.role.replace("_", " ")}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-15 items-center gap-3 border-b border-border bg-surface/85 px-4 py-3 backdrop-blur md:px-6">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 text-sm text-muted-foreground transition-colors hover:border-ring/40 md:max-w-md"
          >
            <Search className="size-4" />
            <span className="flex-1 text-left">Search accounts, contacts, leads, opportunities…</span>
            <kbd className="hidden items-center gap-0.5 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] md:inline-flex">
              <CommandIcon className="size-3" />K
            </kbd>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/tasks">Today&apos;s follow-ups {dueCount > 0 ? `(${dueCount})` : ""}</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/leads/new">New Lead</Link>
            </Button>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-surface px-4 py-2 lg:hidden">
          {nav
            .filter((item) => item.roles.includes(currentUser.role))
            .map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-md px-2.5 py-1.5 text-xs whitespace-nowrap text-muted-foreground"
                activeProps={{ className: "bg-surface-muted text-foreground font-medium" }}
              >
                {item.label}
              </Link>
            ))}
        </nav>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 md:py-8">{children}</main>
      </div>

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput
          placeholder="Search Hilton, john.smith@…, pilot…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>Type at least two characters to search the whole system.</CommandEmpty>
          {groups.map((group) => {
            const rows = hits.filter((h) => h.kind === group);
            if (!rows.length) return null;
            return (
              <CommandGroup key={group} heading={`${group}s`}>
                {rows.map((hit) => (
                  <CommandItem
                    key={`${hit.kind}-${hit.id}`}
                    value={`${hit.kind} ${hit.title} ${hit.subtitle}`}
                    onSelect={() => {
                      setSearchOpen(false);
                      setQuery("");
                      void navigate({ to: hit.to, params: hit.params ?? {} });
                    }}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm">{hit.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{hit.subtitle}</p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
