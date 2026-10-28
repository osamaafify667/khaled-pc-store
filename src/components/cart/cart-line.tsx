"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Check, Loader2, RefreshCw, Trash2 } from "lucide-react";
import {
  removeCartItemAction,
  updateCartItemAction,
  type CartActionState,
} from "@/actions/cart";
import { QuantitySelector } from "@/components/product/quantity-selector";
import { ProductImage } from "@/components/product/product-image";
import { Price } from "@/components/product/price";
import { Badge } from "@/components/ui/badge";
import { formatPrice, cn } from "@/lib/utils";

export function CartLine({
  item,
}: {
  item: {
    itemId: string;
    productId: string;
    name: string;
    slug: string;
    sku: string;
    image: string | null;
    categorySlug: string;
    unitPrice: number;
    quantity: number;
    available: number;
    maxQuantity: number;
  };
}) {
  const [updateState, updateAction, updating] = useActionState<CartActionState, FormData>(updateCartItemAction, {});
  const [removeState, removeAction, removing] = useActionState<CartActionState, FormData>(removeCartItemAction, {});
  const lineTotal = item.unitPrice * item.quantity;
  const unavailable = item.available < 1;
  const insufficient = !unavailable && item.quantity > item.available;

  return (
    <div className={cn("surface p-3 sm:p-4", unavailable && "border-rose-500/30")}>
      <div className="flex gap-3 sm:gap-4">
        <Link
          href={`/product/${item.slug}`}
          className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-line bg-ink-900 sm:h-28 sm:w-28"
        >
          <ProductImage src={item.image} alt={item.name} categorySlug={item.categorySlug} sizes="112px" />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link href={`/product/${item.slug}`} className="line-clamp-2 text-sm font-bold text-white transition hover:text-accent">
                {item.name}
              </Link>
              <p className="mt-1 text-[10px] text-slate-500" dir="ltr">
                {item.sku}
              </p>
            </div>
            {unavailable ? <Badge tone="danger">غير متوفر</Badge> : insufficient ? <Badge tone="warning">الكمية غير كافية</Badge> : null}
          </div>

          <div className="mt-2">
            <Price value={item.unitPrice} size="sm" />
          </div>

          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <form action={updateAction} className="flex items-center gap-2">
              <input type="hidden" name="itemId" value={item.itemId} />
              <QuantitySelector
                defaultValue={item.quantity}
                max={Math.max(Math.min(item.available, item.maxQuantity), 1)}
                size="sm"
              />
              <button
                type="submit"
                disabled={updating || unavailable}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[11px] font-semibold text-slate-300 transition hover:border-accent/40 hover:text-accent disabled:opacity-40"
              >
                {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                تحديث
              </button>
            </form>

            <div className="text-left">
              <p className="text-[10px] text-slate-500">إجمالي السطر</p>
              <p className="text-sm font-extrabold text-white">{formatPrice(lineTotal)}</p>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <form action={removeAction}>
              <input type="hidden" name="itemId" value={item.itemId} />
              <button
                type="submit"
                disabled={removing}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 transition hover:text-rose-300"
              >
                {removing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                إزالة
              </button>
            </form>
            {updateState.ok ? (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                <Check className="h-3 w-3" /> تم التحديث
              </span>
            ) : null}
          </div>

          {updateState.message && !updateState.ok ? (
            <p className="mt-1 text-[11px] text-rose-300">{updateState.message}</p>
          ) : null}
          {removeState.message && !removeState.ok ? (
            <p className="mt-1 text-[11px] text-rose-300">{removeState.message}</p>
          ) : null}
          {insufficient ? (
            <p className="mt-1 text-[11px] text-amber-300">المتاح حاليًا {item.available} فقط. عدّل الكمية قبل إتمام الطلب.</p>
          ) : null}
        </div>
      </div>

      {unavailable ? (
        <p className="mt-3 rounded-lg bg-rose-500/5 px-3 py-2 text-[11px] text-rose-200">
          هذا المنتج لم يعد متوفرًا. أزله من السلة أو تصفح بديلًا من نفس التصنيف.
        </p>
      ) : null}
    </div>
  );
}
