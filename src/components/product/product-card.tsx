import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { availableQuantity, type ProductListItem } from "@/server/catalog";
import { ProductImage } from "./product-image";
import { Price } from "./price";
import { StockBadge } from "./stock-badge";
import { AddToCartForm } from "./add-to-cart-form";
import { cn, discountPercent } from "@/lib/utils";

export function ProductCard({
  product,
  className,
  priority = false,
}: {
  product: ProductListItem;
  className?: string;
  priority?: boolean;
}) {
  const available = availableQuantity(product.inventory);
  const percent = discountPercent(Number(product.price), product.compareAtPrice ? Number(product.compareAtPrice) : null);
  const image = product.images[0]?.url ?? null;

  return (
    <article
      className={cn(
        "group surface surface-hover flex h-full flex-col overflow-hidden",
        className,
      )}
    >
      <Link href={`/product/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-ink-900">
        <ProductImage
          src={image}
          alt={product.nameAr}
          categorySlug={product.category.slug}
          priority={priority}
          className="transition duration-500 group-hover:scale-[1.04]"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
        />
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <div className="flex flex-col items-start gap-1.5">
            {percent ? <Badge tone="danger">خصم {percent}%</Badge> : null}
            {product.isFeatured ? <Badge tone="accent">مميز</Badge> : null}
          </div>
          <StockBadge available={available} threshold={product.inventory?.lowStockThreshold ?? 3} />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/70 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-accent/80">
            {product.brand?.name ?? product.category.nameAr}
          </span>
          {product.model ? <span className="truncate text-[10px] text-slate-500">{product.model}</span> : null}
        </div>
        <Link href={`/product/${product.slug}`} className="line-clamp-2 min-h-[2.9rem] text-sm font-bold leading-6 text-slate-100 transition hover:text-accent">
          {product.nameAr}
        </Link>

        <div className="mt-auto pt-3">
          <Price value={product.price} compareAt={product.compareAtPrice} />
          <div className="mt-3 flex items-center gap-2">
            <AddToCartForm
              productId={product.id}
              available={available}
              showQuantity={false}
              size="sm"
              compact
              className="flex-1"
              buttonLabel="أضف للسلة"
            />
            <Link
              href={`/product/${product.slug}`}
              aria-label={`تفاصيل ${product.nameAr}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line text-slate-400 transition hover:border-accent/40 hover:text-accent"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, className }: { products: ProductListItem[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4", className)}>
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < 4} />
      ))}
    </div>
  );
}
