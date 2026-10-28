"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { submitInstapayProofAction, type PaymentProofState } from "@/actions/payment";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

export function PaymentProofForm({
  orderNumber,
  accessToken,
  reference,
  status,
}: {
  orderNumber: string;
  accessToken: string;
  reference: string | null;
  status: string;
}) {
  const [state, action, pending] = useActionState<PaymentProofState, FormData>(submitInstapayProofAction, {});

  if (state.ok) {
    return (
      <Alert tone="success" title="تم استلام بيانات التحويل">
        {state.message}
      </Alert>
    );
  }

  if (status === "PAID") {
    return (
      <Alert tone="success" title="تم تأكيد الدفع">
        تمت مراجعة التحويل واعتماده. لا حاجة لإرسال بيانات أخرى.
      </Alert>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="orderNumber" value={orderNumber} />
      <input type="hidden" name="accessToken" value={accessToken} />

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <div>
        <Label htmlFor="reference">مرجع عملية التحويل *</Label>
        <Input
          id="reference"
          name="reference"
          defaultValue={reference ?? ""}
          required
          minLength={4}
          maxLength={80}
          dir="ltr"
          placeholder="Transaction reference"
        />
        <p className="mt-1 text-[10px] text-slate-500">رقم العملية الظاهر في تطبيق إنستاباي بعد التحويل.</p>
      </div>

      <div>
        <Label htmlFor="proof" hint="اختياري — صورة JPG/PNG/WebP حتى 5MB">
          إثبات التحويل
        </Label>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line bg-ink-900/60 px-4 py-3 text-xs text-slate-400 transition hover:border-accent/40">
          <Upload className="h-4 w-4 text-accent" />
          اختر صورة إثبات التحويل
          <input
            id="proof"
            name="proof"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
          />
        </label>
      </div>

      {status === "UNDER_REVIEW" ? (
        <Alert tone="warning" title="التحويل تحت المراجعة">
          يمكنك تحديث المرجع أو إرفاق صورة جديدة إذا لزم الأمر.
        </Alert>
      ) : null}

      {status === "REJECTED" ? (
        <Alert tone="error" title="تم رفض التحويل السابق">
          راجع بيانات التحويل ثم أرسل المرجع الصحيح. يمكنك التواصل مع المتجر للمساعدة.
        </Alert>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {pending ? "جارٍ الإرسال…" : "إرسال بيانات التحويل للمراجعة"}
      </Button>
    </form>
  );
}
