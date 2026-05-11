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
    <span className="text-xs text-muted-foreground font-mono">
      {parts.join(" · ")}
    </span>
  );
}
