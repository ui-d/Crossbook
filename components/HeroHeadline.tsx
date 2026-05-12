import { cn } from "@/lib/utils";

interface HeroHeadlineProps {
  roman: React.ReactNode;
  italic?: React.ReactNode;
  as?: "h1" | "h2";
  className?: string;
}

export function HeroHeadline({
  roman,
  italic,
  as: Tag = "h1",
  className,
}: HeroHeadlineProps) {
  return (
    <Tag
      className={cn(
        "font-serif text-fg text-balance",
        Tag === "h1"
          ? "text-[clamp(44px,6vw,72px)] leading-[1.05]"
          : "text-[clamp(32px,4vw,48px)] leading-[1.1]",
        className,
      )}
    >
      {roman}
      {italic && (
        <>
          {" "}
          <em className="italic font-serif text-fg-muted">{italic}</em>
        </>
      )}
    </Tag>
  );
}
