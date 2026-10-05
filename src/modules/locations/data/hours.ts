import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DayHours } from "@/lib/opening-hours";

/** Always returns exactly 7 entries (Sun..Sat), synthesizing "no hours set
 * yet" days as closed so the editor and the shop page never have to special-case gaps. */
export async function getLocationHours(locationId: string): Promise<DayHours[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("location_hours")
    .select("day_of_week, is_closed, open_time, close_time")
    .eq("location_id", locationId);

  const byDay = new Map<number, DayHours>();
  if (!error) {
    for (const row of data ?? []) {
      byDay.set(row.day_of_week, {
        dayOfWeek: row.day_of_week,
        isClosed: row.is_closed,
        openTime: row.open_time,
        closeTime: row.close_time,
      });
    }
  }

  return Array.from({ length: 7 }, (_, dayOfWeek) => byDay.get(dayOfWeek) ?? { dayOfWeek, isClosed: true, openTime: null, closeTime: null });
}
