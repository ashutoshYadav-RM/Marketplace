"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { useBrowserLocation } from "../hooks/use-browser-location";
import { setSearchLocation } from "../service/actions";

export function LocationControl({
  compact = false,
  initial,
}: {
  compact?: boolean;
  initial?: { latitude: number; longitude: number } | null;
}) {
  const t = useTranslations("home");
  const router = useRouter();
  const { state, detect } = useBrowserLocation();
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (state.status === "granted") {
      startTransition(async () => {
        await setSearchLocation(state.latitude, state.longitude);
        router.refresh();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const resolved = state.status === "granted" ? state : initial ? { ...initial, status: "granted" as const } : null;

  const label =
    resolved?.status === "granted"
      ? `${resolved.latitude.toFixed(2)}, ${resolved.longitude.toFixed(2)}`
      : state.status === "detecting"
        ? t("locationLabel")
        : t("chooseLocation");

  return (
    <button
      type="button"
      onClick={detect}
      className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-brand"
    >
      <MapPin className="h-4 w-4 text-brand" aria-hidden="true" />
      <span className={compact ? "max-w-32 truncate" : ""}>{label}</span>
    </button>
  );
}
