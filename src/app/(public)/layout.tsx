import { AuthProvider } from "@/src/features/auth/components/auth-provider";
import { PublicAuthLayout } from "@/src/features/auth/components/public-auth-layout";

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthProvider>
      <PublicAuthLayout>{children}</PublicAuthLayout>
    </AuthProvider>
  );
}
