"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { CameraOff } from "lucide-react";

/**
 * Reads product barcodes (UPC/EAN/Code128/…) from the device camera via
 * ZXing — a different job from the QR-only scanner in
 * modules/orders/components/qr-camera-scanner.tsx, which exists for pickup
 * verification. ZXing owns the getUserMedia + video-element + decode-loop
 * plumbing itself (decodeFromConstraints), so this component is mostly
 * wiring, not the manual canvas sampling the QR scanner needs.
 *
 * Lives in `catalog` because both its callers are catalog concerns —
 * looking a barcode up against a shop's own products (POS) or against the
 * shared global catalog (add-product) — not because it's owned by orders.
 */
export function BarcodeCameraScanner({ active, onScan }: { active: boolean; onScan: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  const lastValueRef = useRef<string | null>(null);
  const lastTimeRef = useRef(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!active || !videoRef.current) return;
    const reader = new BrowserMultiFormatReader();
    let controls: IScannerControls | undefined;
    let cancelled = false;

    reader
      .decodeFromConstraints({ video: { facingMode: "environment" } }, videoRef.current, (result) => {
        if (cancelled || !result) return;
        const text = result.getText();
        const now = Date.now();
        // The same code sits in frame for many callback ticks — only fire
        // once per ~2s unless the value actually changes.
        if (text !== lastValueRef.current || now - lastTimeRef.current > 2000) {
          lastValueRef.current = text;
          lastTimeRef.current = now;
          onScanRef.current(text);
        }
      })
      .then((c) => {
        if (cancelled) c.stop();
        else controls = c;
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't access the camera — check permissions, or enter the barcode manually below.");
      });

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [active]);

  if (error) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-2xl bg-background p-6 text-center">
        <CameraOff className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
      <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-x-10 inset-y-14 rounded-xl border-2 border-white/70" />
    </div>
  );
}
