"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { CameraOff } from "lucide-react";

/**
 * Reads QR codes from the device camera via getUserMedia + a canvas frame
 * loop decoded with jsQR — no server round-trip, no external scanning
 * service. `onScan` fires once per newly-seen code (de-duped by value)
 * while `active` is true; the parent decides whether to keep scanning
 * after a hit (e.g. pause during a verify call, resume for the next order).
 */
export function QrCameraScanner({ active, onScan }: { active: boolean; onScan: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onScanRef = useRef(onScan);
  const lastValueRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let frameHandle: number;
    let stream: MediaStream | null = null;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        frameHandle = requestAnimationFrame(tick);
      } catch {
        if (!cancelled) setError("Couldn't access the camera — check permissions, or enter the code manually below.");
      }
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(frame.data, frame.width, frame.height);
          if (code?.data && code.data !== lastValueRef.current) {
            lastValueRef.current = code.data;
            onScanRef.current(code.data);
          }
        }
      }
      frameHandle = requestAnimationFrame(tick);
    }

    start();
    return () => {
      cancelled = true;
      if (frameHandle) cancelAnimationFrame(frameHandle);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [active]);

  if (error) {
    return (
      <div className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl bg-background p-6 text-center">
        <CameraOff className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative aspect-square overflow-hidden rounded-2xl bg-black">
      <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />
      <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/70" />
    </div>
  );
}
