import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
  data: Record<string, unknown> | null;
};

export async function listRecentNotifications(userId: string, limit = 10): Promise<NotificationRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, is_read, created_at, data")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("listRecentNotifications failed:", error.message);
    return [];
  }
  return (data ?? []).map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    isRead: n.is_read,
    createdAt: n.created_at,
    data: n.data,
  }));
}
