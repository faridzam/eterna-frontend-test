import { AuthProvider } from "@/src/features/auth/components/auth-provider";
import { AuthenticatedLayout } from "@/src/features/dashboard/components/authenticated-layout";

export default function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthProvider>
      <AuthenticatedLayout>{children}</AuthenticatedLayout>
    </AuthProvider>
  );
}
