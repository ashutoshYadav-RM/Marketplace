"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { markAllNotificationsRead } from "../service/actions";
import type { NotificationRow } from "../data/notifications";

export function NotificationBell({ userId, initial }: { userId: string; initial: NotificationRow[] }) {
  const [notifications, setNotifications] = useState(initial);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as {
            id: string;
            type: string;
            title: string;
            body: string | null;
            is_read: boolean;
            created_at: string;
          };
          setNotifications((prev) => [
            { id: row.id, type: row.type, title: row.title, body: row.body, isRead: row.is_read, createdAt: row.created_at, data: null },
            ...prev,
          ].slice(0, 10));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && unreadCount > 0) {
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            markAllNotificationsRead();
          }
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-raised"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-ready px-1 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-border bg-surface-raised shadow-lg">
          <div className="max-h-96 overflow-y-auto p-2">
            {notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nothing yet</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="rounded-xl px-3 py-2.5 hover:bg-background">
                  <p className="text-sm font-medium text-foreground">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
