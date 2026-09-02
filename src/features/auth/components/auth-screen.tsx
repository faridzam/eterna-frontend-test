"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { z } from "zod";
import { useAuth } from "./auth-provider";
import { safeErrorMessage } from "./form-errors";

const loginSchema = z.object({ email: z.string().trim().email("Enter a valid email address."), password: z.string().min(8, "Password must be at least 8 characters.") });
const registerSchema = loginSchema.extend({ name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100, "Name is too long.") });
type Mode = "login" | "register";
type FormValues = { email: string; name: string; password: string };
type FormErrors = Partial<Record<keyof FormValues, string>>;

function validationErrors(error: z.ZodError): FormErrors {
  const errors: FormErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && (field === "email" || field === "name" || field === "password") && errors[field] === undefined) {
      errors[field] = issue.message;
    }
  }
  return errors;
}

function Field({ autoComplete, error, label, name, onChange, type = "text", value }: Readonly<{
  autoComplete: string; error?: string; label: string; name: keyof FormValues; onChange: (name: keyof FormValues, value: string) => void; type?: "email" | "password" | "text"; value: string;
}>) {
  const errorId = `${name}-error`;
  return <div className="field">
    <label htmlFor={name}>{label}</label>
    <input aria-describedby={error === undefined ? undefined : errorId} aria-invalid={error === undefined ? undefined : true} autoComplete={autoComplete} id={name} name={name} onChange={(event) => onChange(name, event.target.value)} type={type} value={value} />
    {error === undefined ? null : <p className="field-error" id={errorId}>{error}</p>}
  </div>;
}

function AuthForm({ mode, onModeChange }: Readonly<{ mode: Mode; onModeChange: (mode: Mode) => void }>) {
  const auth = useAuth();
  const [values, setValues] = useState<FormValues>({ email: "", name: "", password: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  function changeValue(name: keyof FormValues, value: string): void {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (pending) { return; }
    setSuccessMessage(null);
    const parsedLogin = mode === "login" ? loginSchema.safeParse(values) : undefined;
    const parsedRegistration = mode === "register" ? registerSchema.safeParse(values) : undefined;
    if (parsedLogin !== undefined && !parsedLogin.success) {
      setErrors(validationErrors(parsedLogin.error));
      return;
    }
    if (parsedRegistration !== undefined && !parsedRegistration.success) {
      setErrors(validationErrors(parsedRegistration.error));
      return;
    }
    setPending(true); setFormError(null);
    try {
      if (parsedLogin !== undefined && parsedLogin.success) { await auth.login(parsedLogin.data); }
      else if (parsedRegistration !== undefined && parsedRegistration.success) {
        const result = await auth.register(parsedRegistration.data);
        setSuccessMessage(result.message);
        setValues((current) => ({ ...current, name: "", password: "" }));
        onModeChange("login");
      }
    } catch (requestError: unknown) { setSuccessMessage(null); setFormError(safeErrorMessage(requestError)); }
    finally { setPending(false); }
  }
  const isRegistering = mode === "register";
  return <form className="auth-form" noValidate onSubmit={(event) => void submit(event)}>
    <div className="form-heading"><p className="eyebrow">STOCKFLOW</p><h1>{isRegistering ? "Create your account" : "Sign in"}</h1><p>{isRegistering ? "Start managing your inventory." : "Use your work account to continue."}</p></div>
    {isRegistering ? <Field autoComplete="name" error={errors.name} label="Name" name="name" onChange={changeValue} value={values.name} /> : null}
    <Field autoComplete="email" error={errors.email} label="Email address" name="email" onChange={changeValue} type="email" value={values.email} />
    <Field autoComplete={isRegistering ? "new-password" : "current-password"} error={errors.password} label="Password" name="password" onChange={changeValue} type="password" value={values.password} />
    {successMessage === null ? null : <p aria-live="polite" className="form-success">{successMessage}</p>}
    {formError === null ? null : <p aria-live="polite" className="form-error">{formError}</p>}
    <button className="primary-button" disabled={pending} type="submit">{pending ? "Please wait" : isRegistering ? "Create account" : "Sign in"}</button>
    <button className="text-button" disabled={pending} onClick={() => { setSuccessMessage(null); onModeChange(isRegistering ? "login" : "register"); }} type="button">{isRegistering ? "Already have an account? Sign in" : "Need an account? Register"}</button>
  </form>;
}

function Dashboard() {
  const auth = useAuth();
  const [pending, setPending] = useState(false);
  async function signOut(): Promise<void> { if (!pending) { setPending(true); await auth.logout(); } }
  return <main className="dashboard">
    <header className="dashboard-header"><p className="eyebrow">STOCKFLOW</p><button className="sign-out" disabled={pending} onClick={() => void signOut()} type="button">{pending ? "Signing out" : "Sign out"}</button></header>
    <section className="welcome" aria-labelledby="welcome-title"><p className="section-label">Workspace</p><h1 id="welcome-title">Welcome back, {auth.user?.name}</h1><p>Products and invoices will appear here as your workspace grows.</p></section>
    <section className="empty-state" aria-label="Workspace is empty"><span aria-hidden="true">01</span><div><h2>Your workspace is ready</h2><p>There are no products or invoices to review yet.</p></div></section>
  </main>;
}

export function AuthScreen() {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  if (auth.status === "loading") { return <main className="status-screen"><p aria-live="polite">Loading your workspace...</p></main>; }
  if (auth.status === "error") { return <main className="status-screen"><p role="alert">{auth.error}</p><button className="primary-button" onClick={() => void auth.refresh()} type="button">Try again</button></main>; }
  if (auth.status === "authenticated") { return <Dashboard />; }
  return <main className="auth-screen"><AuthForm mode={mode} onModeChange={setMode} /></main>;
}