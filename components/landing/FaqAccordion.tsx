"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FaqItem {
  q: string;
  a: string;
}

interface FaqAccordionProps {
  items: FaqItem[];
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  return (
    <Accordion type="single" collapsible className="bg-bg rounded-[14px] border border-hairline overflow-hidden">
      {items.map((item, i) => (
        <AccordionItem
          key={item.q}
          value={`item-${i}`}
          className="border-b border-hairline last:border-b-0 data-[state=open]:bg-bg-tint/40 transition-colors"
        >
          <AccordionTrigger className="px-6 py-5 text-[15px] font-medium text-fg hover:no-underline [&[data-state=open]]:text-fg">
            {item.q}
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-5 text-[14px] text-fg-muted leading-relaxed">
            {item.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
