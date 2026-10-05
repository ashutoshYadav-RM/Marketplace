import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { BookingStatus } from "../domain/schema";

export type BookingSummary = {
  id: string;
  bookingNumber: string;
  status: BookingStatus;
  serviceName: string;
  visitChargeMinor: number | null;
  currencyCode: string | null;
  requestedTime: string | null;
  scheduledTime: string | null;
  createdAt: string;
  organizationName: string;
  organizationSlug: string;
  locationName: string;
  locationSlug: string;
};

export type BookingDetail = BookingSummary & {
  description: string | null;
  cancelReason: string | null;
};

export type MerchantBookingSummary = BookingSummary & { customerName: string | null };

const BOOKING_SELECT = `
  id, booking_number, status, requested_time, scheduled_time, description, cancel_reason,
  visit_charge_minor, currency_code, created_at, customer_id,
  service:services(name),
  organization:organizations(name, slug),
  location:locations(name, slug)
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBookingRow(row: any): BookingDetail & { customerId: string } {
  const service = Array.isArray(row.service) ? row.service[0] : row.service;
  const org = Array.isArray(row.organization) ? row.organization[0] : row.organization;
  const location = Array.isArray(row.location) ? row.location[0] : row.location;
  return {
    id: row.id,
    bookingNumber: row.booking_number,
    status: row.status,
    serviceName: service?.name ?? "Service",
    visitChargeMinor: row.visit_charge_minor,
    currencyCode: row.currency_code,
    requestedTime: row.requested_time,
    scheduledTime: row.scheduled_time,
    createdAt: row.created_at,
    description: row.description,
    cancelReason: row.cancel_reason,
    organizationName: org?.name ?? "",
    organizationSlug: org?.slug ?? "",
    locationName: location?.name ?? "",
    locationSlug: location?.slug ?? "",
    customerId: row.customer_id,
  };
}

export async function listCustomerBookings(): Promise<BookingSummary[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("service_bookings")
    .select(BOOKING_SELECT)
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listCustomerBookings failed:", error.message);
    return [];
  }
  return (data ?? []).map(mapBookingRow);
}

export async function getBookingDetail(bookingId: string): Promise<BookingDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("service_bookings").select(BOOKING_SELECT).eq("id", bookingId).maybeSingle();
  if (error || !data) return null;
  return mapBookingRow(data);
}

export async function listOrgBookings(organizationId: string, statuses?: BookingStatus[]): Promise<MerchantBookingSummary[]> {
  const supabase = await createSupabaseServerClient();
  let queryBuilder = supabase
    .from("service_bookings")
    .select(BOOKING_SELECT)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (statuses && statuses.length > 0) queryBuilder = queryBuilder.in("status", statuses);

  const { data, error } = await queryBuilder;
  if (error) {
    console.error("listOrgBookings failed:", error.message);
    return [];
  }

  const bookings = (data ?? []).map(mapBookingRow);
  if (bookings.length === 0) return [];

  const customerIds = Array.from(new Set(bookings.map((b) => b.customerId).filter(Boolean)));
  const { data: profiles } =
    customerIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", customerIds)
      : { data: [] as { id: string; full_name: string | null }[] };
  const nameByCustomer = new Map((profiles ?? []).map((p) => [p.id, p.full_name as string | null]));

  return bookings.map((b) => ({ ...b, customerName: nameByCustomer.get(b.customerId) ?? null }));
}
