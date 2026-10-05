"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Radio } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** Same pattern as LiveOrderStatus, for service_bookings (see 0008_services.sql). */
export function LiveBookingStatus({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`booking-${bookingId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "service_bookings", filter: `id=eq.${bookingId}` },
        () => router.refresh(),
      )
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  return (
    <span className={`flex items-center gap-1 text-xs ${connected ? "text-success" : "text-muted-foreground"}`}>
      <Radio className="h-3 w-3" />
      {connected ? "Live" : "Connecting…"}
    </span>
  );
}
