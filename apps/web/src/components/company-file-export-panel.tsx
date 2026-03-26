"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { ApiError, apiDownloadExportZip, apiFetchExportPreview, apiGet, apiPostFormData } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type ManifestFile = { path: string; bytes: number; source: string };

export function CompanyFileExportCard({ companyId, companyName }: { companyId: string; companyName: string }) {
  const searchId = useId();
  const [files, setFiles] = useState<ManifestFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activePath, setActivePath] = useState<string | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadManifest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiGet<{ files: ManifestFile[] }>(
        `/companies/${encodeURIComponent(companyId)}/export/files/manifest?includeAgentMemory=1`,
        companyId
      );
      setFiles(data.files);
      setSelected(new Set(data.files.map((f) => f.path)));
      setActivePath(null);
      setPreview("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
      setFiles([]);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadManifest();
  }, [loadManifest]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return files;
    }
    return files.filter((f) => f.path.toLowerCase().includes(q));
  }, [files, search]);

  const filteredAllSelected = useMemo(() => {
    if (filtered.length === 0) {
      return false;
    }
    return filtered.every((f) => selected.has(f.path));
  }, [filtered, selected]);

  const selectedCount = selected.size;
  const totalCount = files.length;

  const togglePath = (path: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(path);
      } else {
        next.delete(path);
      }
      return next;
    });
  };

  const toggleFilteredSelection = () => {
    if (filtered.length === 0) {
      return;
    }
    if (filteredAllSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const f of filtered) {
          next.delete(f.path);
        }
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const f of filtered) {
          next.add(f.path);
        }
        return next;
      });
    }
  };

  const openPreview = async (path: string) => {
    setActivePath(path);
    setPreviewLoading(true);
    setPreview("");
    try {
      const text = await apiFetchExportPreview(companyId, path, true);
      setPreview(text);
    } catch (e) {
      setPreview(e instanceof ApiError ? e.message : String(e));
    } finally {
      setPreviewLoading(false);
    }
  };

  const onExportZip = async () => {
    if (selectedCount === 0) {
      return;
    }
    setExporting(true);
    setError(null);
    try {
      const paths = selectedCount === totalCount ? null : [...selected];
      const blob = await apiDownloadExportZip(companyId, { paths, includeAgentMemory: true });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `company-${companyId}-export.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{companyName}</CardTitle>
        <CardDescription>
          Download your company as a zip archive.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <div className="flex min-h-[320px] flex-col gap-4 rounded-md border px-4 py-4">
          <Field className="w-full">
            <Input id={searchId} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter by path…" />
          </Field>
          {error ? <p className="text-destructive text-base">{error}</p> : null}
          <ScrollArea className="h-[280px] rounded border">
            <ul className=" px-4 py-4">
              {filtered.map((f) => (
                <li key={f.path}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-start gap-4 rounded px-2 pb-1 text-base hover:bg-muted/60",
                      activePath === f.path && "bg-muted"
                    )}
                  >
                    <Checkbox
                      checked={selected.has(f.path)}
                      onCheckedChange={(v) => togglePath(f.path, v === true)}
                      className="mt-1"
                    />
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left font-mono text-base break-all"
                      onClick={() => void openPreview(f.path)}
                    >
                      {f.path}
                      <span className="text-muted-foreground ml-2">({f.bytes} B)</span>
                    </button>
                  </label>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>
        <div className="flex min-h-[320px] flex-col gap-2 rounded-md border px-4 py-4">
          <ScrollArea className="max-h-[360px] rounded border bg-muted/30 px-4 py-4">
            <pre className="font-mono text-base whitespace-pre-wrap wrap-break-word">
              {previewLoading ? "Loading…" : preview || "Select a file to preview."}
            </pre>
          </ScrollArea>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-base">
          {loading ? "Preparing export…" : `${selectedCount} of ${totalCount} file${totalCount === 1 ? "" : "s"} will be included in the zip.`}
        </p>
        <div className="flex w-full flex-wrap items-center justify-end gap-6 sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || filtered.length === 0}
            aria-pressed={filteredAllSelected}
            onClick={toggleFilteredSelection}
          >
            {filtered.length === 0
              ? "No matching files"
              : filteredAllSelected
                ? "Clear filtered"
                : "Select filtered"}
          </Button>
          <Button type="button" size="sm" disabled={exporting || selectedCount === 0 || loading} onClick={() => void onExportZip()}>
            {exporting ? "Building zip…" : `Export ${selectedCount} file${selectedCount === 1 ? "" : "s"}`}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

export function CompanyFileImportCard() {
  const importInputId = useId();
  const [importBusy, setImportBusy] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const onImportZip = async (list: FileList | null) => {
    const file = list?.[0];
    if (!file) {
      return;
    }
    setImportBusy(true);
    setImportMessage(null);
    try {
      const fd = new FormData();
      fd.append("archive", file);
      const { data } = await apiPostFormData<{ companyId: string; name: string }>("/companies/import/files", null, fd);
      setImportMessage(`Imported new company “${data.name}” (${data.companyId}). Refresh the company list to open it.`);
    } catch (e) {
      setImportMessage(e instanceof ApiError ? e.message : String(e));
    } finally {
      setImportBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import company from zip</CardTitle>
        <CardDescription>
          Board role required. Creates a new company from a Bopo export archive (form field name must be{" "}
          <code className="text-xs">archive</code>).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Field>
          <FieldLabel htmlFor={importInputId}>Zip archive</FieldLabel>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Input
              id={importInputId}
              type="file"
              accept=".zip,application/zip"
              disabled={importBusy}
              onChange={(e) => void onImportZip(e.target.files)}
            />
            {importBusy ? <span className="text-muted-foreground text-base">Importing…</span> : null}
          </div>
          {importMessage ? <p className="mt-2 text-base">{importMessage}</p> : null}
        </Field>
      </CardContent>
    </Card>
  );
}
