"use client";

import { useCallback, useState } from "react";

export type BrowserLocationState =
  | { status: "idle" }
  | { status: "detecting" }
  | { status: "granted"; latitude: number; longitude: number }
  | { status: "denied" }
  | { status: "unsupported" };

/**
 * Wraps the browser Geolocation API. Radius search against PostGIS lands in
 * Phase 3 — for now this only captures a coordinate client-side so the home
 * shell's location control is real, not a dead button.
 */
export function useBrowserLocation() {
  const [state, setState] = useState<BrowserLocationState>({ status: "idle" });

  const detect = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState({ status: "unsupported" });
      return;
    }
    setState({ status: "detecting" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          status: "granted",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => setState({ status: "denied" }),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

  return { state, detect };
}
