"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import styles from "./create-company-modal.module.scss";

export function CreateCompanyModal({ companyId, trigger }: { companyId: string; trigger?: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [mission, setMission] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await apiPost("/companies", companyId, { name, mission: mission || undefined });
      setName("");
      setMission("");
      setOpen(false);
      router.refresh();
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
      } else {
        setError("Failed to create company.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button>New Company</Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create company</DialogTitle>
          <DialogDescription>Create additional workspaces and organizations.</DialogDescription>
        </DialogHeader>
        <form className={styles.createCompanyModalForm} onSubmit={onSubmit}>
          <div className="ui-dialog-content-scrollable">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="company-name">Company name</FieldLabel>
                <Input id="company-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme AI" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="company-mission">Mission</FieldLabel>
                <Textarea
                  id="company-mission"
                  value={mission}
                  onChange={(e) => setMission(e.target.value)}
                  placeholder="Describe the company mission and operating context."
                />
                <FieldDescription>Optional context shown across the workspace.</FieldDescription>
              </Field>
            </FieldGroup>
          </div>
          {error ? <p className={styles.createCompanyModalText}>{error}</p> : null}
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={isSubmitting}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
