"use client";

import { useActionState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { importProductsAction, type AdminProductState } from "@/actions/admin/products";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function CsvImportForm() {
  const [state, action, pending] = useActionState<AdminProductState, FormData>(importProductsAction, {});

  return (
    <form action={action} className="surface p-5">
      <h2 className="text-base">استيراد منتجات من CSV</h2>
      <p className="mt-1 text-[11px] leading-6 text-slate-500">
        الأعمدة: sku, nameAr, nameEn, categorySlug, brand, price, quantity, status, type, model, descriptionAr, compareAtPrice,
        warrantyMonths, lowStockThreshold. المنتجات المستوردة تُنشأ بدون مواصفات — أضف مواصفات التوافق بعد الاستيراد.
      </p>

      {state.ok && state.message ? <Alert tone="success" className="mt-3">{state.message}</Alert> : null}
      {state.error ? <Alert tone="error" className="mt-3">{state.error}</Alert> : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="file"
          name="csv"
          accept=".csv,text/csv"
          required
          className="block w-full max-w-sm rounded-xl border border-line bg-ink-900/70 px-3 py-2 text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-700 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
        />
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
          {pending ? "جارٍ الاستيراد…" : "استيراد"}
        </Button>
      </div>
    </form>
  );
}
