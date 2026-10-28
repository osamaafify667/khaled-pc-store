"use client";

import { useActionState, useState } from "react";
import { Loader2, Save } from "lucide-react";
import {
  saveBrandAction,
  saveCategoryAction,
  saveCouponAction,
  saveSettingsAction,
  saveShippingZoneAction,
  type CatalogState,
} from "@/actions/admin/catalog";
import { EGYPT_GOVERNORATES } from "@/lib/constants";
import type { Settings } from "@/server/settings";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox, FieldError, FormRow, Input, Label, Select, Textarea } from "@/components/ui/field";

function ResultMessage({ state }: { state: CatalogState }) {
  if (state.ok) return <Alert tone="success" className="mt-4">{state.message}</Alert>;
  if (state.error) return <Alert tone="error" className="mt-4">{state.error}</Alert>;
  return null;
}

export type CategoryValues = {
  id?: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
};

export function CategoryForm({ category }: { category?: CategoryValues }) {
  const [state, action, pending] = useActionState<CatalogState, FormData>(saveCategoryAction, {});

  return (
    <form action={action} className="space-y-3">
      {category?.id ? <input type="hidden" name="id" value={category.id} /> : null}
      <ResultMessage state={state} />
      <FormRow>
        <div>
          <Label htmlFor={`cat-nameAr-${category?.id ?? "new"}`}>الاسم العربي *</Label>
          <Input id={`cat-nameAr-${category?.id ?? "new"}`} name="nameAr" defaultValue={category?.nameAr ?? ""} required />
          <FieldError message={state.fieldErrors?.nameAr} />
        </div>
        <div>
          <Label htmlFor={`cat-nameEn-${category?.id ?? "new"}`}>الاسم الإنجليزي *</Label>
          <Input id={`cat-nameEn-${category?.id ?? "new"}`} name="nameEn" defaultValue={category?.nameEn ?? ""} required dir="ltr" />
          <FieldError message={state.fieldErrors?.nameEn} />
        </div>
      </FormRow>
      <FormRow>
        <div>
          <Label htmlFor={`cat-slug-${category?.id ?? "new"}`}>الرابط *</Label>
          <Input id={`cat-slug-${category?.id ?? "new"}`} name="slug" defaultValue={category?.slug ?? ""} required dir="ltr" placeholder="cpu" />
          <FieldError message={state.fieldErrors?.slug} />
        </div>
        <div>
          <Label htmlFor={`cat-icon-${category?.id ?? "new"}`} hint="cpu, gpu, memory…">
            الأيقونة
          </Label>
          <Input id={`cat-icon-${category?.id ?? "new"}`} name="icon" defaultValue={category?.icon ?? ""} dir="ltr" />
        </div>
      </FormRow>
      <div>
        <Label htmlFor={`cat-desc-${category?.id ?? "new"}`}>الوصف</Label>
        <Textarea id={`cat-desc-${category?.id ?? "new"}`} name="description" defaultValue={category?.description ?? ""} rows={2} />
      </div>
      <FormRow>
        <div>
          <Label htmlFor={`cat-sort-${category?.id ?? "new"}`}>الترتيب</Label>
          <Input id={`cat-sort-${category?.id ?? "new"}`} name="sortOrder" type="number" min="0" defaultValue={category?.sortOrder ?? 0} />
        </div>
        <div className="flex items-end pb-2">
          <Checkbox name="isActive" label="نشط ويظهر في المتجر" defaultChecked={category?.isActive ?? true} />
        </div>
      </FormRow>
      <Button type="submit" disabled={pending} size="md">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {pending ? "جارٍ الحفظ…" : category?.id ? "حفظ التصنيف" : "إضافة التصنيف"}
      </Button>
    </form>
  );
}

export type BrandValues = { id?: string; name: string; slug: string; logoUrl: string | null; isActive: boolean };

export function BrandForm({ brand }: { brand?: BrandValues }) {
  const [state, action, pending] = useActionState<CatalogState, FormData>(saveBrandAction, {});

  return (
    <form action={action} className="space-y-3">
      {brand?.id ? <input type="hidden" name="id" value={brand.id} /> : null}
      <ResultMessage state={state} />
      <div>
        <Label htmlFor={`brand-name-${brand?.id ?? "new"}`}>اسم الشركة *</Label>
        <Input id={`brand-name-${brand?.id ?? "new"}`} name="name" defaultValue={brand?.name ?? ""} required />
        <FieldError message={state.fieldErrors?.name} />
      </div>
      <FormRow>
        <div>
          <Label htmlFor={`brand-slug-${brand?.id ?? "new"}`}>الرابط *</Label>
          <Input id={`brand-slug-${brand?.id ?? "new"}`} name="slug" defaultValue={brand?.slug ?? ""} required dir="ltr" />
          <FieldError message={state.fieldErrors?.slug} />
        </div>
        <div>
          <Label htmlFor={`brand-logo-${brand?.id ?? "new"}`}>رابط الشعار</Label>
          <Input id={`brand-logo-${brand?.id ?? "new"}`} name="logoUrl" defaultValue={brand?.logoUrl ?? ""} dir="ltr" placeholder="https://…" />
          <FieldError message={state.fieldErrors?.logoUrl} />
        </div>
      </FormRow>
      <Checkbox name="isActive" label="نشط" defaultChecked={brand?.isActive ?? true} />
      <Button type="submit" disabled={pending} size="md">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {pending ? "جارٍ الحفظ…" : brand?.id ? "حفظ الشركة" : "إضافة الشركة"}
      </Button>
    </form>
  );
}

export type CouponValues = {
  id?: string;
  code: string;
  type: string;
  value: string;
  minSubtotal: string;
  maxUses: number | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
};

export function CouponForm({ coupon }: { coupon?: CouponValues }) {
  const [state, action, pending] = useActionState<CatalogState, FormData>(saveCouponAction, {});

  return (
    <form action={action} className="space-y-3">
      {coupon?.id ? <input type="hidden" name="id" value={coupon.id} /> : null}
      <ResultMessage state={state} />
      <FormRow>
        <div>
          <Label htmlFor={`coupon-code-${coupon?.id ?? "new"}`}>الكود *</Label>
          <Input id={`coupon-code-${coupon?.id ?? "new"}`} name="code" defaultValue={coupon?.code ?? ""} required dir="ltr" placeholder="WELCOME10" />
          <FieldError message={state.fieldErrors?.code} />
        </div>
        <div>
          <Label htmlFor={`coupon-type-${coupon?.id ?? "new"}`}>النوع *</Label>
          <Select id={`coupon-type-${coupon?.id ?? "new"}`} name="type" defaultValue={coupon?.type ?? "PERCENT"}>
            <option value="PERCENT">نسبة مئوية</option>
            <option value="FIXED">مبلغ ثابت</option>
          </Select>
        </div>
      </FormRow>
      <FormRow>
        <div>
          <Label htmlFor={`coupon-value-${coupon?.id ?? "new"}`}>القيمة *</Label>
          <Input id={`coupon-value-${coupon?.id ?? "new"}`} name="value" type="number" step="0.01" min="1" defaultValue={coupon?.value ?? ""} required />
          <FieldError message={state.fieldErrors?.value} />
        </div>
        <div>
          <Label htmlFor={`coupon-min-${coupon?.id ?? "new"}`}>أقل قيمة للسلة</Label>
          <Input id={`coupon-min-${coupon?.id ?? "new"}`} name="minSubtotal" type="number" step="0.01" min="0" defaultValue={coupon?.minSubtotal ?? "0"} />
        </div>
      </FormRow>
      <FormRow>
        <div>
          <Label htmlFor={`coupon-max-${coupon?.id ?? "new"}`}>حد الاستخدام</Label>
          <Input id={`coupon-max-${coupon?.id ?? "new"}`} name="maxUses" type="number" min="1" defaultValue={coupon?.maxUses ?? ""} />
        </div>
        <div className="flex items-end pb-2">
          <Checkbox name="isActive" label="نشط" defaultChecked={coupon?.isActive ?? true} />
        </div>
      </FormRow>
      <FormRow>
        <div>
          <Label htmlFor={`coupon-start-${coupon?.id ?? "new"}`}>يبدأ في</Label>
          <Input id={`coupon-start-${coupon?.id ?? "new"}`} name="startsAt" type="datetime-local" defaultValue={coupon?.startsAt ?? ""} />
        </div>
        <div>
          <Label htmlFor={`coupon-end-${coupon?.id ?? "new"}`}>ينتهي في</Label>
          <Input id={`coupon-end-${coupon?.id ?? "new"}`} name="endsAt" type="datetime-local" defaultValue={coupon?.endsAt ?? ""} />
        </div>
      </FormRow>
      <Button type="submit" disabled={pending} size="md">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {pending ? "جارٍ الحفظ…" : coupon?.id ? "حفظ الكوبون" : "إضافة الكوبون"}
      </Button>
    </form>
  );
}

export type ShippingZoneValues = {
  id?: string;
  governorate: string;
  fee: string;
  codAvailable: boolean;
  estimatedDays: string | null;
  isActive: boolean;
  sortOrder: number;
};

export function ShippingZoneForm({ zone }: { zone?: ShippingZoneValues }) {
  const [state, action, pending] = useActionState<CatalogState, FormData>(saveShippingZoneAction, {});

  return (
    <form action={action} className="space-y-3">
      {zone?.id ? <input type="hidden" name="id" value={zone.id} /> : null}
      <ResultMessage state={state} />
      <div>
        <Label htmlFor={`zone-gov-${zone?.id ?? "new"}`}>المحافظة *</Label>
        <Select id={`zone-gov-${zone?.id ?? "new"}`} name="governorate" defaultValue={zone?.governorate ?? ""} required>
          <option value="" disabled>اختر المحافظة</option>
          {EGYPT_GOVERNORATES.map((governorate) => (
            <option key={governorate} value={governorate}>{governorate}</option>
          ))}
        </Select>
        <FieldError message={state.fieldErrors?.governorate} />
      </div>
      <FormRow>
        <div>
          <Label htmlFor={`zone-fee-${zone?.id ?? "new"}`}>رسوم الشحن *</Label>
          <Input id={`zone-fee-${zone?.id ?? "new"}`} name="fee" type="number" step="0.01" min="0" defaultValue={zone?.fee ?? "0"} required />
          <FieldError message={state.fieldErrors?.fee} />
        </div>
        <div>
          <Label htmlFor={`zone-days-${zone?.id ?? "new"}`}>المدة المتوقعة</Label>
          <Input id={`zone-days-${zone?.id ?? "new"}`} name="estimatedDays" defaultValue={zone?.estimatedDays ?? ""} placeholder="2-3 أيام" />
        </div>
      </FormRow>
      <FormRow>
        <div>
          <Label htmlFor={`zone-sort-${zone?.id ?? "new"}`}>الترتيب</Label>
          <Input id={`zone-sort-${zone?.id ?? "new"}`} name="sortOrder" type="number" min="0" defaultValue={zone?.sortOrder ?? 0} />
        </div>
        <div className="flex flex-col gap-2 pb-1">
          <Checkbox name="codAvailable" label="الدفع عند الاستلام متاح" defaultChecked={zone?.codAvailable ?? true} />
          <Checkbox name="isActive" label="نشط" defaultChecked={zone?.isActive ?? true} />
        </div>
      </FormRow>
      <Button type="submit" disabled={pending} size="md">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {pending ? "جارٍ الحفظ…" : zone?.id ? "حفظ المنطقة" : "إضافة منطقة"}
      </Button>
    </form>
  );
}

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState<CatalogState, FormData>(saveSettingsAction, {});
  const [instapayEnabled, setInstapayEnabled] = useState(settings.instapayEnabled);

  return (
    <form action={action} className="space-y-5">
      <ResultMessage state={state} />

      <section className="surface p-5">
        <h2 className="text-base">بيانات المتجر</h2>
        <p className="mt-1 text-[11px] text-slate-500">كل ما يظهر في الموقع يُدار من هنا. لا تُضف بيانات غير حقيقية.</p>
        <div className="mt-4 space-y-3">
          <FormRow>
            <div>
              <Label htmlFor="storeNameAr">اسم المتجر بالعربية *</Label>
              <Input id="storeNameAr" name="storeNameAr" defaultValue={settings.storeNameAr} required />
              <FieldError message={state.fieldErrors?.storeNameAr} />
            </div>
            <div>
              <Label htmlFor="storeNameEn">الاسم بالإنجليزية *</Label>
              <Input id="storeNameEn" name="storeNameEn" defaultValue={settings.storeNameEn} required dir="ltr" />
              <FieldError message={state.fieldErrors?.storeNameEn} />
            </div>
          </FormRow>
          <div>
            <Label htmlFor="tagline">الشعار النصي</Label>
            <Input id="tagline" name="tagline" defaultValue={settings.tagline} />
          </div>
          <div>
            <Label htmlFor="addressLine">العنوان *</Label>
            <Input id="addressLine" name="addressLine" defaultValue={settings.addressLine} required />
            <FieldError message={state.fieldErrors?.addressLine} />
          </div>
          <FormRow>
            <div>
              <Label htmlFor="phone">الهاتف</Label>
              <Input id="phone" name="phone" defaultValue={settings.phone ?? ""} dir="ltr" />
              <FieldError message={state.fieldErrors?.phone} />
            </div>
            <div>
              <Label htmlFor="whatsapp">واتساب</Label>
              <Input id="whatsapp" name="whatsapp" defaultValue={settings.whatsapp ?? ""} dir="ltr" />
              <FieldError message={state.fieldErrors?.whatsapp} />
            </div>
          </FormRow>
          <FormRow>
            <div>
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" name="email" type="email" defaultValue={settings.email ?? ""} dir="ltr" />
              <FieldError message={state.fieldErrors?.email} />
            </div>
            <div>
              <Label htmlFor="workingHours">مواعيد العمل</Label>
              <Input id="workingHours" name="workingHours" defaultValue={settings.workingHours ?? ""} placeholder="السبت - الخميس، 11ص - 10م" />
            </div>
          </FormRow>
          <div>
            <Label htmlFor="mapUrl">رابط الخريطة</Label>
            <Input id="mapUrl" name="mapUrl" defaultValue={settings.mapUrl ?? ""} dir="ltr" />
            <FieldError message={state.fieldErrors?.mapUrl} />
          </div>
          <FormRow>
            <div>
              <Label htmlFor="instagramUrl">إنستجرام</Label>
              <Input id="instagramUrl" name="instagramUrl" defaultValue={settings.instagramUrl ?? ""} dir="ltr" />
              <FieldError message={state.fieldErrors?.instagramUrl} />
            </div>
            <div>
              <Label htmlFor="facebookUrl">فيسبوك</Label>
              <Input id="facebookUrl" name="facebookUrl" defaultValue={settings.facebookUrl ?? ""} dir="ltr" />
              <FieldError message={state.fieldErrors?.facebookUrl} />
            </div>
          </FormRow>
          <div>
            <Label htmlFor="announcement">شريط الإعلان أعلى الموقع</Label>
            <Input id="announcement" name="announcement" defaultValue={settings.announcement ?? ""} maxLength={200} />
          </div>
          <div>
            <Label htmlFor="storeNote">ملاحظة داخلية / تظهر حسب الاستخدام</Label>
            <Textarea id="storeNote" name="storeNote" defaultValue={settings.storeNote ?? ""} rows={2} />
          </div>
        </div>
      </section>

      <section className="surface p-5">
        <h2 className="text-base">الشحن والدفع</h2>
        <div className="mt-4 space-y-3">
          <FormRow>
            <div>
              <Label htmlFor="shippingFlatFee">رسوم الشحن الافتراضية</Label>
              <Input id="shippingFlatFee" name="shippingFlatFee" type="number" step="0.01" min="0" defaultValue={settings.shippingFlatFee} />
              <FieldError message={state.fieldErrors?.shippingFlatFee} />
            </div>
            <div>
              <Label htmlFor="freeShippingThreshold">شحن مجاني بعد (اختياري)</Label>
              <Input id="freeShippingThreshold" name="freeShippingThreshold" type="number" step="0.01" min="0" defaultValue={settings.freeShippingThreshold ?? ""} />
            </div>
          </FormRow>
          <div className="grid gap-2 sm:grid-cols-2">
            <Checkbox name="codEnabled" label="الدفع نقدًا عند الاستلام" defaultChecked={settings.codEnabled} />
            <Checkbox name="pickupEnabled" label="الاستلام من المحل" defaultChecked={settings.pickupEnabled} />
          </div>
        </div>
      </section>

      <section className="surface p-5">
        <h2 className="text-base">إنستاباي</h2>
        <p className="mt-1 text-[11px] text-slate-500">
          بعد تفعيل إنستاباي تظهر بيانات التحويل للعميل. لا يُعتبر الطلب مدفوعًا حتى تراجع التحويل يدويًا من صفحة الطلب.
        </p>
        <div className="mt-4 space-y-3">
          <Checkbox
            name="instapayEnabled"
            label="تفعيل الدفع عبر إنستاباي"
            checked={instapayEnabled}
            onChange={(event) => setInstapayEnabled(event.target.checked)}
          />
          <FormRow>
            <div>
              <Label htmlFor="instapayHandle">معرّف إنستاباي / رقم المحفظة *</Label>
              <Input id="instapayHandle" name="instapayHandle" defaultValue={settings.instapayHandle ?? ""} dir="ltr" />
              <FieldError message={state.fieldErrors?.instapayHandle} />
            </div>
            <div>
              <Label htmlFor="instapayName">الاسم المسجل</Label>
              <Input id="instapayName" name="instapayName" defaultValue={settings.instapayName ?? ""} />
            </div>
          </FormRow>
          <div>
            <Label htmlFor="instapayInstructions">تعليمات التحويل</Label>
            <Textarea id="instapayInstructions" name="instapayInstructions" defaultValue={settings.instapayInstructions ?? ""} rows={3} />
          </div>
          {!instapayEnabled ? (
            <p className="text-[10px] text-amber-300">إنستاباي غير مُفعّل — لن يظهر كخيار دفع في صفحة إتمام الطلب.</p>
          ) : null}
        </div>
      </section>

      <section className="surface p-5">
        <h2 className="text-base">المخزون والضمان وSEO</h2>
        <div className="mt-4 space-y-3">
          <FormRow>
            <div>
              <Label htmlFor="lowStockThreshold">حد التنبيه الافتراضي للمخزون</Label>
              <Input id="lowStockThreshold" name="lowStockThreshold" type="number" min="0" defaultValue={settings.lowStockThreshold} />
            </div>
            <div>
              <Label htmlFor="defaultWarrantyMonths">الضمان الافتراضي (شهور)</Label>
              <Input id="defaultWarrantyMonths" name="defaultWarrantyMonths" type="number" min="0" max="120" defaultValue={settings.defaultWarrantyMonths} />
            </div>
          </FormRow>
          <div>
            <Label htmlFor="metaTitle">عنوان SEO</Label>
            <Input id="metaTitle" name="metaTitle" defaultValue={settings.metaTitle ?? ""} maxLength={160} />
          </div>
          <div>
            <Label htmlFor="metaDescription">وصف SEO</Label>
            <Textarea id="metaDescription" name="metaDescription" defaultValue={settings.metaDescription ?? ""} rows={3} maxLength={320} />
          </div>
        </div>
      </section>

      <div className="sticky bottom-4">
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {pending ? "جارٍ الحفظ…" : "حفظ إعدادات المتجر"}
        </Button>
      </div>
    </form>
  );
}
