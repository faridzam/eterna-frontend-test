"use client";

import { useRouter } from "next/navigation";
import { AuthForm } from "./auth-form";

export function RegisterScreen() {
  const router = useRouter();
  return (
    <main className="auth-screen">
      <AuthForm
        mode="register"
        onRegistered={() => router.replace("/login?registered=1")}
      />
    </main>
  );
}
