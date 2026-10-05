"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { setLocationHoursSchema, type SetLocationHoursInput } from "../domain/hours-schema";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Search location is a cookie, not a database column — discovery has to
 * work for a signed-out visitor too (§ "Customer" capabilities don't
 * require an account to browse). Persisting a signed-in customer's usual
 * location to `profiles.home_point` is a reorder/personalization feature
 * for a later phase, not a prerequisite for search to work.
 */
const SEARCH_LOCATION_COOKIE = "search_loc";

export async function setSearchLocation(latitude: number, longitude: number) {
  const cookieStore = await cookies();
  cookieStore.set(SEARCH_LOCATION_COOKIE, `${latitude},${longitude}`, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSearchLocation() {
  const cookieStore = await cookies();
  cookieStore.delete(SEARCH_LOCATION_COOKIE);
}

/** Replaces all 7 days at once — RLS (`location_hours_manager_write`, 0001)
 * is what actually restricts this to that location's org managers+. */
export async function setLocationHours(input: SetLocationHoursInput): Promise<ActionResult> {
  const parsed = setLocationHoursSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { error: deleteError } = await supabase.from("location_hours").delete().eq("location_id", v.locationId);
  if (deleteError) return { ok: false, error: deleteError.message };

  const { error: insertError } = await supabase.from("location_hours").insert(
    v.days.map((d) => ({
      location_id: v.locationId,
      day_of_week: d.dayOfWeek,
      is_closed: d.isClosed,
      open_time: d.isClosed ? null : d.openTime || null,
      close_time: d.isClosed ? null : d.closeTime || null,
    })),
  );
  if (insertError) return { ok: false, error: insertError.message };

  revalidatePath("/merchant/hours");
  return { ok: true };
}
