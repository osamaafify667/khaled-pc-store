"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Banknote,
  Building2,
  CheckCircle2,
  CreditCard,
  Loader2,
  MapPin,
  Store,
  Truck,
} from "lucide-react";
import { placeOrderAction, type CheckoutState } from "@/actions/checkout";
import { EGYPT_GOVERNORATES } from "@/lib/constants";
import { formatPrice, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox, FieldError, Input, Label, Select, Textarea } from "@/components/ui/field";

export function CheckoutForm({
  zones,
  settings,
  subtotal,
  discount,
}: {
  zones: Array<{ governorate: string; fee: number; codAvailable: boolean; estimatedDays: string | null }>;
  settings: {
    codEnabled: boolean;
    pickupEnabled: boolean;
    instapayEnabled: boolean;
    instapayHandle: string | null;
    instapayName: string | null;
    shippingFlatFee: number;
    freeShippingThreshold: number | null;
    addressLine: string;
    workingHours: string | null;
  };
  subtotal: number;
  discount: number;
}) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrderAction, {});

  const [fulfillment, setFulfillment] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [payment, setPayment] = useState<"CASH_ON_DELIVERY" | "PICKUP_CASH" | "INSTAPAY">(
    settings.codEnabled ? "CASH_ON_DELIVERY" : settings.instapayEnabled ? "INSTAPAY" : "PICKUP_CASH",
  );
  const [governorate, setGovernorate] = useState("القاهرة");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [street, setStreet] = useState("");
  const [building, setBuilding] = useState("");
  const [addressNotes, setAddressNotes] = useState("");

  const changeFulfillment = (next: "DELIVERY" | "PICKUP") => {
    setFulfillment(next);
    if (next === "PICKUP") {
      setPayment(settings.pickupEnabled ? "PICKUP_CASH" : "INSTAPAY");
    } else if (payment === "PICKUP_CASH") {
      setPayment(settings.codEnabled ? "CASH_ON_DELIVERY" : "INSTAPAY");
    }
  };

  const zone = zones.find((entry) => entry.governorate === governorate);
  const shipping = useMemo(() => {
    if (fulfillment === "PICKUP") return 0;
    if (settings.freeShippingThreshold && subtotal >= settings.freeShippingThreshold) return 0;
    return zone?.fee ?? settings.shippingFlatFee;
  }, [fulfillment, settings.freeShippingThreshold, settings.shippingFlatFee, subtotal, zone]);

  const total = Math.max(subtotal - discount + shipping, 0);

  const deliveryMethods = [
    ...(settings.codEnabled
      ? [{ value: "CASH_ON_DELIVERY" as const, icon: Banknote, title: "الدفع نقدًا عند الاستلام", text: "ادفع للمندوب عند تسليم الطلب." }]
      : []),
    ...(settings.instapayEnabled
      ? [{ value: "INSTAPAY" as const, icon: CreditCard, title: "تحويل إنستاباي", text: "أرسل مرجع التحويل ثم تُراجع الإدارة الدفع يدويًا." }]
      : []),
  ];

  const pickupMethods = [
    ...(settings.pickupEnabled
      ? [{ value: "PICKUP_CASH" as const, icon: Store, title: "الدفع نقدًا في المحل", text: "استلم وادفع عند زيارة المحل." }]
      : []),
    ...(settings.instapayEnabled
      ? [{ value: "INSTAPAY" as const, icon: CreditCard, title: "تحويل إنستاباي", text: "حوّل قبل الاستلام وأرسل المرجع للمراجعة." }]
      : []),
  ];

  const methods = fulfillment === "DELIVERY" ? deliveryMethods : pickupMethods;

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        {state.error ? (
          <div className="flex gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{state.error}</p>
          </div>
        ) : null}

        {/* Fulfillment */}
        <section className="surface p-4 sm:p-5">
          <h2 className="text-base">طريقة الاستلام</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { value: "DELIVERY" as const, icon: Truck, title: "توصيل للعنوان", text: "شحن لكل محافظات مصر" },
              ...(settings.pickupEnabled
                ? [{ value: "PICKUP" as const, icon: Building2, title: "استلام من المحل", text: settings.addressLine }]
                : []),
            ].map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition",
                  fulfillment === option.value
                    ? "border-accent/50 bg-accent/5"
                    : "border-line hover:border-accent/25",
                )}
              >
                <input
                  type="radio"
                  name="fulfillmentType"
                  value={option.value}
                  checked={fulfillment === option.value}
                  onChange={() => changeFulfillment(option.value)}
                  className="mt-1 accent-[#2ee6a8]"
                />
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-bold text-white">
                    <option.icon className="h-4 w-4 text-accent" />
                    {option.title}
                  </span>
                  <span className="mt-1 block text-[11px] leading-5 text-slate-400">{option.text}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="surface p-4 sm:p-5">
          <h2 className="text-base">بيانات التواصل</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="fullName">الاسم الكامل *</Label>
              <Input
                id="fullName"
                name="fullName"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
                autoComplete="name"
                placeholder="الاسم كما سيظهر في الطلب"
              />
              <FieldError message={state.fieldErrors?.fullName} />
            </div>
            <div>
              <Label htmlFor="phone">رقم الهاتف *</Label>
              <Input
                id="phone"
                name="phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
                inputMode="tel"
                dir="ltr"
                autoComplete="tel"
                placeholder="01012345678"
              />
              <FieldError message={state.fieldErrors?.phone} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="email" hint="اختياري">
                البريد الإلكتروني
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue=""
                dir="ltr"
                autoComplete="email"
                placeholder="name@example.com"
              />
              <FieldError message={state.fieldErrors?.email} />
            </div>
          </div>
        </section>

        {/* Address */}
        {fulfillment === "DELIVERY" ? (
          <section className="surface p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base">عنوان التوصيل</h2>
              <span className="text-[11px] text-slate-500">
                {zone?.estimatedDays ? `التوصيل المتوقع: ${zone.estimatedDays}` : "التوصيل حسب المحافظة"}
              </span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="governorate">المحافظة *</Label>
                <Select
                  id="governorate"
                  name="governorate"
                  value={governorate}
                  onChange={(event) => setGovernorate(event.target.value)}
                  required
                >
                  {EGYPT_GOVERNORATES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </Select>
                <FieldError message={state.fieldErrors?.governorate} />
              </div>
              <div>
                <Label htmlFor="city">المدينة / المركز *</Label>
                <Input id="city" name="city" value={city} onChange={(event) => setCity(event.target.value)} required />
                <FieldError message={state.fieldErrors?.city} />
              </div>
              <div>
                <Label htmlFor="area" hint="اختياري">
                  الحي / المنطقة
                </Label>
                <Input id="area" name="area" value={area} onChange={(event) => setArea(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="street">العنوان التفصيلي *</Label>
                <Input
                  id="street"
                  name="street"
                  value={street}
                  onChange={(event) => setStreet(event.target.value)}
                  required
                  placeholder="اسم الشارع ورقم العقار"
                />
                <FieldError message={state.fieldErrors?.street} />
              </div>
              <div>
                <Label htmlFor="building" hint="اختياري">
                  رقم المبنى / الشقة / الدور
                </Label>
                <Input id="building" name="building" value={building} onChange={(event) => setBuilding(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="addressNotes" hint="اختياري">
                  ملاحظات للعنوان
                </Label>
                <Input
                  id="addressNotes"
                  name="addressNotes"
                  value={addressNotes}
                  onChange={(event) => setAddressNotes(event.target.value)}
                  placeholder="علامة مميزة قريبة…"
                />
              </div>
            </div>
          </section>
        ) : (
          <section className="surface p-4 sm:p-5">
            <h2 className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-accent" />
              الاستلام من المحل
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-300">{settings.addressLine}</p>
            {settings.workingHours ? <p className="mt-1 text-xs text-slate-500">مواعيد العمل: {settings.workingHours}</p> : null}
            <p className="mt-3 rounded-lg border border-line bg-ink-900/50 px-3 py-2 text-[11px] leading-5 text-slate-400">
              سيصلك كود استلام بعد تأكيد الطلب. أحضر الكود مع إثبات الهوية. لا يُطلب منك دفع شحن عند الاستلام من المحل.
            </p>
          </section>
        )}

        {/* Payment */}
        <section className="surface p-4 sm:p-5">
          <h2 className="text-base">طريقة الدفع</h2>
          {methods.length === 0 ? (
            <p className="mt-3 text-sm text-rose-300">لا توجد طريقة دفع متاحة حاليًا لهذا النوع. تواصل معنا.</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {methods.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition",
                    payment === option.value ? "border-accent/50 bg-accent/5" : "border-line hover:border-accent/25",
                  )}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={option.value}
                    checked={payment === option.value}
                    onChange={() => setPayment(option.value)}
                    className="mt-1 accent-[#2ee6a8]"
                  />
                  <span>
                    <span className="flex items-center gap-1.5 text-sm font-bold text-white">
                      <option.icon className="h-4 w-4 text-accent" />
                      {option.title}
                    </span>
                    <span className="mt-1 block text-[11px] leading-5 text-slate-400">{option.text}</span>
                  </span>
                </label>
              ))}
            </div>
          )}

          <FieldError message={state.fieldErrors?.paymentMethod} />

          {payment === "INSTAPAY" ? (
            <div className="mt-4 rounded-xl border border-sky-500/25 bg-sky-500/5 p-3 text-[11px] leading-6 text-sky-100">
              <p className="font-bold">بيانات التحويل</p>
              {settings.instapayHandle ? (
                <p className="mt-1">
                  الحساب: <span dir="ltr" className="font-mono">{settings.instapayHandle}</span>
                  {settings.instapayName ? ` — ${settings.instapayName}` : ""}
                </p>
              ) : (
                <p className="mt-1 text-amber-200">لم تُضبط بيانات إنستاباي بعد. ستظهر بعد تأكيد الطلب أو تواصل معنا.</p>
              )}
              <p className="mt-1">
                بعد إنشاء الطلب ستظهر لك صفحة لإرسال مرجع التحويل. لن يُعتبر الطلب مدفوعًا قبل مراجعة الإدارة.
              </p>
            </div>
          ) : null}

          {fulfillment === "DELIVERY" && payment === "CASH_ON_DELIVERY" && zone && !zone.codAvailable ? (
            <p className="mt-3 text-xs text-amber-300">الدفع عند الاستلام غير متاح في هذه المحافظة. اختر إنستاباي أو الاستلام من المحل.</p>
          ) : null}
        </section>

        {/* Notes */}
        <section className="surface p-4 sm:p-5">
          <Label htmlFor="notes" hint="اختياري">
            ملاحظات على الطلب
          </Label>
          <Textarea id="notes" name="notes" maxLength={1000} placeholder="أي تفاصيل إضافية تود إخبارنا بها…" />
          <FieldError message={state.fieldErrors?.notes} />

          <div className="mt-4">
            <Checkbox
              name="acceptTerms"
              required
              label="أوافق على الشروط والأحكام وسياسة الضمان والاستبدال، وأتحمل مسؤولية صحة بيانات العنوان ورقم الهاتف."
            />
            <FieldError message={state.fieldErrors?.acceptTerms} />
            <p className="mt-2 text-[10px] text-slate-500">
              بالضغط على «تأكيد الطلب» يتم حجز القطع من المخزون وإرسال الطلب لفريق المتجر.
            </p>
          </div>
        </section>
      </div>

      <aside className="surface h-fit p-5 lg:sticky lg:top-40">
        <h2 className="text-base">ملخص الدفع</h2>

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
            <span className="text-slate-400">{fulfillment === "PICKUP" ? "استلام من المحل" : "الشحن"}</span>
            <span className={cn("font-semibold", shipping === 0 ? "text-emerald-300" : "text-white")}>
              {shipping === 0 ? "مجاني" : formatPrice(shipping)}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-sm text-slate-300">الإجمالي</span>
          <span className="text-2xl font-extrabold text-white">{formatPrice(total)}</span>
        </div>

        {settings.freeShippingThreshold && fulfillment === "DELIVERY" && shipping > 0 ? (
          <p className="mt-2 rounded-lg border border-line bg-ink-900/50 px-3 py-2 text-[10px] leading-5 text-slate-400">
            أضف بقيمة {formatPrice(Math.max(settings.freeShippingThreshold - subtotal, 0))} للحصول على شحن مجاني.
          </p>
        ) : null}

        <Button type="submit" size="lg" className="mt-4 w-full" disabled={pending || methods.length === 0}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {pending ? "جارٍ إنشاء الطلب…" : "تأكيد الطلب"}
        </Button>

        <p className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
          <CheckCircle2 className="h-3 w-3 text-accent" />
          المخزون والأسعار تُتحقق على السيرفر
        </p>

        <Link href="/cart" className="mt-3 block text-center text-[11px] font-semibold text-slate-400 hover:text-accent">
          العودة إلى السلة
        </Link>
      </aside>
    </form>
  );
}
