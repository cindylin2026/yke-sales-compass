import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { removeTeamMember } from "@/lib/supabase/admin";
import { CRM_QUERY_KEY } from "@/lib/crm/provider";

export function RemoveTeamMemberDialog({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  const confirmRemove = async () => {
    setRemoving(true);
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error("Your session has expired — sign in again.");

      await removeTeamMember({ data: { accessToken, userId } });

      toast.success("Teammate removed", { description: `${userName} no longer has access.` });
      setOpen(false);
      void qc.invalidateQueries({ queryKey: CRM_QUERY_KEY });
    } catch (e) {
      toast.error("Failed to remove teammate", { description: (e as Error).message });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="size-8 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {userName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes their account — they&apos;ll lose access immediately and
            this can&apos;t be undone. Their past activity (interactions, owned records) stays in
            the system.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void confirmRemove();
            }}
            disabled={removing}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {removing ? "Removing…" : "Remove teammate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
