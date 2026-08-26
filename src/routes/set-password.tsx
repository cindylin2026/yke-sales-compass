import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/context";
import { supabase } from "@/lib/supabase/client";

export const Route = createFileRoute("/set-password")({
  head: () => ({
    meta: [{ title: "Set your password — Yo-Kai Express Sales OS" }],
  }),
  component: SetPasswordPage,
});

function SetPasswordPage() {
  const { profile, clearPasswordSetup } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast.error("Couldn't set password", { description: error.message });
      return;
    }
    toast.success("Password set — you're in.");
    clearPasswordSetup();
    void navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex lg:w-[420px]">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-ember font-display text-sm font-bold text-ember-foreground">
            YK
          </span>
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold">Yo-Kai Express</p>
            <p className="text-[11px] text-sidebar-foreground/60">Sales Operating System</p>
          </div>
        </div>
        <div>
          <blockquote className="text-base leading-relaxed text-sidebar-foreground/80">
            &ldquo;One system for every lead, account, and deal — across US and Asia.&rdquo;
          </blockquote>
        </div>
        <div className="space-y-3 text-xs text-sidebar-foreground/50">
          <p>Leads · Accounts · Contacts · Opportunities · Follow-ups</p>
          <p>US team · Asia team · Marketing · Management</p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid size-9 place-items-center rounded-lg bg-ember font-display text-sm font-bold text-ember-foreground">
              YK
            </span>
            <span className="font-display text-sm font-semibold">Yo-Kai Express Sales OS</span>
          </div>

          <h1 className="text-2xl font-semibold">Welcome{profile ? `, ${profile.full_name}` : ""}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set a password to finish setting up your account.
          </p>

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                New password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm" className="text-xs font-medium text-muted-foreground">
                Confirm password
              </label>
              <Input
                id="confirm"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting || !password || !confirm}>
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Setting password…
                </>
              ) : (
                "Set password & continue"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
