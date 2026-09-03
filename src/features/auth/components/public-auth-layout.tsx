"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./auth-provider";

export function PublicAuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const auth = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (auth.status === "authenticated") router.replace("/");
  }, [auth.status, router]);
  if (auth.status === "loading" || auth.status === "authenticated")
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
  return <>{children}</>;
}
