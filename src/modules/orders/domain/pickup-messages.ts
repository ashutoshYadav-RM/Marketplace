const PICKUP_REASON_MESSAGES: Record<string, string> = {
  not_found: "We couldn't find an order with that code.",
  wrong_shop: "That order belongs to a different shop.",
  not_authorized: "You're not staff at that shop.",
  already_picked_up: "This order was already picked up.",
  not_ready: "This order isn't ready for pickup yet.",
};

export function pickupReasonMessage(reason: string): string {
  return PICKUP_REASON_MESSAGES[reason] ?? "Couldn't verify this order.";
}
