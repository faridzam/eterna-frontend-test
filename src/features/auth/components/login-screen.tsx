"use client";

import { useSearchParams } from "next/navigation";
import { AuthForm } from "./auth-form";

export function LoginScreen() {
  const searchParams = useSearchParams();
  return (
    <main className="auth-screen">
      <AuthForm
        initialSuccessMessage={
          searchParams.get("registered") === "1"
            ? "Registration completed. Please sign in."
            : undefined
        }
        mode="login"
        registrationHref="/register"
      />
    </main>
  );
}
