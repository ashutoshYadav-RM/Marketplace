"use client";

import { useCallback, useState, useTransition } from "react";
import { Camera, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCameraScanner } from "./qr-camera-scanner";
import { verifyPickupByCode, verifyPickupByToken } from "../service/actions";
import { pickupReasonMessage } from "../domain/pickup-messages";
import type { OrgLocation } from "@/modules/locations/data/locations";

type Result = { ok: true; orderId: string } | { ok: false; message: string };

export function PickupScanner({ locations }: { locations: OrgLocation[] }) {
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [cameraOn, setCameraOn] = useState(false);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  const handleScan = useCallback(
    (value: string) => {
      if (pending) return;
      setCameraOn(false);
      startTransition(async () => {
        // A QR encodes the raw qr_token (a UUID); anything else typed or
        // scanned is treated as the short pickup code instead.
        const isToken = /^[0-9a-f-]{32,36}$/i.test(value.trim());
        const outcome = isToken
          ? await verifyPickupByToken(value.trim(), locationId)
          : await verifyPickupByCode(value.trim(), locationId);
        setResult(outcome.ok ? { ok: true, orderId: outcome.orderId } : { ok: false, message: pickupReasonMessage(outcome.reason) });
      });
    },
    [locationId, pending],
  );

  return (
    <div className="flex flex-col gap-5">
      {locations.length > 1 && (
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground"
        >
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      )}

      {result && (
        <div
          className={`flex items-center gap-3 rounded-2xl p-4 ${result.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}
        >
          {result.ok ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
          <p className="text-sm font-medium">{result.ok ? "Picked up — order completed." : result.message}</p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={() => {
              setResult(null);
              setCode("");
            }}
          >
            Scan next
          </Button>
        </div>
      )}

      {!result && (
        <>
          {cameraOn ? (
            <QrCameraScanner active={cameraOn} onScan={handleScan} />
          ) : (
            <Button type="button" variant="secondary" onClick={() => setCameraOn(true)} className="w-full">
              <Camera className="h-4 w-4" />
              Scan QR code
            </Button>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or enter the pickup code
            <div className="h-px flex-1 bg-border" />
          </div>

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim()) handleScan(code.trim());
            }}
          >
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="6-character code"
              maxLength={6}
              className="text-center font-mono text-lg tracking-widest uppercase"
            />
            <Button type="submit" disabled={pending || code.trim().length === 0}>
              Verify
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
