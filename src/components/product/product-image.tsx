import Image from "next/image";
import { cn } from "@/lib/utils";

function placeholderIndex(seed: string | null | undefined): number {
  if (!seed) return 1;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return (hash % 4) + 1;
}

export function ProductImage({
  src,
  alt,
  categorySlug,
  className,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 300px",
  priority = false,
  fill = true,
}: {
  src?: string | null;
  alt: string;
  categorySlug?: string | null;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fill?: boolean;
}) {
  const fallback = `/images/placeholder-${placeholderIndex(categorySlug ?? alt)}.png`;
  const resolved = src && src.trim() !== "" ? src : fallback;
  const external = /^https?:\/\//i.test(resolved);

  return (
    <Image
      src={resolved}
      alt={alt}
      fill={fill}
      width={fill ? undefined : 600}
      height={fill ? undefined : 450}
      sizes={sizes}
      priority={priority}
      unoptimized={external}
      className={cn("object-cover", className)}
    />
  );
}
