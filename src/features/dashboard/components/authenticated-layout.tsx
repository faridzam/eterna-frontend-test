"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/components/auth-provider";

export function AuthenticatedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const auth = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  useEffect(() => {
    if (auth.status === "unauthenticated") router.replace("/login");
  }, [auth.status, router]);
  if (auth.status === "loading" || auth.status === "unauthenticated")
    return (
      <main className="status-screen">
        <p aria-live="polite">Loading your workspace...</p>
      </main>
    );
  if (auth.status === "error")
    return (
      <main className="status-screen">
        <p role="alert">{auth.error}</p>
        <button
          className="primary-button"
          onClick={() => void auth.refresh()}
          type="button"
        >
          Try again
        </button>
      </main>
    );
  if (pathname === "/") return children;
  async function signOut(): Promise<void> {
    if (pending) return;
    setPending(true);
    setSignOutError(null);
    try {
      await auth.logout();
    } catch (error: unknown) {
      setSignOutError(
        error instanceof Error
          ? error.message
          : "Sign out could not be completed. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <p className="eyebrow">STOCKFLOW</p>
        <button
          className="sign-out"
          disabled={pending}
          onClick={() => void signOut()}
          type="button"
        >
          {pending ? "Signing out" : "Sign out"}
        </button>
      </header>
      {signOutError === null ? null : (
        <p className="form-error" role="alert">
          {signOutError}
        </p>
      )}
      <nav aria-label="Workspace navigation" className="workspace-nav">
        <Link href="/">Overview</Link>
        <Link href="/products">Products</Link>
        <Link href="/invoices">Invoices</Link>
      </nav>
      {children}
    </main>
  );
}
