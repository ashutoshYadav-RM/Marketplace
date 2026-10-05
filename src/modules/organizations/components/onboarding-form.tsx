"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBrowserLocation } from "@/modules/locations/hooks/use-browser-location";
import { registerOrganizationSchema, type RegisterOrganizationInput } from "../domain/schema";
import { registerOrganization } from "../service/actions";
import type { CountryOption } from "../data/organizations";

export function OnboardingForm({ countries }: { countries: CountryOption[] }) {
  const t = useTranslations("merchant");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { state: geo, detect } = useBrowserLocation();

  const form = useForm<RegisterOrganizationInput>({
    resolver: zodResolver(registerOrganizationSchema),
    defaultValues: {
      name: "",
      countryId: countries[0]?.iso2 ?? "IN",
      locationName: "Main branch",
      addressLine1: "",
      locality: "",
      city: "",
      region: "",
      postalCode: "",
      phone: "",
      timezone: "",
    },
  });

  // Prefill from the browser rather than assuming a timezone (§10).
  useEffect(() => {
    form.setValue("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (geo.status === "granted") {
      form.setValue("latitude", geo.latitude);
      form.setValue("longitude", geo.longitude);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo]);

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={form.handleSubmit((values) => {
        setError(null);
        startTransition(async () => {
          const result = await registerOrganization(values);
          if (!result.ok) return setError(result.error);
          router.refresh();
        });
      })}
    >
      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-semibold text-foreground">{t("businessSection")}</legend>
        <Field label={t("businessNameLabel")} error={form.formState.errors.name?.message}>
          <Input placeholder="Sharma General Store" {...form.register("name")} />
        </Field>
        <Field label={t("countryLabel")} error={form.formState.errors.countryId?.message}>
          <select
            className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            {...form.register("countryId")}
          >
            {countries.map((c) => (
              <option key={c.iso2} value={c.iso2}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-semibold text-foreground">{t("locationSection")}</legend>
        <Field label={t("locationNameLabel")} error={form.formState.errors.locationName?.message}>
          <Input placeholder="Main branch" {...form.register("locationName")} />
        </Field>
        <Field label={t("addressLabel")} error={form.formState.errors.addressLine1?.message}>
          <Input placeholder="Shop no. 4, MG Road" {...form.register("addressLine1")} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t("localityLabel")} error={form.formState.errors.locality?.message}>
            <Input placeholder="Koramangala" {...form.register("locality")} />
          </Field>
          <Field label={t("cityLabel")} error={form.formState.errors.city?.message}>
            <Input placeholder="Bengaluru" {...form.register("city")} />
          </Field>
          <Field label={t("regionLabel")} error={form.formState.errors.region?.message}>
            <Input {...form.register("region")} />
          </Field>
          <Field label={t("postalCodeLabel")} error={form.formState.errors.postalCode?.message}>
            <Input {...form.register("postalCode")} />
          </Field>
        </div>
        <Field label={t("shopPhoneLabel")} error={form.formState.errors.phone?.message}>
          <Input type="tel" placeholder="+91 98765 43210" {...form.register("phone")} />
        </Field>

        <div>
          <Button type="button" variant="secondary" size="sm" onClick={detect} disabled={geo.status === "detecting"}>
            <MapPin className="h-4 w-4" />
            {geo.status === "granted" ? t("locationPinned") : t("pinLocation")}
          </Button>
          {geo.status === "granted" && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {t("locationPinnedHint", { lat: geo.latitude.toFixed(4), lng: geo.longitude.toFixed(4) })}
            </p>
          )}
          {geo.status === "denied" && (
            <p className="mt-1.5 text-xs text-muted-foreground">{t("locationDeniedHint")}</p>
          )}
        </div>
      </fieldset>

      <Button type="submit" disabled={pending} size="lg" className="w-full">
        {t("submitForApproval")}
      </Button>
      <p className="text-center text-xs text-muted-foreground">{t("approvalHint")}</p>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
