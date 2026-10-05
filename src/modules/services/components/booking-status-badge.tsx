import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { BookingStatus } from "../domain/schema";

const LABELS: Record<BookingStatus, string> = {
  requested: "Requested",
  accepted: "Accepted",
  scheduled: "Scheduled",
  arrived: "Provider arrived",
  work_started: "Work in progress",
  completed: "Completed",
  paid: "Paid",
  rejected: "Declined",
  cancelled: "Cancelled",
  no_show: "No-show",
};

const TONES: Record<BookingStatus, NonNullable<BadgeProps["tone"]>> = {
  requested: "brand",
  accepted: "brand",
  scheduled: "ready",
  arrived: "ready",
  work_started: "ready",
  completed: "success",
  paid: "success",
  rejected: "danger",
  cancelled: "danger",
  no_show: "danger",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Badge tone={TONES[status]}>{LABELS[status]}</Badge>;
}
