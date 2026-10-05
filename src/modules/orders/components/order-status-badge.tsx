import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { OrderStatus } from "../domain/schema";

const LABELS: Record<OrderStatus, string> = {
  placed: "Placed",
  accepted: "Accepted",
  packing: "Packing",
  ready_for_pickup: "Ready for pickup",
  picked_up: "Picked up",
  completed: "Completed",
  cancelled: "Cancelled",
};

const TONES: Record<OrderStatus, NonNullable<BadgeProps["tone"]>> = {
  placed: "brand",
  accepted: "brand",
  packing: "brand",
  ready_for_pickup: "ready",
  picked_up: "success",
  completed: "success",
  cancelled: "danger",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={TONES[status]}>{LABELS[status]}</Badge>;
}
