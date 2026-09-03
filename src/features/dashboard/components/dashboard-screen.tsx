"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "../../auth/components/auth-provider";

export function DashboardScreen() {
  const auth = useAuth();
  const [pending, setPending] = useState(false);
  async function signOut(): Promise<void> {
    if (pending) return;
    setPending(true);
    try {
      await auth.logout();
    } catch {}
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
      <nav aria-label="Workspace navigation" className="workspace-nav">
        <Link href="/">Overview</Link>
        <Link href="/products">Products</Link>
        <Link href="/invoices">Invoices</Link>
      </nav>
      <section className="welcome" aria-labelledby="welcome-title">
        <p className="section-label">Workspace</p>
        <h1 id="welcome-title">Welcome back, {auth.user?.name}</h1>
        <p>Choose a workspace area to manage stock and billing.</p>
      </section>
    </main>
  );
}
