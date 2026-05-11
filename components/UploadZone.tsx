"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 4000;

const emailSchema = z.string().email();

type Slot = "hubspot" | "quickbooks";

interface FileMeta {
  file: File;
  approxRowCount: number;
}

interface UploadState {
  hubspot: FileMeta | null;
  quickbooks: FileMeta | null;
  email: string;
  emailError: string | null;
  fileErrors: Partial<Record<Slot, string>>;
  status: "idle" | "submitting" | "success" | "error";
  serverMessage: string | null;
}

const initialState: UploadState = {
  hubspot: null,
  quickbooks: null,
  email: "",
  emailError: null,
  fileErrors: {},
  status: "idle",
  serverMessage: null,
};

const countApproxRows = async (file: File): Promise<number> => {
  const text = await file.text();
  let newlines = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) newlines++;
  }
  return Math.max(0, newlines - 1);
};

const validateFile = (file: File): string | null => {
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return "File must be a .csv";
  }
  if (file.size > MAX_FILE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return `File is ${mb} MB. Max 5 MB per upload.`;
  }
  return null;
};

interface UploadZoneProps {
  endpoint?: string;
}

export function UploadZone({ endpoint = "/api/reconcile" }: UploadZoneProps) {
  const [state, setState] = useState<UploadState>(initialState);
  const [dragSlot, setDragSlot] = useState<Slot | null>(null);
  const hubspotInputRef = useRef<HTMLInputElement>(null);
  const quickbooksInputRef = useRef<HTMLInputElement>(null);

  const acceptFile = useCallback(async (slot: Slot, file: File) => {
    const formatError = validateFile(file);
    if (formatError) {
      setState((s) => ({
        ...s,
        fileErrors: { ...s.fileErrors, [slot]: formatError },
      }));
      return;
    }

    const approxRowCount = await countApproxRows(file);
    if (approxRowCount > MAX_ROWS) {
      setState((s) => ({
        ...s,
        fileErrors: {
          ...s.fileErrors,
          [slot]: `${approxRowCount.toLocaleString()} rows detected. Max ${MAX_ROWS.toLocaleString()} per file on the free tier.`,
        },
      }));
      return;
    }

    setState((s) => ({
      ...s,
      [slot]: { file, approxRowCount },
      fileErrors: { ...s.fileErrors, [slot]: undefined },
    }));
  }, []);

  const handleDrop = useCallback(
    (slot: Slot) => (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragSlot(null);
      const file = event.dataTransfer.files?.[0];
      if (file) {
        void acceptFile(slot, file);
      }
    },
    [acceptFile],
  );

  const handleSelect = useCallback(
    (slot: Slot) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        void acceptFile(slot, file);
      }
    },
    [acceptFile],
  );

  const canSubmit = useMemo(() => {
    return (
      state.hubspot !== null &&
      state.quickbooks !== null &&
      state.email.trim() !== "" &&
      state.status !== "submitting"
    );
  }, [state.hubspot, state.quickbooks, state.email, state.status]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const emailParse = emailSchema.safeParse(state.email.trim());
      if (!emailParse.success) {
        setState((s) => ({ ...s, emailError: "Enter a valid email." }));
        return;
      }
      if (!state.hubspot || !state.quickbooks) return;

      setState((s) => ({
        ...s,
        emailError: null,
        status: "submitting",
        serverMessage: null,
      }));

      const formData = new FormData();
      formData.append("hubspot_file", state.hubspot.file);
      formData.append("quickbooks_file", state.quickbooks.file);
      formData.append("email", emailParse.data);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          body: formData,
        });
        if (!response.ok) {
          const text = await response.text();
          setState((s) => ({
            ...s,
            status: "error",
            serverMessage: text || `Server returned ${response.status}.`,
          }));
          return;
        }
        const data = (await response.json()) as { id?: string; redirect?: string };
        if (data.redirect) {
          window.location.href = data.redirect;
          return;
        }
        if (data.id) {
          window.location.href = `/report/${data.id}`;
          return;
        }
        setState((s) => ({
          ...s,
          status: "success",
          serverMessage: "Report queued.",
        }));
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unexpected error.";
        setState((s) => ({
          ...s,
          status: "error",
          serverMessage: message,
        }));
      }
    },
    [endpoint, state.email, state.hubspot, state.quickbooks],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <DropTarget
          slot="hubspot"
          label="HubSpot Deals CSV"
          hint="Export from HubSpot → Deals → Actions → Export"
          file={state.hubspot}
          error={state.fileErrors.hubspot}
          isDragOver={dragSlot === "hubspot"}
          onDragOver={(e) => {
            e.preventDefault();
            setDragSlot("hubspot");
          }}
          onDragLeave={() => setDragSlot(null)}
          onDrop={handleDrop("hubspot")}
          onClick={() => hubspotInputRef.current?.click()}
          inputRef={hubspotInputRef}
          onSelect={handleSelect("hubspot")}
        />
        <DropTarget
          slot="quickbooks"
          label="QuickBooks Customers/Invoices CSV"
          hint="Export from QuickBooks → Reports → Export to CSV"
          file={state.quickbooks}
          error={state.fileErrors.quickbooks}
          isDragOver={dragSlot === "quickbooks"}
          onDragOver={(e) => {
            e.preventDefault();
            setDragSlot("quickbooks");
          }}
          onDragLeave={() => setDragSlot(null)}
          onDrop={handleDrop("quickbooks")}
          onClick={() => quickbooksInputRef.current?.click()}
          inputRef={quickbooksInputRef}
          onSelect={handleSelect("quickbooks")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="upload-email">Email (we send your report here)</Label>
        <Input
          id="upload-email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
          value={state.email}
          onChange={(event) =>
            setState((s) => ({
              ...s,
              email: event.target.value,
              emailError: null,
            }))
          }
        />
        {state.emailError ? (
          <p className="text-destructive text-sm">{state.emailError}</p>
        ) : null}
      </div>

      <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
        🔒 Your CSV files are deleted after 30 days. Reports are kept while your
        account is active.{" "}
        <a className="underline" href="/privacy">
          Privacy Policy
        </a>
      </div>

      <Button type="submit" size="lg" disabled={!canSubmit}>
        {state.status === "submitting"
          ? "Analyzing…"
          : "Reconcile → see conflicts in 60 seconds"}
      </Button>

      {state.serverMessage ? (
        <p
          className={cn(
            "text-sm",
            state.status === "error"
              ? "text-destructive"
              : "text-muted-foreground",
          )}
        >
          {state.serverMessage}
        </p>
      ) : null}
    </form>
  );
}

interface DropTargetProps {
  slot: Slot;
  label: string;
  hint: string;
  file: FileMeta | null;
  error: string | undefined;
  isDragOver: boolean;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onClick: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

function DropTarget({
  slot,
  label,
  hint,
  file,
  error,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  inputRef,
  onSelect,
}: DropTargetProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick();
          }
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "border-2 border-dashed rounded-md p-6 cursor-pointer transition text-center",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted hover:border-primary/60",
          error ? "border-destructive" : null,
        )}
      >
        {file ? (
          <div className="space-y-1">
            <p className="text-sm font-medium">{file.file.name}</p>
            <p className="text-muted-foreground text-xs">
              {(file.file.size / 1024).toFixed(1)} KB ·{" "}
              {file.approxRowCount.toLocaleString()} rows (approx)
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-sm">Drop your CSV here or click to browse</p>
            <p className="text-muted-foreground text-xs">{hint}</p>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        data-testid={`upload-input-${slot}`}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={onSelect}
      />
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
