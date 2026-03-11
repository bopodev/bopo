"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type * as React from "react";
import { cn } from "../lib/cn";
import { uiStyles } from "../styles";

export const Modal = Dialog.Root;
export const ModalTrigger = Dialog.Trigger;
export const ModalClose = Dialog.Close;

export function ModalContent({ className, ...props }: React.ComponentProps<typeof Dialog.Content>) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className={uiStyles.modalOverlay} />
      <Dialog.Content
        className={cn(uiStyles.modalContent, className)}
        {...props}
      />
    </Dialog.Portal>
  );
}

export function ModalTitle({ className, ...props }: React.ComponentProps<typeof Dialog.Title>) {
  return <Dialog.Title className={cn(uiStyles.modalTitle, className)} {...props} />;
}

export function ModalDescription({ className, ...props }: React.ComponentProps<typeof Dialog.Description>) {
  return <Dialog.Description className={cn(uiStyles.modalDescription, className)} {...props} />;
}
