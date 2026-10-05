import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Semantic status color, kept separate from the brand accent (§08 — "when
 * it's a UI, not a document"). `ready` maps to the order-ready signal used
 * throughout the merchant/customer order flow.
 */
const TONE_CLASSES = {
  neutral: "bg-surface text-muted-foreground border-border",
  brand: "bg-brand-soft text-brand border-transparent",
  ready: "bg-accent-ready-soft text-accent-ready border-transparent",
  success: "bg-success-soft text-success border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
} as const;

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: keyof typeof TONE_CLASSES;
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    />
  );
}
