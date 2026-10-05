"use client";

import { QRCodeSVG } from "qrcode.react";

// A QR code needs a light, high-contrast quiet zone to scan reliably
// regardless of the app's theme — the white card here is deliberate, not a
// dark-mode oversight.
export function OrderQrCode({ token }: { token: string }) {
  return (
    <div className="flex justify-center rounded-xl bg-white p-4">
      <QRCodeSVG value={token} size={176} />
    </div>
  );
}
