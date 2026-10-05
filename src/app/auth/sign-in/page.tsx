import { Suspense } from "react";
import { AuthScreen } from "@/modules/auth/components/auth-screen";

export default function SignInPage() {
  return (
    <Suspense>
      <AuthScreen initialMode="sign-in" />
    </Suspense>
  );
}
