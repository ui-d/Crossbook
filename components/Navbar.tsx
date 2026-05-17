"use client";

import { SignedOut, SignInButton, SignedIn, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
  matchPrefixes?: string[];
}

const PUBLIC_LINKS: NavLink[] = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing", matchPrefixes: ["/pricing", "/subscription"] },
];

const AUTH_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/upload", label: "New report", matchPrefixes: ["/upload", "/report"] },
  { href: "/pricing", label: "Pricing", matchPrefixes: ["/pricing", "/subscription"] },
];

const APP_SHELL_PREFIXES = ["/dashboard", "/upload", "/report", "/subscription"];

function isAppShellRoute(pathname: string): boolean {
  return APP_SHELL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isActive(pathname: string, link: NavLink): boolean {
  if (link.matchPrefixes) {
    return link.matchPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  }
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

function NavItem({ link, active }: { link: NavLink; active: boolean }) {
  return (
    <Link
      href={link.href}
      className={cn(
        "px-3 py-1.5 rounded-full text-[14px] transition-colors duration-150",
        active ? "text-fg" : "text-fg-muted hover:text-fg",
      )}
    >
      {link.label}
    </Link>
  );
}

function Wordmark() {
  return (
    <Link href="/" className="inline-flex items-center gap-2 group">
      <BrandMark size={28} variant="inverted" />
      <span className="font-sans text-[15px] font-medium tracking-tight text-fg">
        Crossbook
      </span>
    </Link>
  );
}

const Navbar = () => {
  const pathname = usePathname() ?? "/";
  const [scrolled, setScrolled] = useState(false);
  const minimal = isAppShellRoute(pathname);

  useEffect(() => {
    let raf = 0;
    let last = window.scrollY > 8;
    setScrolled(last);
    const sync = () => {
      const next = window.scrollY > 8;
      if (next !== last) {
        last = next;
        setScrolled(next);
      }
      raf = 0;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(sync);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 bg-bg/80 backdrop-blur-md transition-[border-color,box-shadow] duration-200",
        scrolled ? "border-b border-hairline" : "border-b border-transparent",
      )}
    >
      <div className="flex justify-between items-center w-full px-6 py-3 max-w-[1200px] mx-auto gap-4">
        <div className="flex items-center gap-6">
          <Wordmark />
          {!minimal && (
            <nav className="hidden md:flex items-center gap-1">
              <SignedOut>
                {PUBLIC_LINKS.map((link) => (
                  <NavItem key={link.href} link={link} active={isActive(pathname, link)} />
                ))}
              </SignedOut>
              <SignedIn>
                {AUTH_LINKS.map((link) => (
                  <NavItem key={link.href} link={link} active={isActive(pathname, link)} />
                ))}
              </SignedIn>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2">
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm">Sign in</Button>
            </SignInButton>
            {!minimal && (
              <Link href="/upload">
                <Button variant="default" size="sm">Try free</Button>
              </Link>
            )}
          </SignedOut>
          <SignedIn>
            {!minimal && (
              <Link href="/upload" className="hidden sm:inline-flex">
                <Button variant="default" size="sm">New report</Button>
              </Link>
            )}
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "size-8",
                },
              }}
            />
          </SignedIn>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
