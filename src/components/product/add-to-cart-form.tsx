"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, ShoppingCart } from "lucide-react";
import { addToCartAction, type CartActionState } from "@/actions/cart";
import { Button } from "@/components/ui/button";
import { QuantitySelector } from "./quantity-selector";
import { cn } from "@/lib/utils";

export function AddToCartForm({
  productId,
  available,
  showQuantity = true,
  className,
  buttonLabel = "أضف للسلة",
  size = "md",
  compact = false,
}: {
  productId: string;
  available: number;
  showQuantity?: boolean;
  className?: string;
  buttonLabel?: string;
  size?: "sm" | "md" | "lg";
  compact?: boolean;
}) {
  const router = useRouter();
  const [showSuccess, setShowSuccess] = useState(false);
  const [state, formAction, pending] = useActionState<CartActionState, FormData>(
    async (previous, formData) => {
      const result = await addToCartAction(previous, formData);
      if (result.ok) {
        setShowSuccess(true);
        router.refresh();
      }
      return result;
    },
    {},
  );

  const max = Math.min(Math.max(available, 1), 10);

  // إخفاء رسالة النجاح بعد فترة قصيرة — setState هنا داخل مؤقّت وليس داخل جسم الـ effect.
  useEffect(() => {
    if (!showSuccess) return;
    const timer = setTimeout(() => setShowSuccess(false), 2500);
    return () => clearTimeout(timer);
  }, [showSuccess]);

  if (available <= 0) {
    return (
      <Button variant="secondary" size={size} disabled className={cn("w-full", className)}>
        غير متوفر حاليًا
      </Button>
    );
  }

  return (
    <form action={formAction} className={cn("space-y-2", className)}>
      <input type="hidden" name="productId" value={productId} />
      <div className={cn("flex flex-wrap items-center gap-2", compact && "gap-1.5")}>
        {showQuantity ? (
          <QuantitySelector defaultValue={1} max={max} size={compact ? "sm" : "md"} />
        ) : (
          <input type="hidden" name="quantity" value={1} />
        )}
        <Button
          type="submit"
          size={size}
          variant={showSuccess ? "success" : "primary"}
          disabled={pending}
          className={cn(showQuantity ? "flex-1" : "w-full", "min-w-[130px]")}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : showSuccess ? (
            <Check className="h-4 w-4" />
          ) : (
            <ShoppingCart className="h-4 w-4" />
          )}
          {pending ? "جارٍ الإضافة…" : showSuccess ? "تمت الإضافة" : buttonLabel}
        </Button>
      </div>
      {state.message && !state.ok ? <p className="text-xs font-medium text-rose-400">{state.message}</p> : null}
      {showQuantity && available <= 3 && !compact ? (
        <p className="text-[11px] text-amber-300/90">الكمية محدودة — متاح {available} قطع فقط</p>
      ) : null}
    </form>
  );
}
