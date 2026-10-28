"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Loader2, Truck, XCircle } from "lucide-react";
import { transitionOrderAction, reviewPaymentAction, type AdminOrderState } from "@/actions/admin/orders";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TRANSITIONS } from "@/lib/constants";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label, Select, Textarea } from "@/components/ui/field";

export function OrderStatusForm({ orderId, status }: { orderId: string; status: string }) {
  const transitions = ORDER_STATUS_TRANSITIONS[status] ?? [];
  const [target, setTarget] = useState(transitions[0] ?? "");
  const [state, action, pending] = useActionState<AdminOrderState, FormData>(transitionOrderAction, {});

  if (transitions.length === 0) {
    return <p className="text-xs text-slate-500">لا توجد إجراءات متاحة لهذا الطلب في حالته الحالية.</p>;
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />

      {state.ok ? <Alert tone="success">{state.message}</Alert> : null}
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <div>
        <Label htmlFor="status">الحالة الجديدة</Label>
        <Select id="status" name="status" value={target} onChange={(event) => setTarget(event.target.value)}>
          {transitions.map((transition) => (
            <option key={transition} value={transition}>
              {ORDER_STATUS_LABELS[transition] ?? transition}
            </option>
          ))}
        </Select>
      </div>

      {target === "SHIPPED" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="trackingNumber">رقم التتبع</Label>
            <Input id="trackingNumber" name="trackingNumber" dir="ltr" />
          </div>
          <div>
            <Label htmlFor="carrier">شركة الشحن</Label>
            <Input id="carrier" name="carrier" />
          </div>
        </div>
      ) : null}

      {target === "DELIVERED" ? (
        <Checkbox name="collectCash" label="تم تحصيل المبلغ نقدًا عند التسليم (إن لم يكن مدفوعًا)" />
      ) : null}

      {target === "CANCELLED" ? (
        <div>
          <Label htmlFor="cancelReason">سبب الإلغاء *</Label>
          <Textarea id="cancelReason" name="cancelReason" required rows={2} placeholder="سيتم تحرير الكميات المحجوزة تلقائيًا." />
        </div>
      ) : null}

      <div>
        <Label htmlFor="note" hint="اختياري">
          ملاحظة داخلية
        </Label>
        <Textarea id="note" name="note" rows={2} />
      </div>

      <Button type="submit" variant={target === "CANCELLED" ? "danger" : "primary"} className="w-full" disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : target === "SHIPPED" ? (
          <Truck className="h-4 w-4" />
        ) : target === "CANCELLED" ? (
          <XCircle className="h-4 w-4" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        {pending ? "جارٍ التنفيذ…" : `تحويل إلى: ${ORDER_STATUS_LABELS[target] ?? target}`}
      </Button>
    </form>
  );
}

export function PaymentReviewForm({ paymentId, status }: { paymentId: string; status: string }) {
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [state, action, pending] = useActionState<AdminOrderState, FormData>(reviewPaymentAction, {});

  if (status === "PAID") {
    return <Alert tone="success" title="الدفع معتمد">تمت مراجعة تحويل إنستاباي واعتماده.</Alert>;
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="paymentId" value={paymentId} />
      <input type="hidden" name="decision" value={decision} />

      {state.ok ? <Alert tone="success">{state.message}</Alert> : null}
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <div>
        <Label htmlFor="reason" hint={decision === "REJECT" ? "مطلوب" : "اختياري"}>
          سبب القرار
        </Label>
        <Textarea
          id="reason"
          name="reason"
          rows={2}
          required={decision === "REJECT"}
          placeholder={decision === "REJECT" ? "مثال: لم يصل التحويل أو المرجع غير صحيح" : "ملاحظة للمراجعة"}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="submit"
          variant="success"
          onClick={() => setDecision("APPROVE")}
          disabled={pending}
        >
          {pending && decision === "APPROVE" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          اعتماد الدفع
        </Button>
        <Button
          type="submit"
          variant="danger"
          onClick={() => setDecision("REJECT")}
          disabled={pending}
        >
          {pending && decision === "REJECT" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
          رفض التحويل
        </Button>
      </div>
      <p className="text-[10px] text-slate-500">
        لا يتم تعليم الطلب كمدفوع إلا بعد الاعتماد اليدوي. تأكد من وصول المبلغ قبل الضغط على «اعتماد الدفع».
      </p>
    </form>
  );
}
