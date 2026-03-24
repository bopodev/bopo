"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiPost } from "@/lib/api";
import { fetchAdapterModelsForProvider } from "@/lib/adapter-models-api";
import { readAgentRuntimeDefaults } from "@/lib/agent-defaults";
import {
  buildModelPickerOptions,
  getDefaultModelForProvider,
  getModelPickerAllowedIds,
  type RuntimeProviderType,
  type ServerAdapterModelEntry
} from "@/lib/model-registry-options";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import styles from "./create-company-modal.module.scss";

type CompanyModalAdapterModelsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ok"; models: ServerAdapterModelEntry[] };

export function CreateCompanyModal({
  companyId,
  trigger,
  onCreated
}: {
  companyId: string;
  trigger?: ReactNode;
  onCreated?: (companyId: string) => void;
}) {
  const router = useRouter();
  const defaults = useMemo(() => readAgentRuntimeDefaults(), []);
  const allowedProviders: RuntimeProviderType[] = ["claude_code", "codex", "opencode", "gemini_cli"];
  const initialProviderType = allowedProviders.includes(defaults.providerType) ? defaults.providerType : "claude_code";
  const [open, setOpen] = useState(false);
  const [adapterModelsFetch, setAdapterModelsFetch] = useState<CompanyModalAdapterModelsState>({ status: "idle" });
  const [name, setName] = useState("");
  const [mission, setMission] = useState("");
  const [providerType, setProviderType] = useState<RuntimeProviderType>(initialProviderType);
  const [runtimeModel, setRuntimeModel] = useState(defaults.runtimeModel || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const serverModelsForPicker =
    adapterModelsFetch.status === "ok" ? adapterModelsFetch.models : undefined;
  const modelOptions = useMemo(
    () =>
      buildModelPickerOptions({
        rows: [],
        providerType,
        serverModels: serverModelsForPicker,
        currentModel: runtimeModel,
        includeDefault: false
      }),
    [providerType, runtimeModel, serverModelsForPicker]
  );

  useEffect(() => {
    if (!open) {
      setAdapterModelsFetch({ status: "idle" });
      return;
    }
    setAdapterModelsFetch({ status: "loading" });
    void fetchAdapterModelsForProvider(companyId, providerType, { runtimeConfig: {} })
      .then((models) => setAdapterModelsFetch({ status: "ok", models }))
      .catch(() => setAdapterModelsFetch({ status: "error" }));
  }, [open, companyId, providerType]);

  useEffect(() => {
    const serverOk = adapterModelsFetch.status === "ok";
    const allowedValues = getModelPickerAllowedIds({
      rows: [],
      providerType,
      serverModels: serverOk ? adapterModelsFetch.models : undefined
    });
    if (serverOk && allowedValues.length === 0) {
      return;
    }
    const defaultId = getDefaultModelForProvider(providerType);
    const preferred = defaultId && allowedValues.includes(defaultId) ? defaultId : allowedValues[0] ?? defaultId ?? "";
    if (runtimeModel && !allowedValues.includes(runtimeModel)) {
      setRuntimeModel(preferred);
      return;
    }
    const requiresNamedModel = providerType !== "http" && providerType !== "shell";
    if (!requiresNamedModel || runtimeModel || allowedValues.length === 0) {
      return;
    }
    setRuntimeModel(preferred);
  }, [adapterModelsFetch, providerType, runtimeModel]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const created = await apiPost<{ id: string }>("/companies", companyId, {
        name,
        mission: mission || undefined,
        providerType,
        runtimeModel: runtimeModel || undefined
      });
      setName("");
      setMission("");
      setOpen(false);
      if (created.data.id) {
        onCreated?.(created.data.id);
      } else {
        router.refresh();
      }
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
              </Field>
              <Field>
                <FieldLabel>CEO provider</FieldLabel>
                <Select value={providerType} onValueChange={(value) => setProviderType(value as RuntimeProviderType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude_code">Claude Code</SelectItem>
                    <SelectItem value="codex">OpenAI Codex</SelectItem>
                    <SelectItem value="opencode">OpenCode</SelectItem>
                    <SelectItem value="gemini_cli">Gemini CLI</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>CEO model</FieldLabel>
                <Select value={runtimeModel || undefined} onValueChange={setRuntimeModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
