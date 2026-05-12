import { FileText } from "lucide-react";

interface SourceCitationProps {
  hubspotRowIndex: number | null;
  quickbooksRowIndex: number | null;
}

export function SourceCitation({
  hubspotRowIndex,
  quickbooksRowIndex,
}: SourceCitationProps) {
  const parts: string[] = [];
  if (hubspotRowIndex !== null) parts.push(`HubSpot row ${hubspotRowIndex + 1}`);
  if (quickbooksRowIndex !== null) parts.push(`QBO row ${quickbooksRowIndex + 1}`);
  if (parts.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-on-surface-variant font-mono bg-surface-container-low px-2 py-1 rounded">
      <FileText className="size-3.5" />
      {parts.join(" · ")}
    </span>
  );
}
