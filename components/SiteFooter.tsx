import Link from "next/link";

const FOOTER_LINKS: { href: string; label: string }[] = [
  { href: "/privacy", label: "Privacy" },
  { href: "/dpa", label: "DPA" },
  { href: "/privacy/delete", label: "Delete data" },
  { href: "mailto:dawiddeveloper@gmail.com", label: "Support" },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-hairline bg-bg mt-auto">
      <div className="max-w-[1120px] mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-[13px] text-fg-muted">
          Crossbook · © {new Date().getFullYear()} · Reconciliation in plain English.
        </p>
        <nav className="flex flex-wrap justify-center gap-5">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] text-fg-muted hover:text-fg transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
