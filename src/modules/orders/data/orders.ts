import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getVariantAtLocation } from "@/modules/catalog/data/products";
import type { OrderStatus } from "../domain/schema";

export type OrderItemRow = {
  id: string;
  nameSnapshot: string;
  quantity: number;
  unit: string;
  unitPriceMinor: number;
  totalMinor: number;
};

export type OrderSummary = {
  id: string;
  orderNumber: string;
  orderType: "pickup" | "delivery" | "reservation" | "service" | "pos";
  status: OrderStatus;
  totalMinor: number;
  currencyCode: string;
  createdAt: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  locationId: string;
  locationName: string;
  locationSlug: string;
};

export type OrderDetail = OrderSummary & {
  pickupCode: string | null;
  qrToken: string;
  subtotalMinor: number;
  taxMinor: number;
  discountMinor: number;
  serviceFeeMinor: number;
  offerCode: string | null;
  notes: string | null;
  locationTimezone: string;
  items: OrderItemRow[];
};

export type MerchantOrderSummary = OrderSummary & {
  customerName: string | null;
  items: OrderItemRow[];
};

const ORDER_SELECT = `
  id, order_number, order_type, status, total_minor, subtotal_minor, tax_minor, discount_minor,
  service_fee_minor, offer_code, currency_code, created_at, pickup_code, qr_token, notes, customer_id,
  organization_id, location_id,
  organization:organizations(name, slug),
  location:locations(name, slug, timezone)
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOrderRow(row: any): OrderDetail & { customerId: string | null } {
  const org = Array.isArray(row.organization) ? row.organization[0] : row.organization;
  const location = Array.isArray(row.location) ? row.location[0] : row.location;
  return {
    id: row.id,
    orderNumber: row.order_number,
    orderType: row.order_type,
    status: row.status,
    totalMinor: row.total_minor,
    subtotalMinor: row.subtotal_minor,
    taxMinor: row.tax_minor,
    discountMinor: row.discount_minor,
    serviceFeeMinor: row.service_fee_minor,
    offerCode: row.offer_code,
    currencyCode: row.currency_code,
    createdAt: row.created_at,
    pickupCode: row.pickup_code,
    qrToken: row.qr_token,
    notes: row.notes,
    organizationId: row.organization_id,
    organizationName: org?.name ?? "",
    organizationSlug: org?.slug ?? "",
    locationId: row.location_id,
    locationName: location?.name ?? "",
    locationSlug: location?.slug ?? "",
    locationTimezone: location?.timezone ?? "UTC",
    items: [],
    customerId: row.customer_id,
  };
}

export async function listCustomerOrders(): Promise<OrderSummary[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listCustomerOrders failed:", error.message);
    return [];
  }
  return (data ?? []).map(mapOrderRow);
}

export async function getOrderDetail(orderId: string): Promise<OrderDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data: order, error } = await supabase.from("orders").select(ORDER_SELECT).eq("id", orderId).maybeSingle();
  if (error || !order) return null;

  const { data: items } = await supabase
    .from("order_items")
    .select("id, name_snapshot, quantity, unit, unit_price_minor, total_minor")
    .eq("order_id", orderId);

  const mapped = mapOrderRow(order);
  mapped.items = (items ?? []).map((i) => ({
    id: i.id,
    nameSnapshot: i.name_snapshot,
    quantity: i.quantity,
    unit: i.unit,
    unitPriceMinor: i.unit_price_minor,
    totalMinor: i.total_minor,
  }));
  return mapped;
}

/** Admin order monitoring — every organization (RLS: orders_admin_read, 0010). */
export async function listAllOrdersForAdmin(limit = 50): Promise<OrderSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("listAllOrdersForAdmin failed:", error.message);
    return [];
  }
  return (data ?? []).map(mapOrderRow);
}

export async function listOrgOrders(organizationId: string, statuses?: OrderStatus[]): Promise<MerchantOrderSummary[]> {
  const supabase = await createSupabaseServerClient();
  let queryBuilder = supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (statuses && statuses.length > 0) queryBuilder = queryBuilder.in("status", statuses);

  const { data, error } = await queryBuilder;
  if (error) {
    console.error("listOrgOrders failed:", error.message);
    return [];
  }

  const orders = (data ?? []).map(mapOrderRow);
  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const customerIds = Array.from(new Set(orders.map((o) => o.customerId).filter((id): id is string => Boolean(id))));

  const [{ data: items }, { data: profiles }] = await Promise.all([
    supabase
      .from("order_items")
      .select("id, order_id, name_snapshot, quantity, unit, unit_price_minor, total_minor")
      .in("order_id", orderIds),
    customerIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", customerIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
  ]);

  const itemsByOrder = new Map<string, OrderItemRow[]>();
  for (const item of items ?? []) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push({
      id: item.id,
      nameSnapshot: item.name_snapshot,
      quantity: item.quantity,
      unit: item.unit,
      unitPriceMinor: item.unit_price_minor,
      totalMinor: item.total_minor,
    });
    itemsByOrder.set(item.order_id, list);
  }
  const nameByCustomer = new Map((profiles ?? []).map((p) => [p.id, p.full_name as string | null]));

  return orders.map((o) => ({
    ...o,
    customerName: o.customerId ? (nameByCustomer.get(o.customerId) ?? null) : "Walk-in",
    items: itemsByOrder.get(o.id) ?? [],
  }));
}

export type ReorderCandidate = {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  unit: string;
  amountMinor: number;
  currencyCode: string;
  stockQty: number;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  locationId: string;
  locationName: string;
  locationSlug: string;
};

/**
 * The pull version of "reorder reminders" (blueprint §"Reminders" — 🥛 Need
 * milk again?): derived from the customer's own completed order history at
 * read time, so it needs no scheduled job. A proactive, push-notified
 * version of the same idea would read/write the `reminders` table via a
 * cron Edge Function — real future work, not something V1's home page
 * needs in order to answer "what did I buy before?".
 */
export async function listReorderCandidates(limit = 4): Promise<ReorderCandidate[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: orders } = await supabase
    .from("orders")
    .select("id, organization_id, location_id, organization:organizations(name, slug), location:locations(name, slug)")
    .eq("customer_id", user.id)
    .eq("status", "completed")
    .eq("order_type", "pickup")
    .order("created_at", { ascending: false })
    .limit(20);
  if (!orders || orders.length === 0) return [];

  const { data: items } = await supabase
    .from("order_items")
    .select("order_id, variant_id")
    .in(
      "order_id",
      orders.map((o) => o.id),
    );
  if (!items || items.length === 0) return [];

  const orderById = new Map(orders.map((o) => [o.id, o]));
  const seenVariants = new Set<string>();
  const candidates: ReorderCandidate[] = [];

  for (const item of items) {
    if (!item.variant_id || seenVariants.has(item.variant_id)) continue;
    const order = orderById.get(item.order_id);
    if (!order) continue;
    seenVariants.add(item.variant_id);

    const current = await getVariantAtLocation(item.variant_id, order.location_id);
    if (!current) continue;

    const org = Array.isArray(order.organization) ? order.organization[0] : order.organization;
    const location = Array.isArray(order.location) ? order.location[0] : order.location;

    candidates.push({
      variantId: current.variantId,
      productId: current.productId,
      productName: current.productName,
      variantName: current.variantName,
      unit: current.unit,
      amountMinor: current.amountMinor,
      currencyCode: current.currencyCode,
      stockQty: current.stockQty,
      organizationId: order.organization_id,
      organizationName: org?.name ?? "",
      organizationSlug: org?.slug ?? "",
      locationId: order.location_id,
      locationName: location?.name ?? "",
      locationSlug: location?.slug ?? "",
    });

    if (candidates.length >= limit) break;
  }

  return candidates;
}
