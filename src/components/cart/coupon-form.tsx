"use client";

import { useActionState } from "react";
import { Loader2, Tag, X } from "lucide-react";
import { applyCouponAction, removeCouponAction, type CartActionState } from "@/actions/cart";

export function CouponForm({ appliedCode }: { appliedCode: string | null }) {
  const [state, action, pending] = useActionState<CartActionState, FormData>(applyCouponAction, {});

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-2.5">
        <span className="flex items-center gap-2 text-xs font-bold text-emerald-300">
          <Tag className="h-4 w-4" />
          الكود {appliedCode} مفعّل
        </span>
        <form action={removeCouponAction}>
          <button
            type="submit"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:text-rose-300"
            aria-label="إزالة كود الخصم"
          >
            <X className="h-4 w-4" />
          </button>
        </form>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-1.5">
      <div className="flex gap-2">
        <input
          type="text"
          name="code"
          placeholder="كود الخصم"
          className="field h-10 text-xs uppercase"
          aria-label="كود الخصم"
          dir="ltr"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-line px-3 text-xs font-bold text-slate-200 transition hover:border-accent/40 hover:text-accent disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Tag className="h-3.5 w-3.5" />}
          تطبيق
        </button>
      </div>
      {state.message ? (
        <p className={state.ok ? "text-[11px] text-emerald-300" : "text-[11px] text-rose-300"}>{state.message}</p>
      ) : null}
    </form>
  );
}
