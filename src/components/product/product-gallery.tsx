"use client";

import { useState } from "react";
import { ProductImage } from "./product-image";
import { cn } from "@/lib/utils";

export function ProductGallery({
  images,
  name,
  categorySlug,
  badge,
}: {
  images: Array<{ id: string; url: string; alt: string | null }>;
  name: string;
  categorySlug: string;
  badge?: React.ReactNode;
}) {
  const [active, setActive] = useState(0);
  const list = images.length > 0 ? images : [{ id: "placeholder", url: "", alt: name }];
  const current = list[Math.min(active, list.length - 1)];

  return (
    <div>
      <div className="surface relative aspect-square overflow-hidden bg-ink-900">
        <ProductImage
          src={current.url}
          alt={current.alt || name}
          categorySlug={categorySlug}
          sizes="(max-width: 1024px) 100vw, 520px"
          priority
        />
        {badge ? <div className="absolute right-4 top-4 flex flex-wrap gap-2">{badge}</div> : null}
      </div>

      {list.length > 1 ? (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
          {list.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`عرض صورة ${index + 1}`}
              aria-pressed={index === active}
              className={cn(
                "relative aspect-square overflow-hidden rounded-xl border bg-ink-900 transition",
                index === active ? "border-accent/70 ring-2 ring-accent/20" : "border-line hover:border-accent/30",
              )}
            >
              <ProductImage
                src={image.url}
                alt={image.alt || `${name} — صورة ${index + 1}`}
                categorySlug={categorySlug}
                sizes="120px"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
