import Image from "next/image";
import { reviewImageUrl } from "../lib/image-url";

export function ReviewImages({ images }: { images: string[] }) {
  if (images.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {images.map((path) => (
        <Image
          key={path}
          src={reviewImageUrl(path)}
          alt=""
          width={64}
          height={64}
          unoptimized
          className="h-16 w-16 rounded-xl border border-border object-cover"
        />
      ))}
    </div>
  );
}
