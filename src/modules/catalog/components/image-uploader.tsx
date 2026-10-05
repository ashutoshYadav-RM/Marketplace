"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImagePlus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadProductImage } from "../service/actions";
import { productImageUrl } from "../lib/image-url";

export function ImageUploader({
  organizationId,
  productId,
  images,
}: {
  organizationId: string;
  productId: string;
  images: string[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-3">
        {images.length === 0 && (
          <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground">
            <Package className="h-6 w-6" />
          </div>
        )}
        {images.map((path) => (
          <Image
            key={path}
            src={productImageUrl(path)}
            alt=""
            width={80}
            height={80}
            unoptimized
            className="h-20 w-20 rounded-xl border border-border object-cover"
          />
        ))}
      </div>
      {error && <p className="mb-2 text-sm text-danger">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setError(null);
          const formData = new FormData();
          formData.set("file", file);
          startTransition(async () => {
            const result = await uploadProductImage(organizationId, productId, formData);
            if (!result.ok) return setError(result.error);
            router.refresh();
          });
          e.target.value = "";
        }}
      />
      <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={() => inputRef.current?.click()}>
        <ImagePlus className="h-4 w-4" />
        {pending ? "Uploading…" : "Upload photo"}
      </Button>
    </div>
  );
}
