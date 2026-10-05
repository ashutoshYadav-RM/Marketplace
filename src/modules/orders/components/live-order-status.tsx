"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Radio } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Subscribes to Postgres Changes on this one order row (RLS-authorized —
 * see 0006_realtime.sql) and refreshes the Server Component tree whenever
 * the merchant advances its status. No polling, no client-side status
 * duplication: the server route stays the single source of truth for what
 * "ready for pickup" looks like, this just tells it to re-render.
 */
export function LiveOrderStatus({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        () => router.refresh(),
      )
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  return (
    <span className={`flex items-center gap-1 text-xs ${connected ? "text-success" : "text-muted-foreground"}`}>
      <Radio className="h-3 w-3" />
      {connected ? "Live" : "Connecting…"}
    </span>
  );
}
