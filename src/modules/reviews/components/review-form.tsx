"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImagePlus, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { submitReview, uploadReviewImage } from "../service/actions";
import { reviewImageUrl } from "../lib/image-url";

const MAX_IMAGES = 4;

export function ReviewForm({
  orderId,
  organizationId,
  locationId,
}: {
  orderId: string;
  organizationId: string;
  locationId?: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-4">
      <p className="mb-2 text-sm font-medium text-foreground">How was it?</p>
      <div className="mb-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
          >
            <Star
              className={cn(
                "h-7 w-7 transition-colors",
                n <= (hovered || rating) ? "fill-accent-ready text-accent-ready" : "text-border",
              )}
            />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Anything else? (optional)"
        rows={2}
        className="mb-3 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      />

      <div className="mb-3 flex flex-wrap gap-2">
        {images.map((path) => (
          <div key={path} className="relative">
            <Image src={reviewImageUrl(path)} alt="" width={64} height={64} unoptimized className="h-16 w-16 rounded-xl border border-border object-cover" />
            <button
              type="button"
              onClick={() => setImages((prev) => prev.filter((p) => p !== path))}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white"
              aria-label="Remove photo"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {images.length < MAX_IMAGES && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-muted-foreground hover:border-brand hover:text-brand disabled:opacity-50"
          >
            <ImagePlus className="h-5 w-5" />
            <span className="text-[10px]">{uploading ? "…" : "Add"}</span>
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setError(null);
          setUploading(true);
          const formData = new FormData();
          formData.set("file", file);
          uploadReviewImage(formData).then((result) => {
            setUploading(false);
            if (!result.ok) return setError(result.error);
            if (result.path) setImages((prev) => [...prev, result.path!]);
          });
          e.target.value = "";
        }}
      />

      {error && <p className="mb-2 text-sm text-danger">{error}</p>}
      <Button
        type="button"
        size="sm"
        disabled={rating === 0 || pending || uploading}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await submitReview({ orderId, organizationId, locationId, rating, comment, images });
            if (!result.ok) return setError(result.error);
            router.refresh();
          });
        }}
      >
        {pending ? "Submitting…" : "Submit review"}
      </Button>
    </div>
  );
}
