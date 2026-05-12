import { cn } from "@/lib/utils";

interface EyebrowTagProps {
  children: React.ReactNode;
  className?: string;
}

export function EyebrowTag({ children, className }: EyebrowTagProps) {
  return (
    <span className={cn("text-eyebrow inline-block", className)}>{children}</span>
  );
}
