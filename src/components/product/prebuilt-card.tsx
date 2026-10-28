import Link from "next/link";
import { ArrowLeft, Cpu, MonitorPlay } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "./product-image";
import { Price } from "./price";
import { availableQuantity } from "@/server/catalog";
import { buttonClasses } from "@/components/ui/button";
import { StockBadge } from "./stock-badge";

type Prebuilt = {
  id: string;
  slug: string;
  nameAr: string;
  price: number | { toString(): string };
  compareAtPrice: number | { toString(): string } | null;
  warrantyMonths: number;
  images: Array<{ url: string }>;
  inventory: { quantity: number; reserved: number; lowStockThreshold: number } | null;
  category: { slug: string; nameAr: string };
  brand: { name: string } | null;
  specs: Array<{ key: string; label: string; value: string }>;
};

export function PrebuiltCard({ product }: { product: Prebuilt }) {
  const available = availableQuantity(product.inventory);
  const highlights = product.specs.filter((spec) => ["cpu", "gpu", "ram", "storage"].includes(spec.key)).slice(0, 4);
  const ones = highlights.length > 0 ? highlights : product.specs.slice(0, 4);

  return (
    <article className="group surface surface-hover flex flex-col overflow-hidden">
      <Link href={`/product/${product.slug}`} className="relative block aspect-[16/10] overflow-hidden bg-ink-900">
        <ProductImage
          src={product.images[0]?.url}
          alt={product.nameAr}
          categorySlug="prebuilt-pc"
          sizes="(max-width: 768px) 100vw, 380px"
          className="transition duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute right-3 top-3 flex gap-1.5">
          <Badge tone="purple">تجميعة جاهزة</Badge>
          <StockBadge available={available} threshold={product.inventory?.lowStockThreshold ?? 3} />
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg leading-7">
          <Link href={`/product/${product.slug}`} className="transition hover:text-accent">
            {product.nameAr}
          </Link>
        </h3>
        <div className="mt-3 space-y-1.5">
          {ones.map((spec) => (
            <div key={spec.key} className="flex items-start gap-2 text-[11px] text-slate-400">
              {spec.key === "gpu" ? (
                <MonitorPlay className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent/70" />
              ) : (
                <Cpu className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent/70" />
              )}
              <span className="line-clamp-1">
                <span className="text-slate-500">{spec.label}: </span>
                {spec.value}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-auto pt-5">
          <Price value={product.price} compareAt={product.compareAtPrice} size="lg" />
          <div className="mt-3 flex gap-2">
            <Link href={`/product/${product.slug}`} className={buttonClasses("primary", "sm", "flex-1")}>
              التفاصيل
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
            <span className="inline-flex items-center rounded-lg border border-line px-2 text-[10px] text-slate-400">
              ضمان {product.warrantyMonths} شهر
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
