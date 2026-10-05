import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const dimension = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(dimension, n <= Math.round(value) ? "fill-accent-ready text-accent-ready" : "text-border")}
        />
      ))}
    </div>
  );
}
