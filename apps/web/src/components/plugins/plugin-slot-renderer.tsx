"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PluginRow } from "@/components/workspace/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiError, apiGet, fetchPluginUiDocument } from "@/lib/api";
import { resolvePluginSlots, type PluginSlotName } from "@/lib/plugins/slot-registry";

export function PluginSlotRenderer(props: {
  companyId: string;
  slot: PluginSlotName;
  plugins: PluginRow[];
  issueId?: string;
}) {
  const slots = useMemo(() => resolvePluginSlots(props.plugins, props.slot), [props.plugins, props.slot]);
  if (slots.length === 0) {
    return null;
  }
  return (
    <div className="space-y-3">
      {slots.map((slot) => (
        <div key={`${slot.pluginId}:${slot.slot}`} className="rounded-md border p-3">
          <div className="mb-2 text-sm font-medium">{slot.displayName}</div>
          <PluginSlotActionCard companyId={props.companyId} pluginId={slot.pluginId} issueId={props.issueId} />
        </div>
      ))}
    </div>
  );
}

function PluginSlotActionCard(props: { companyId: string; pluginId: string; issueId?: string }) {
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [loadPhase, setLoadPhase] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [healthHint, setHealthHint] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadPhase("loading");
    setLoadError(null);
    setIframeSrc(null);

    void (async () => {
      try {
        const html = await fetchPluginUiDocument(props.companyId, props.pluginId);
        if (cancelled) {
          return;
        }
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
        }
        blobUrlRef.current = url;
        setIframeSrc(url);
        setLoadPhase("ready");
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
        const message = error instanceof ApiError ? error.message : String(error);
        setLoadError(message);
        setLoadPhase("error");
      }
    })();

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [props.companyId, props.pluginId]);

  const runHealth = async () => {
    setHealthHint(null);
    try {
      await apiGet(`/plugins/${encodeURIComponent(props.pluginId)}/health`, props.companyId);
      setHealthHint("Health check OK.");
    } catch (error) {
      setHealthHint(error instanceof ApiError ? error.message : String(error));
    }
  };

  return (
    <Alert>
      <AlertTitle>Plugin slot mounted</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>Rendering plugin UI from the installed artifact via the API (authenticated fetch).</p>
        {loadPhase === "loading" ? <p className="text-muted-foreground text-sm">Loading plugin UI…</p> : null}
        {loadPhase === "error" && loadError ? (
          <p className="text-destructive text-sm" role="alert">
            {loadError}
          </p>
        ) : null}
        {iframeSrc ? (
          <iframe
            title={`plugin-${props.pluginId}-slot`}
            src={iframeSrc}
            className="h-[420px] w-full rounded border bg-background"
            sandbox="allow-scripts allow-forms"
          />
        ) : null}
        <Button variant="outline" size="sm" onClick={() => void runHealth()}>
          Ping plugin health
        </Button>
        {healthHint ? <p className="text-muted-foreground text-sm">{healthHint}</p> : null}
      </AlertDescription>
    </Alert>
  );
}
