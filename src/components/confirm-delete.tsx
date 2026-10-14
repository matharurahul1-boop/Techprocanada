import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Request = { title: string; description: string; onConfirm: () => void };

/**
 * In-app "are you sure?" for deletes, used instead of the browser's confirm box.
 * Call `confirmDelete` from a delete button and render `confirmDialog` once on the page.
 */
export function useConfirmDelete() {
  // The last request stays in place while the dialog fades out, so its text doesn't blank.
  const [request, setRequest] = useState<Request | null>(null);
  const [open, setOpen] = useState(false);

  const confirmDelete = (next: Request) => {
    setRequest(next);
    setOpen(true);
  };

  const confirmDialog = (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="glass-surface max-w-sm rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-base">{request?.title}</AlertDialogTitle>
          <AlertDialogDescription>{request?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => request?.onConfirm()}
            className="rounded-xl bg-destructive text-white hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirmDelete, confirmDialog };
}
