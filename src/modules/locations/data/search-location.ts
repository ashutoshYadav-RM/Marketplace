import "server-only";
import { cookies } from "next/headers";

export type SearchLocation = { latitude: number; longitude: number };

const SEARCH_LOCATION_COOKIE = "search_loc";

export async function getSearchLocation(): Promise<SearchLocation | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SEARCH_LOCATION_COOKIE)?.value;
  if (!raw) return null;

  const [lat, lng] = raw.split(",").map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { latitude: lat, longitude: lng };
}
