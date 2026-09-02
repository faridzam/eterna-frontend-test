import { AuthProvider } from "@/src/features/auth/components/auth-provider";
import { AuthScreen } from "@/src/features/auth/components/auth-screen";

export default function Home() {
  return (
    <AuthProvider><AuthScreen /></AuthProvider>
  );
}
