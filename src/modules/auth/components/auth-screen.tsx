"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  emailSignInSchema,
  emailSignUpSchema,
  phoneRequestSchema,
  phoneVerifySchema,
  type EmailSignInInput,
  type EmailSignUpInput,
  type PhoneRequestInput,
  type PhoneVerifyInput,
} from "../domain/schema";
import {
  requestPhoneOtp,
  signInWithEmail,
  signUpWithEmail,
  verifyPhoneOtp,
} from "../service/actions";

type Tab = "phone" | "email";
type Mode = "sign-in" | "sign-up";

export function AuthScreen({ initialMode }: { initialMode: Mode }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [tab, setTab] = useState<Tab>("phone");
  const [mode, setMode] = useState<Mode>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSuccess() {
    router.push(next);
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("welcomeTitle")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("welcomeBody")}</p>
      </div>

      <div className="flex rounded-xl border border-border bg-surface p-1">
        {(["phone", "email"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setTab(value);
              setError(null);
            }}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
              tab === value ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(value === "phone" ? "phoneTab" : "emailTab")}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {tab === "phone" ? (
        <PhoneFlow pending={pending} startTransition={startTransition} setError={setError} onSuccess={onSuccess} />
      ) : (
        <EmailFlow
          mode={mode}
          pending={pending}
          startTransition={startTransition}
          setError={setError}
          onSuccess={onSuccess}
        />
      )}

      {tab === "email" && (
        <p className="text-center text-sm text-muted-foreground">
          {t(mode === "sign-in" ? "signUpPrompt" : "signInPrompt")}{" "}
          <button
            type="button"
            className="font-medium text-brand hover:underline"
            onClick={() => {
              setMode(mode === "sign-in" ? "sign-up" : "sign-in");
              setError(null);
            }}
          >
            {t(mode === "sign-in" ? "switchToSignUp" : "switchToSignIn")}
          </button>
        </p>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {t("merchantCta")}{" "}
        <a href="/merchant" className="font-medium text-brand hover:underline">
          {t("merchantCtaLink")}
        </a>
      </p>
    </div>
  );
}

type Pending = boolean;
type StartTransition = (callback: () => void | Promise<void>) => void;

function PhoneFlow({
  pending,
  startTransition,
  setError,
  onSuccess,
}: {
  pending: Pending;
  startTransition: StartTransition;
  setError: (message: string | null) => void;
  onSuccess: () => void;
}) {
  const t = useTranslations("auth");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [phone, setPhone] = useState("");

  const requestForm = useForm<PhoneRequestInput>({
    resolver: zodResolver(phoneRequestSchema),
    defaultValues: { phone: "" },
  });
  const verifyForm = useForm<PhoneVerifyInput>({
    resolver: zodResolver(phoneVerifySchema),
    defaultValues: { phone: "", code: "" },
  });

  return step === "request" ? (
    <form
      className="flex flex-col gap-4"
      onSubmit={requestForm.handleSubmit((values) => {
        setError(null);
        startTransition(async () => {
          const result = await requestPhoneOtp(values);
          if (!result.ok) return setError(result.error);
          setPhone(values.phone);
          verifyForm.setValue("phone", values.phone);
          setStep("verify");
        });
      })}
    >
      <div>
        <Label htmlFor="phone">{t("phoneLabel")}</Label>
        <Input id="phone" type="tel" placeholder="+91 98765 43210" {...requestForm.register("phone")} />
        {requestForm.formState.errors.phone && (
          <p className="mt-1 text-xs text-danger">{requestForm.formState.errors.phone.message}</p>
        )}
        <p className="mt-1.5 text-xs text-muted-foreground">{t("phoneHelp")}</p>
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {t("sendCode")}
      </Button>
    </form>
  ) : (
    <form
      className="flex flex-col gap-4"
      onSubmit={verifyForm.handleSubmit((values) => {
        setError(null);
        startTransition(async () => {
          const result = await verifyPhoneOtp(values);
          if (!result.ok) return setError(result.error);
          onSuccess();
        });
      })}
    >
      <div>
        <Label htmlFor="code">{t("codeLabel")}</Label>
        <p className="mb-1.5 text-xs text-muted-foreground">{t("codeSentTo", { phone })}</p>
        <Input id="code" inputMode="numeric" maxLength={6} autoFocus {...verifyForm.register("code")} />
        {verifyForm.formState.errors.code && (
          <p className="mt-1 text-xs text-danger">{verifyForm.formState.errors.code.message}</p>
        )}
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {t("verifyAndContinue")}
      </Button>
      <button
        type="button"
        className="text-sm text-muted-foreground hover:text-foreground"
        onClick={() => setStep("request")}
      >
        {t("changeNumber")}
      </button>
    </form>
  );
}

function EmailFlow({
  mode,
  pending,
  startTransition,
  setError,
  onSuccess,
}: {
  mode: Mode;
  pending: Pending;
  startTransition: StartTransition;
  setError: (message: string | null) => void;
  onSuccess: () => void;
}) {
  const t = useTranslations("auth");
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null);

  const signInForm = useForm<EmailSignInInput>({
    resolver: zodResolver(emailSignInSchema),
    defaultValues: { email: "", password: "" },
  });
  const signUpForm = useForm<EmailSignUpInput>({
    resolver: zodResolver(emailSignUpSchema),
    defaultValues: { email: "", password: "", fullName: "" },
  });

  if (confirmationSentTo) {
    return (
      <div className="rounded-xl bg-brand-soft px-4 py-4 text-sm text-foreground">
        <p className="font-medium">{t("checkEmailTitle")}</p>
        <p className="mt-1 text-muted-foreground">{t("checkEmailBody", { email: confirmationSentTo })}</p>
      </div>
    );
  }

  if (mode === "sign-in") {
    return (
      <form
        className="flex flex-col gap-4"
        onSubmit={signInForm.handleSubmit((values) => {
          setError(null);
          startTransition(async () => {
            const result = await signInWithEmail(values);
            if (!result.ok) return setError(result.error);
            onSuccess();
          });
        })}
      >
        <div>
          <Label htmlFor="email">{t("emailLabel")}</Label>
          <Input id="email" type="email" autoComplete="email" {...signInForm.register("email")} />
          {signInForm.formState.errors.email && (
            <p className="mt-1 text-xs text-danger">{signInForm.formState.errors.email.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="password">{t("passwordLabel")}</Label>
          <Input id="password" type="password" autoComplete="current-password" {...signInForm.register("password")} />
          {signInForm.formState.errors.password && (
            <p className="mt-1 text-xs text-danger">{signInForm.formState.errors.password.message}</p>
          )}
        </div>
        <Button type="submit" disabled={pending} className="w-full">
          {t("signInAction")}
        </Button>
      </form>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={signUpForm.handleSubmit((values) => {
        setError(null);
        startTransition(async () => {
          const result = await signUpWithEmail(values);
          if (!result.ok) return setError(result.error);
          setConfirmationSentTo(values.email);
        });
      })}
    >
      <div>
        <Label htmlFor="fullName">{t("fullNameLabel")}</Label>
        <Input id="fullName" autoComplete="name" {...signUpForm.register("fullName")} />
        {signUpForm.formState.errors.fullName && (
          <p className="mt-1 text-xs text-danger">{signUpForm.formState.errors.fullName.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="signUpEmail">{t("emailLabel")}</Label>
        <Input id="signUpEmail" type="email" autoComplete="email" {...signUpForm.register("email")} />
        {signUpForm.formState.errors.email && (
          <p className="mt-1 text-xs text-danger">{signUpForm.formState.errors.email.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="signUpPassword">{t("passwordLabel")}</Label>
        <Input
          id="signUpPassword"
          type="password"
          autoComplete="new-password"
          {...signUpForm.register("password")}
        />
        {signUpForm.formState.errors.password && (
          <p className="mt-1 text-xs text-danger">{signUpForm.formState.errors.password.message}</p>
        )}
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {t("signUpAction")}
      </Button>
    </form>
  );
}
