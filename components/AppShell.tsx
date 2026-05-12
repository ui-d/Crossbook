"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileUp,
  CreditCard,
  ShieldCheck,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import SiteFooter from "@/components/SiteFooter";

type ShellLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  matchPrefixes?: string[];
};

const PRIMARY_LINKS: ShellLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "New report", icon: FileUp, matchPrefixes: ["/upload", "/report"] },
  { href: "/subscription", label: "Subscription", icon: CreditCard },
];

const SECONDARY_LINKS: ShellLink[] = [
  { href: "/privacy", label: "Privacy", icon: ShieldCheck },
  { href: "mailto:dawiddeveloper@gmail.com", label: "Help", icon: HelpCircle },
];

function isActive(pathname: string, link: ShellLink): boolean {
  if (link.matchPrefixes) {
    return link.matchPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  }
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

function ShellNavItem({ link, active }: { link: ShellLink; active: boolean }) {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-[14px] transition-colors",
        active
          ? "bg-primary-container text-on-primary font-semibold"
          : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
      )}
    >
      <Icon className="size-[18px]" />
      <span>{link.label}</span>
    </Link>
  );
}

interface AppShellProps {
  children: React.ReactNode;
  /** Optional title shown at top of main area (above children). */
  title?: string;
  /** Optional subtitle below the title. */
  subtitle?: React.ReactNode;
  /** Optional actions rendered to the right of the title row. */
  actions?: React.ReactNode;
}

export default function AppShell({ children, title, subtitle, actions }: AppShellProps) {
  const pathname = usePathname() ?? "/";

  return (
    <div className="flex flex-1 w-full max-w-[1200px] mx-auto">
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-outline-variant bg-surface-container-low/40 px-4 py-6 gap-1">
        <div className="px-3 pb-4">
          <p className="text-label-caps text-on-surface-variant">Workspace</p>
        </div>
        <nav className="flex flex-col gap-1">
          {PRIMARY_LINKS.map((link) => (
            <ShellNavItem key={link.href} link={link} active={isActive(pathname, link)} />
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t border-outline-variant flex flex-col gap-1">
          {SECONDARY_LINKS.map((link) => (
            <ShellNavItem key={link.href} link={link} active={isActive(pathname, link)} />
          ))}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 px-6 py-8 flex flex-col gap-8">
          {(title || actions) && (
            <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                {title && (
                  <h1 className="font-display text-[28px] md:text-[32px] font-bold tracking-tight text-on-surface">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="mt-1 text-[14px] text-on-surface-variant max-w-2xl">{subtitle}</p>
                )}
              </div>
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </header>
          )}
          {children}
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
