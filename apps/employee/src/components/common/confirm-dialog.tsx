"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Shared confirmation popup. Use this everywhere a "are you sure?" prompt is
 * needed (logout, check-in/out, destructive actions) so every confirm dialog in
 * the app looks and behaves the same.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmIcon,
  confirmVariant = "primary",
  confirmDisabled = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmIcon?: ReactNode;
  confirmVariant?: "primary" | "danger";
  confirmDisabled?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>
            {cancelLabel}
          </DialogClose>
          <Button
            type="button"
            variant={confirmVariant === "danger" ? "destructive" : "default"}
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {confirmIcon}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
