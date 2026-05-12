import { SignIn } from "@clerk/nextjs";

import SiteFooter from "@/components/SiteFooter";

export const metadata = {
  title: "Sign in — Crossbook",
};

export default function SignInPage() {
  return (
    <>
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md flex flex-col items-center gap-6">
          <div className="text-center flex flex-col gap-1">
            <h1 className="font-display text-[28px] font-bold tracking-tight text-on-surface">
              Welcome back
            </h1>
            <p className="text-[14px] text-on-surface-variant">
              Sign in with Google to access your reports and monthly deltas.
            </p>
          </div>
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-surface-container-lowest border border-outline-variant shadow-ambient rounded-xl",
              },
            }}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
