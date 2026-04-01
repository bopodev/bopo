"use client";

import { AGENT_LUCIDE_ICON_NAMES, type AgentLucideIconName } from "bopodev-contracts";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { AgentAvatar } from "@/components/agent-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError, apiPut } from "@/lib/api";
import { agentAvatarSeed } from "@/lib/agent-avatar";
import { AGENT_LUCIDE_ICON_MAP, isAgentLucideIconName } from "@/lib/agent-lucide-icon-map";
import { randomAvatarSeed } from "@/lib/random-avatar-seed";
import { cn } from "@/lib/utils";
import styles from "./agent-appearance-modal.module.scss";

export function AgentAppearanceModal({
  companyId,
  agent,
  open,
  onOpenChange
}: {
  companyId: string;
  agent: { id: string; name: string; avatarSeed?: string | null; lucideIconName?: string | null };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"avatar" | "icon">("avatar");
  const [selectedIcon, setSelectedIcon] = useState<AgentLucideIconName>("Bot");
  const [draftAvatarSeed, setDraftAvatarSeed] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setError(null);
    setQuery("");
    setDraftAvatarSeed(undefined);
    const current = agent.lucideIconName?.trim();
    if (current && isAgentLucideIconName(current)) {
      setTab("icon");
      setSelectedIcon(current);
    } else {
      setTab("avatar");
      setSelectedIcon("Bot");
    }
  }, [open, agent.lucideIconName]);

  const filteredIcons = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [...AGENT_LUCIDE_ICON_NAMES];
    }
    return AGENT_LUCIDE_ICON_NAMES.filter((name) => name.toLowerCase().includes(q));
  }, [query]);

  const previewSeed = agentAvatarSeed(
    agent.id,
    agent.name,
    draftAvatarSeed !== undefined ? draftAvatarSeed : agent.avatarSeed
  );
  const iconPreviewSeed = agentAvatarSeed(agent.id, agent.name, agent.avatarSeed);

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      if (tab === "icon") {
        await apiPut(`/agents/${agent.id}`, companyId, { lucideIconName: selectedIcon });
      } else {
        const body: Record<string, unknown> = { lucideIconName: "" };
        if (draftAvatarSeed !== undefined) {
          body.avatarSeed = draftAvatarSeed;
        }
        await apiPut(`/agents/${agent.id}`, companyId, body);
      }
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save appearance.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agent appearance</DialogTitle>
          <DialogDescription>
            Choose an avatar portrait or a Lucide icon for {agent.name}.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "avatar" | "icon")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="avatar">Avatar</TabsTrigger>
            <TabsTrigger value="icon">Icon</TabsTrigger>
          </TabsList>
          <TabsContent value="avatar" className="space-y-6">
            <div className={styles.previewRow}>
              <AgentAvatar
                seed={previewSeed}
                name={agent.name}
                size={96}
                className="size-12 shrink-0 rounded-full"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-2"
                onClick={() => setDraftAvatarSeed(randomAvatarSeed())}
              >
                <RefreshCw className="size-4" aria-hidden />
                Random avatar
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="icon" className="space-y-6">
            <div className={styles.iconGrid}>
              {filteredIcons.map((name) => {
                const Icon = AGENT_LUCIDE_ICON_MAP[name];
                return (
                  <button
                    key={name}
                    type="button"
                    className={cn(styles.iconChoice, selectedIcon === name ? styles.iconChoiceSelected : null)}
                    onClick={() => setSelectedIcon(name)}
                    aria-label={name}
                    title={name}
                  >
                    <Icon size={22} strokeWidth={2} aria-hidden />
                  </button>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void onSave()} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
