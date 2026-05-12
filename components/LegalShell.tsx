import SiteFooter from "@/components/SiteFooter";

interface LegalShellProps {
  title: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

export default function LegalShell({ title, lastUpdated, children }: LegalShellProps) {
  return (
    <>
      <main className="flex-1 w-full">
        <section className="max-w-[800px] mx-auto px-6 py-12">
          <header className="border-b border-outline-variant pb-6 mb-8">
            <h1 className="font-display text-[36px] md:text-[40px] font-bold tracking-tight text-on-surface">
              {title}
            </h1>
            {lastUpdated && (
              <p className="text-[13px] text-on-surface-variant mt-1">Last updated: {lastUpdated}</p>
            )}
          </header>
          <div className="legal-prose flex flex-col gap-6 text-[15px] text-on-surface-variant leading-[1.7]">
            {children}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
