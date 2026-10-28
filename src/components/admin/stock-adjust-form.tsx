"use client";

import { useActionState } from "react";
import { Loader2, PackagePlus } from "lucide-react";
import { adjustStockAction, type AdminProductState } from "@/actions/admin/products";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";

export function StockAdjustForm({ productId, available }: { productId: string; available: number }) {
  const [state, action, pending] = useActionState<AdminProductState, FormData>(adjustStockAction, {});

  return (
    <form action={action} className="mt-3 space-y-3 border-t border-line pt-3">
      <input type="hidden" name="productId" value={productId} />

      {state.ok ? <Alert tone="success">{state.message}</Alert> : null}
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <div className="grid gap-2 sm:grid-cols-[110px_100px_1fr_auto]">
        <div>
          <Label htmlFor={`mode-${productId}`}>العملية</Label>
          <Select id={`mode-${productId}`} name="mode" defaultValue="ADD">
            <option value="ADD">إضافة</option>
            <option value="REMOVE">خصم</option>
            <option value="SET">تعيين</option>
          </Select>
        </div>
        <div>
          <Label htmlFor={`quantity-${productId}`}>الكمية</Label>
          <Input id={`quantity-${productId}`} name="quantity" type="number" min="1" required />
        </div>
        <div>
          <Label htmlFor={`reason-${productId}`}>السبب *</Label>
          <Input id={`reason-${productId}`} name="reason" required minLength={3} placeholder="مثال: استلام شحنة مورد" />
        </div>
        <div className="flex items-end">
          <Button type="submit" size="md" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
            تنفيذ
          </Button>
        </div>
      </div>
      <p className="text-[10px] text-slate-500">
        المتاح الحالي {available} قطعة. لا يمكن أن يصبح الرصيد سالبًا، وتُسجَّل الحركة باسمك مع السبب.
      </p>
    </form>
  );
}
