import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShoppingCart, Trash2 } from "lucide-react";
import { getCart } from "@/server/cart";
import { validateCoupon } from "@/server/pricing";
import { availableQuantity } from "@/server/catalog";
import { MAX_CART_QUANTITY_PER_ITEM } from "@/lib/constants";
import { CartLine } from "@/components/cart/cart-line";
import { CouponForm } from "@/components/cart/coupon-form";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "سلة الشراء",
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const cart = await getCart();

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container-x py-8">
        <Breadcrumbs items={[{ label: "السلة" }]} />
        <div className="mt-8">
          <EmptyState
            icon={<ShoppingCart className="h-7 w-7" />}
            title="سلة الشراء فارغة"
            description="ابدأ بتصفح المنتجات أو كوّن تجميعتك الخاصة، ثم أضف القطع إلى السلة."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/shop" className={buttonClasses("primary", "md")}>
                  تصفح المنتجات
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <Link href="/builder" className={buttonClasses("outline", "md")}>
                  كوّن تجميعتك
                </Link>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  const subtotal = cart.items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  let discount = 0;
  let couponError: string | null = null;
  if (cart.couponCode) {
    try {
      const coupon = await validateCoupon({ code: cart.couponCode, subtotal });
      discount = coupon.discount;
    } catch (error) {
      couponError = error instanceof Error ? error.message : "كود الخصم غير صالح";
    }
  }

  const total = Math.max(subtotal - discount, 0);
  const hasStockIssue = cart.items.some((item) => {
    const available = availableQuantity(item.product.inventory);
    return available < 1 || item.quantity > available;
  });

  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[{ label: "السلة" }]} />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl">سلة الشراء</h1>
          <p className="mt-1 text-sm text-slate-400">
            {cart.items.length} منتج · {cart.items.reduce((sum, item) => sum + item.quantity, 0)} قطعة
          </p>
        </div>
        <Link href="/shop" className="link-muted inline-flex items-center gap-1.5 font-semibold">
          متابعة التسوق
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {couponError ? (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-xs text-amber-200">
              {couponError} — يمكنك إزالة الكود وإعادة المحاولة.
            </div>
          ) : null}

          {cart.items.map((item) => (
            <CartLine
              key={item.id}
              item={{
                itemId: item.id,
                productId: item.productId,
                name: item.product.nameAr,
                slug: item.product.slug,
                sku: item.product.sku,
                image: item.product.images[0]?.url ?? null,
                categorySlug: item.product.category.slug,
                unitPrice: Number(item.product.price),
                quantity: item.quantity,
                available: availableQuantity(item.product.inventory),
                maxQuantity: MAX_CART_QUANTITY_PER_ITEM,
              }}
            />
          ))}

          <div className="flex items-center justify-between rounded-xl border border-line bg-ink-900/50 px-4 py-3 text-xs text-slate-400">
            <span>الأسعار النهائية والشحن تُحسب على السيرفر عند تأكيد الطلب.</span>
            <Link href="/shop" className="inline-flex items-center gap-1 font-bold text-accent hover:underline">
              <Trash2 className="h-3.5 w-3.5" />
              تعديل السلة من المتجر
            </Link>
          </div>
        </div>

        <aside className="surface h-fit p-5 lg:sticky lg:top-40">
          <h2 className="text-base">ملخص الطلب</h2>

          <div className="mt-4 space-y-2.5 border-b border-line pb-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">المجموع الفرعي</span>
              <span className="font-semibold text-white">{formatPrice(subtotal)}</span>
            </div>
            {discount > 0 ? (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">الخصم</span>
                <span className="font-semibold text-emerald-300">− {formatPrice(discount)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <span className="text-slate-400">الشحن</span>
              <span className="text-xs text-slate-500">يُحسب حسب المحافظة</span>
            </div>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-sm text-slate-300">الإجمالي قبل الشحن</span>
            <span className="text-2xl font-extrabold text-white">{formatPrice(total)}</span>
          </div>

          <div className="mt-4">
            <CouponForm appliedCode={cart.couponCode} />
          </div>

          <Link
            href="/checkout"
            aria-disabled={hasStockIssue}
            className={buttonClasses(
              "primary",
              "lg",
              hasStockIssue ? "pointer-events-none mt-4 w-full opacity-50" : "mt-4 w-full",
            )}
          >
            إتمام الطلب
            <ArrowLeft className="h-4 w-4" />
          </Link>

          {hasStockIssue ? (
            <p className="mt-2 text-[11px] text-rose-300">
              توجد قطع غير متوفرة أو كميات غير كافية. عدّل السلة للمتابعة.
            </p>
          ) : (
            <p className="mt-2 text-center text-[10px] text-slate-500">
              الدفع نقدًا عند الاستلام أو من المحل، مع إمكانية تحويل إنستاباي عند تفعيلها.
            </p>
          )}

          <div className="mt-4 space-y-1.5 border-t border-line pt-4 text-[11px] text-slate-500">
            <p>· المخزون يُحجز لك عند تأكيد الطلب.</p>
            <p>· يمكنك الاستلام من مول البستان، وسط البلد.</p>
            <p>· الأسعار المعروضة لا تُعتمد من العميل؛ يعاد حسابها على السيرفر.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
