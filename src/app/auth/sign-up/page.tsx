import { Suspense } from "react";
import { AuthScreen } from "@/modules/auth/components/auth-screen";

export default function SignUpPage() {
  return (
    <Suspense>
      <AuthScreen initialMode="sign-up" />
    </Suspense>
  );
}
