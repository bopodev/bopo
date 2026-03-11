"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import styles from "./confirm-action-modal.module.scss";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

export function ConfirmActionModal({
  triggerLabel,
  title,
  description,
  details,
  confirmLabel,
  onConfirm,
  triggerVariant = "ghost",
  triggerSize = "default",
  triggerDisabled = false
}: {
  triggerLabel: string;
  title: string;
  description: string;
  details?: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  triggerVariant?: "ghost" | "primary" | "outline";
  triggerSize?: "default" | "sm" | "lg" | "icon";
  triggerDisabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerButtonVariant =
    triggerVariant === "primary" ? "default" : triggerVariant === "outline" ? "outline" : "ghost";

  async function handleConfirm() {
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm();
      setOpen(false);
    } catch (confirmError) {
      if (confirmError instanceof ApiError) {
        setError(confirmError.message);
      } else {
        setError("Failed to complete action.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size={triggerSize} variant={triggerButtonVariant} disabled={triggerDisabled || isSubmitting}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {details ? <pre className={styles.confirmActionModalDetails}>{details}</pre> : null}
        {error ? <p className={styles.confirmActionModalText}>{error}</p> : null}
        <DialogFooter showCloseButton>
          <Button disabled={triggerDisabled || isSubmitting} onClick={() => void handleConfirm()}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
