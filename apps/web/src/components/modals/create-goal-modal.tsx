"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiDelete, apiPost, apiPut } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Field, FieldContent, FieldGroup } from "@/components/ui/field";
import { FieldLabelWithHelp } from "@/components/ui/field-label-with-help";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import styles from "./create-goal-modal.module.scss";

export function CreateGoalModal({
  companyId,
  agents = [],
  goal,
  triggerLabel = "New Goal",
  triggerVariant = "default",
  triggerSize
}: {
  companyId: string;
  agents?: Array<{ id: string; name: string }>;
  goal?: {
    id: string;
    level: "company" | "project" | "agent";
    title: string;
    description?: string | null;
    status: string;
    ownerAgentId?: string | null;
  };
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  triggerSize?: "default" | "sm" | "lg" | "icon";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<"company" | "project" | "agent">(goal?.level ?? "company");
  const [title, setTitle] = useState(goal?.title ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [status, setStatus] = useState(goal?.status ?? "draft");
  const [activateNow, setActivateNow] = useState(false);
  const [ownerAgentId, setOwnerAgentId] = useState<string>(goal?.ownerAgentId ?? "__all__");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = Boolean(goal);

  function hydrateFormFromProps() {
    setLevel(goal?.level ?? "company");
    setTitle(goal?.title ?? "");
    setDescription(goal?.description ?? "");
    setStatus(goal?.status ?? "draft");
    setActivateNow(false);
    setOwnerAgentId(goal?.ownerAgentId ?? "__all__");
    setError(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      if (isEditing && goal) {
        await apiPut(`/goals/${goal.id}`, companyId, {
          level,
          title,
          description: description || null,
          status,
          ownerAgentId: level === "agent" ? (ownerAgentId === "__all__" ? null : ownerAgentId) : null
        });
      } else {
        await apiPost("/goals", companyId, {
          level,
          title,
          description: description || undefined,
          activateNow,
          ...(level === "agent" && ownerAgentId !== "__all__" ? { ownerAgentId } : {})
        });
        setLevel("company");
        setTitle("");
        setDescription("");
        setActivateNow(false);
        setOwnerAgentId("__all__");
      }
      setOpen(false);
      router.refresh();
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
      } else {
        setError(isEditing ? "Failed to update goal." : "Failed to create goal.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onDeleteGoal() {
    if (!goal) {
      return;
    }
    setError(null);
    setIsDeleting(true);
    try {
      await apiDelete(`/goals/${goal.id}`, companyId);
      setOpen(false);
      router.refresh();
    } catch (deleteError) {
      if (deleteError instanceof ApiError) {
        setError(deleteError.message);
      } else {
        setError("Failed to delete goal.");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          hydrateFormFromProps();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit goal" : "Create goal"}</DialogTitle>
          <DialogDescription>Create a goal with status, start timing, and workspace hints.</DialogDescription>
        </DialogHeader>
        <form className={styles.createGoalModalForm} onSubmit={onSubmit}>
          <div className="ui-dialog-content-scrollable">
            <FieldGroup>
              <Field>
                <FieldLabelWithHelp helpText="Who this goal applies to: whole company, a project, or a single agent. Scope affects where the goal appears in reporting.">
                  Goal scope
                </FieldLabelWithHelp>
                <Select
                  value={level}
                  onValueChange={(value) => {
                    setLevel(value as "company" | "project" | "agent");
                    if (value !== "agent") {
                      setOwnerAgentId("__all__");
                    }
                  }}>
                  <SelectTrigger className={styles.createGoalModalSelectTrigger}>
                    <SelectValue placeholder="Select a scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Company goal</SelectItem>
                    <SelectItem value="project">Project goal</SelectItem>
                    <SelectItem value="agent">Agent goal</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {level === "agent" && agents.length > 0 ? (
                <Field>
                  <FieldLabelWithHelp helpText="Restrict this goal to one agent’s heartbeats, or leave as all agents for a shared agent-level objective.">
                    Agent scope
                  </FieldLabelWithHelp>
                  <Select value={ownerAgentId} onValueChange={setOwnerAgentId}>
                    <SelectTrigger className={styles.createGoalModalSelectTrigger}>
                      <SelectValue placeholder="All agents" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All agents</SelectItem>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
              <Field>
                <FieldLabelWithHelp
                  htmlFor="goal-title"
                  helpText="Short headline for the goal. Use something measurable or outcome-oriented so teams can align on success.">
                  Goal title
                </FieldLabelWithHelp>
                <Input id="goal-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Increase delivery throughput" required />
              </Field>
              <Field>
                <FieldLabelWithHelp
                  htmlFor="goal-description"
                  helpText="Context, metrics, time horizon, and links. Helps approvers and agents understand intent beyond the title.">
                  Details
                </FieldLabelWithHelp>
                <Textarea id="goal-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Goal details" />
              </Field>
              {isEditing ? (
                <Field>
                  <FieldLabelWithHelp helpText="Lifecycle of the goal: draft while refining, active when in pursuit, completed when done, archived to retain history without noise.">
                    Status
                  </FieldLabelWithHelp>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className={styles.createGoalModalSelectTrigger}>
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              ) : (
                <Field orientation="horizontal">
                  <Checkbox
                    id="goal-activate-now"
                    checked={activateNow}
                    onCheckedChange={(checked) => setActivateNow(Boolean(checked))}
                  />
                  <FieldContent>
                    <FieldLabelWithHelp
                      htmlFor="goal-activate-now"
                      helpText="When checked, creating the goal starts a governance request to move it from draft to active instead of leaving it in draft.">
                      Request activation approval
                    </FieldLabelWithHelp>
                  </FieldContent>
                </Field>
              )}
            </FieldGroup>
          </div>
          {error ? <p className={styles.createGoalModalText}>{error}</p> : null}
          <DialogFooter showCloseButton={!isEditing}>
            {isEditing ? (
              <Button type="button" variant="ghost" onClick={() => void onDeleteGoal()} disabled={isSubmitting || isDeleting}>
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            ) : null}
            <Button type="submit" disabled={isSubmitting || isDeleting}>
              {isEditing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
