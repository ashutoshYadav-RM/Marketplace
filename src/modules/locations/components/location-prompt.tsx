"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useBrowserLocation } from "../hooks/use-browser-location";
import { setSearchLocation } from "../service/actions";

export function LocationPrompt() {
  const t = useTranslations("home");
  const router = useRouter();
  const { state, detect } = useBrowserLocation();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (state.status === "granted") {
      startTransition(async () => {
        await setSearchLocation(state.latitude, state.longitude);
        router.refresh();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (state.status === "granted") {
    return (
      <EmptyState
        icon={<MapPin className="h-6 w-6" />}
        title={pending ? t("locationLabel") : `${state.latitude.toFixed(3)}, ${state.longitude.toFixed(3)}`}
        body={t("nearbyShopsEmptyBody")}
      />
    );
  }

  return (
    <EmptyState
      icon={<MapPin className="h-6 w-6" />}
      title={t("setLocationPrompt")}
      body={state.status === "denied" ? undefined : t("setLocationBody")}
      action={
        <Button onClick={detect} disabled={state.status === "detecting"}>
          {state.status === "detecting" ? t("locationLabel") : t("useCurrentLocation")}
        </Button>
      }
    />
  );
}
