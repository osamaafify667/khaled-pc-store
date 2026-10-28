"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ImagePlus, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { createProductAction, updateProductAction, type AdminProductState } from "@/actions/admin/products";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox, FieldError, FormRow, Input, Label, Select, Textarea } from "@/components/ui/field";
import { formatPrice } from "@/lib/utils";

type SpecRow = {
  key: string;
  label: string;
  value: string;
  numericValue?: number | "";
  unit?: string;
  dataType: "TEXT" | "NUMBER" | "BOOLEAN";
  group?: string;
  sortOrder: number;
};

type ProductImageInput = { id: string; url: string; alt: string | null; sortOrder: number };

export type ProductFormValues = {
  id?: string;
  nameAr: string;
  nameEn: string | null;
  sku: string;
  slug: string;
  model: string | null;
  categoryId: string;
  brandId: string | null;
  descriptionAr: string | null;
  price: string;
  compareAtPrice: string;
  warrantyMonths: number;
  status: string;
  type: string;
  isFeatured: boolean;
  hasBox: boolean;
  quantity: number;
  lowStockThreshold: number;
  metaTitle: string | null;
  metaDescription: string | null;
  specs: SpecRow[];
  images: ProductImageInput[];
};

const SPEC_PRESETS: Record<string, Array<{ key: string; label: string; dataType: SpecRow["dataType"]; unit?: string; group: string }>> = {
  cpu: [
    { key: "socket", label: "المقبس", dataType: "TEXT", group: "التوافق" },
    { key: "chipsetSupport", label: "الشرائح المدعومة", dataType: "TEXT", group: "التوافق" },
    { key: "cpuFamily", label: "عائلة المعالج", dataType: "TEXT", group: "التوافق" },
    { key: "tdp", label: "استهلاك الطاقة", dataType: "NUMBER", unit: "W", group: "الطاقة" },
    { key: "integratedGraphics", label: "كارت شاشة مدمج", dataType: "BOOLEAN", group: "التوافق" },
    { key: "minBiosVersion", label: "أقل إصدار BIOS", dataType: "TEXT", group: "التوافق" },
  ],
  motherboards: [
    { key: "socket", label: "المقبس", dataType: "TEXT", group: "التوافق" },
    { key: "chipset", label: "الشريحة", dataType: "TEXT", group: "التوافق" },
    { key: "formFactor", label: "حجم اللوحة", dataType: "TEXT", group: "الأبعاد" },
    { key: "ramType", label: "نوع الرامات", dataType: "TEXT", group: "الذاكرة" },
    { key: "ramSlots", label: "عدد فتحات الرام", dataType: "NUMBER", group: "الذاكرة" },
    { key: "maxRamCapacity", label: "أقصى سعة رام", dataType: "NUMBER", unit: "GB", group: "الذاكرة" },
    { key: "maxRamSpeed", label: "أقصى سرعة رام", dataType: "NUMBER", unit: "MHz", group: "الذاكرة" },
    { key: "m2Slots", label: "فتحات M.2", dataType: "NUMBER", group: "التخزين" },
    { key: "sataPorts", label: "منافذ SATA", dataType: "NUMBER", group: "التخزين" },
    { key: "biosVersion", label: "إصدار BIOS", dataType: "TEXT", group: "التوافق" },
    { key: "biosSupportsCpuFamilies", label: "عائلات المعالجات المدعومة", dataType: "TEXT", group: "التوافق" },
  ],
  ram: [
    { key: "ramType", label: "نوع الرام", dataType: "TEXT", group: "الذاكرة" },
    { key: "capacityGB", label: "السعة", dataType: "NUMBER", unit: "GB", group: "الذاكرة" },
    { key: "modules", label: "عدد الوحدات", dataType: "NUMBER", group: "الذاكرة" },
    { key: "speed", label: "السرعة", dataType: "NUMBER", unit: "MHz", group: "الذاكرة" },
    { key: "formFactor", label: "الشكل", dataType: "TEXT", group: "الذاكرة" },
  ],
  gpu: [
    { key: "lengthMm", label: "طول الكارت", dataType: "NUMBER", unit: "mm", group: "الأبعاد" },
    { key: "thicknessSlots", label: "سماكة الكارت", dataType: "NUMBER", unit: "slot", group: "الأبعاد" },
    { key: "tdp", label: "استهلاك الطاقة", dataType: "NUMBER", unit: "W", group: "الطاقة" },
    { key: "recommendedPsu", label: "الباور الموصى به", dataType: "NUMBER", unit: "W", group: "الطاقة" },
    { key: "powerConnectors", label: "موصلات الطاقة", dataType: "TEXT", group: "الطاقة" },
  ],
  psu: [
    { key: "wattage", label: "القدرة", dataType: "NUMBER", unit: "W", group: "الطاقة" },
    { key: "formFactor", label: "الحجم", dataType: "TEXT", group: "الأبعاد" },
    { key: "lengthMm", label: "الطول", dataType: "NUMBER", unit: "mm", group: "الأبعاد" },
    { key: "pcie8pin", label: "موصلات PCIe 8-pin", dataType: "NUMBER", group: "الموصلات" },
    { key: "pcie6pin", label: "موصلات PCIe 6-pin", dataType: "NUMBER", group: "الموصلات" },
    { key: "pcie12vhpwr", label: "موصل 12VHPWR", dataType: "NUMBER", group: "الموصلات" },
    { key: "cpu8pin", label: "موصلات CPU 8-pin", dataType: "NUMBER", group: "الموصلات" },
  ],
  cases: [
    { key: "supportedFormFactors", label: "أحجام اللوحات المدعومة", dataType: "TEXT", group: "التوافق" },
    { key: "maxGpuLengthMm", label: "أقصى طول كارت شاشة", dataType: "NUMBER", unit: "mm", group: "الأبعاد" },
    { key: "maxGpuThicknessSlots", label: "أقصى سماكة كارت", dataType: "NUMBER", unit: "slot", group: "الأبعاد" },
    { key: "maxCoolerHeightMm", label: "أقصى ارتفاع مبرد", dataType: "NUMBER", unit: "mm", group: "الأبعاد" },
    { key: "radiatorSupportMm", label: "مقاسات الرادياتير", dataType: "TEXT", group: "التبريد" },
    { key: "maxPsuLengthMm", label: "أقصى طول باور", dataType: "NUMBER", unit: "mm", group: "الأبعاد" },
    { key: "supportedPsuFormFactors", label: "أحجام الباور المدعومة", dataType: "TEXT", group: "التوافق" },
    { key: "driveBays35", label: "أماكن 3.5 بوصة", dataType: "NUMBER", group: "التخزين" },
    { key: "driveBays25", label: "أماكن 2.5 بوصة", dataType: "NUMBER", group: "التخزين" },
  ],
  cooling: [
    { key: "coolerType", label: "نوع التبريد", dataType: "TEXT", group: "التبريد" },
    { key: "heightMm", label: "الارتفاع", dataType: "NUMBER", unit: "mm", group: "الأبعاد" },
    { key: "radiatorSizeMm", label: "مقاس الرادياتير", dataType: "NUMBER", unit: "mm", group: "التبريد" },
    { key: "socketSupport", label: "المقابس المدعومة", dataType: "TEXT", group: "التوافق" },
  ],
  storage: [
    { key: "interface", label: "الواجهة", dataType: "TEXT", group: "التخزين" },
    { key: "formFactor", label: "الشكل", dataType: "TEXT", group: "التخزين" },
    { key: "capacityGB", label: "السعة", dataType: "NUMBER", unit: "GB", group: "التخزين" },
  ],
  monitors: [{ key: "screenSize", label: "مقاس الشاشة", dataType: "TEXT", group: "الشاشة" }],
  "prebuilt-pc": [
    { key: "cpu", label: "المعالج", dataType: "TEXT", group: "مكونات التجميعة" },
    { key: "gpu", label: "كارت الشاشة", dataType: "TEXT", group: "مكونات التجميعة" },
    { key: "ram", label: "الرامات", dataType: "TEXT", group: "مكونات التجميعة" },
    { key: "storage", label: "وحدة التخزين", dataType: "TEXT", group: "مكونات التجميعة" },
    { key: "psu", label: "مزود الطاقة", dataType: "TEXT", group: "مكونات التجميعة" },
    { key: "case", label: "الكيسة", dataType: "TEXT", group: "مكونات التجميعة" },
  ],
};

const SPEC_HELP: Record<string, string> = {
  cpu: "مواصفات المقبس والشرائح مطلوبة لفحص توافق المعالج مع اللوحة الأم. استخدم قيمًا موحدة مثل AM5 أو LGA1700.",
  motherboards: "أدخل المقبس والشريحة ونوع الرام وعدد الفتحات. هذه القيم تُستخدم في فحص التوافق.",
  ram: "نوع الرام (DDR4/DDR5) والسعة وعدد الوحدات تُستخدم لمطابقة اللوحة الأم.",
  gpu: "أدخل طول الكارت وسماكته واستهلاك الطاقة وموصلات الطاقة لفحص الكيسة والباور.",
  psu: "أدخل القدرة والموصلات بدقة. الفحص يعتمد على هذه القيم وليس على الاسم التجاري.",
  cases: "أدخل أقصى أطوال الكارت والمبرد وأحجام اللوحات المدعومة.",
  cooling: "أدخل نوع المبرد وارتفاعه والمقابس المدعومة، أو مقاس الرادياتير للمبرد المائي.",
  storage: "أدخل الواجهة (NVMe/SATA) والشكل (M.2/2.5/3.5) لفحص المنافذ والأماكن.",
};

function emptySpec(): SpecRow {
  return { key: "", label: "", value: "", numericValue: "", unit: "", dataType: "TEXT", group: "المواصفات الفنية", sortOrder: 0 };
}

export function ProductForm({
  product,
  categories,
  brands,
  mode,
}: {
  product?: ProductFormValues;
  categories: Array<{ id: string; nameAr: string; slug: string }>;
  brands: Array<{ id: string; name: string }>;
  mode: "create" | "edit";
}) {
  const action = mode === "create" ? createProductAction : updateProductAction;
  const [state, formAction, pending] = useActionState<AdminProductState, FormData>(action, {});
  const [specs, setSpecs] = useState<SpecRow[]>(product?.specs ?? []);
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? "");

  const categorySlug = useMemo(
    () => categories.find((category) => category.id === categoryId)?.slug ?? "",
    [categories, categoryId],
  );
  const presets = SPEC_PRESETS[categorySlug] ?? [];
  const help = SPEC_HELP[categorySlug];

  const remainingImages = (product?.images ?? []).filter((image) => !removedImages.includes(image.id));
  const existingImagesJson = JSON.stringify(
    remainingImages.map((image, index) => ({ id: image.id, sortOrder: index })),
  );

  function updateSpec(index: number, patch: Partial<SpecRow>) {
    setSpecs((current) => current.map((spec, i) => (i === index ? { ...spec, ...patch } : spec)));
  }

  function addPreset(preset: (typeof presets)[number]) {
    setSpecs((current) => {
      if (current.some((spec) => spec.key === preset.key)) return current;
      return [
        ...current,
        {
          key: preset.key,
          label: preset.label,
          value: "",
          numericValue: "",
          unit: preset.unit ?? "",
          dataType: preset.dataType,
          group: preset.group,
          sortOrder: current.length,
        },
      ];
    });
  }

  return (
    <form action={formAction} className="space-y-5">
      {product?.id ? <input type="hidden" name="productId" value={product.id} /> : null}
      <input type="hidden" name="specsJson" value={JSON.stringify(specs)} />
      <input type="hidden" name="existingImages" value={existingImagesJson} />

      {state.ok ? <Alert tone="success">{state.message}</Alert> : null}
      {state.error && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}
      {state.fieldErrors && Object.keys(state.fieldErrors).length > 0 ? (
        <Alert tone="warning" title="راجع الحقول التالية">
          {Object.entries(state.fieldErrors)
            .slice(0, 4)
            .map(([key, message]) => `${key}: ${message}`)
            .join(" | ")}
        </Alert>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-5">
          <section className="surface p-5">
            <h2 className="text-base">البيانات الأساسية</h2>
            <div className="mt-4 space-y-4">
              <FormRow>
                <div>
                  <Label htmlFor="nameAr">اسم المنتج بالعربية *</Label>
                  <Input id="nameAr" name="nameAr" defaultValue={product?.nameAr ?? ""} required maxLength={200} />
                  <FieldError message={state.fieldErrors?.nameAr} />
                </div>
                <div>
                  <Label htmlFor="nameEn">الاسم بالإنجليزية</Label>
                  <Input id="nameEn" name="nameEn" defaultValue={product?.nameEn ?? ""} dir="ltr" maxLength={200} />
                  <FieldError message={state.fieldErrors?.nameEn} />
                </div>
              </FormRow>
              <FormRow>
                <div>
                  <Label htmlFor="sku">كود المنتج SKU *</Label>
                  <Input id="sku" name="sku" defaultValue={product?.sku ?? ""} required dir="ltr" maxLength={60} />
                  <FieldError message={state.fieldErrors?.sku} />
                </div>
                <div>
                  <Label htmlFor="slug" hint="اختياري — يُولَّد تلقائيًا">
                    رابط المنتج
                  </Label>
                  <Input id="slug" name="slug" defaultValue={product?.slug ?? ""} dir="ltr" maxLength={200} />
                  <FieldError message={state.fieldErrors?.slug} />
                </div>
              </FormRow>
              <FormRow>
                <div>
                  <Label htmlFor="categoryId">التصنيف *</Label>
                  <Select
                    id="categoryId"
                    name="categoryId"
                    value={categoryId}
                    onChange={(event) => setCategoryId(event.target.value)}
                    required
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.nameAr}
                      </option>
                    ))}
                  </Select>
                  <FieldError message={state.fieldErrors?.categoryId} />
                </div>
                <div>
                  <Label htmlFor="brandId">الشركة</Label>
                  <Select id="brandId" name="brandId" defaultValue={product?.brandId ?? ""}>
                    <option value="">بدون شركة</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </Select>
                  <FieldError message={state.fieldErrors?.brandId} />
                </div>
              </FormRow>
              <div>
                <Label htmlFor="model">الموديل</Label>
                <Input id="model" name="model" defaultValue={product?.model ?? ""} dir="ltr" maxLength={100} />
                <FieldError message={state.fieldErrors?.model} />
              </div>
              <div>
                <Label htmlFor="descriptionAr">الوصف</Label>
                <Textarea id="descriptionAr" name="descriptionAr" defaultValue={product?.descriptionAr ?? ""} rows={5} maxLength={5000} />
                <FieldError message={state.fieldErrors?.descriptionAr} />
              </div>
              <div>
                <Label>الكرتونة *</Label>
                <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-ink-900/60 p-3 text-sm text-slate-300 transition has-[:checked]:border-accent/50 has-[:checked]:bg-accent/5 has-[:checked]:text-white">
                    <input
                      type="radio"
                      name="hasBox"
                      value="true"
                      required
                      defaultChecked={product?.hasBox ?? true}
                      className="mt-0.5 h-4 w-4 accent-[#2ee6a8]"
                    />
                    <span>
                      <span className="block font-bold">بالكرتونة الأصلية</span>
                      <span className="mt-0.5 block text-[10px] text-slate-500">تُسلَّم مع علبة المنتج الأصلية.</span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-ink-900/60 p-3 text-sm text-slate-300 transition has-[:checked]:border-amber-500/50 has-[:checked]:bg-amber-500/5 has-[:checked]:text-white">
                    <input
                      type="radio"
                      name="hasBox"
                      value="false"
                      required
                      defaultChecked={product ? !product.hasBox : false}
                      className="mt-0.5 h-4 w-4 accent-[#f59e0b]"
                    />
                    <span>
                      <span className="block font-bold">بدون كرتونة</span>
                      <span className="mt-0.5 block text-[10px] text-slate-500">يُسلَّم المنتج بدون العلبة الأصلية.</span>
                    </span>
                  </label>
                </div>
                <FieldError message={state.fieldErrors?.hasBox} />
              </div>
            </div>
          </section>

          <section className="surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-base">الأسعار والضمان</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">الأسعار بالجنيه المصري وتُحسب على السيرفر عند الشراء.</p>
              </div>
            </div>
            <div className="mt-4 space-y-4">
              <FormRow>
                <div>
                  <Label htmlFor="price">السعر (ج.م) *</Label>
                  <Input id="price" name="price" type="number" step="0.01" min="0" defaultValue={product?.price ?? ""} required />
                  <FieldError message={state.fieldErrors?.price} />
                </div>
                <div>
                  <Label htmlFor="compareAtPrice" hint="لإظهار خصم">
                    السعر قبل الخصم
                  </Label>
                  <Input
                    id="compareAtPrice"
                    name="compareAtPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={product?.compareAtPrice ?? ""}
                  />
                  <FieldError message={state.fieldErrors?.compareAtPrice} />
                </div>
              </FormRow>
              <FormRow>
                <div>
                  <Label htmlFor="warrantyMonths">الضمان (شهور)</Label>
                  <Input id="warrantyMonths" name="warrantyMonths" type="number" min="0" max="120" defaultValue={product?.warrantyMonths ?? 12} />
                  <FieldError message={state.fieldErrors?.warrantyMonths} />
                </div>
                <div>
                  <Label htmlFor="status">حالة النشر</Label>
                  <Select id="status" name="status" defaultValue={product?.status ?? "DRAFT"}>
                    <option value="DRAFT">مسودة</option>
                    <option value="ACTIVE">منشور</option>
                    <option value="ARCHIVED">مؤرشف</option>
                  </Select>
                  <FieldError message={state.fieldErrors?.status} />
                </div>
              </FormRow>
              <FormRow>
                <div>
                  <Label htmlFor="type">نوع المنتج</Label>
                  <Select id="type" name="type" defaultValue={product?.type ?? "COMPONENT"}>
                    <option value="COMPONENT">قطعة / مكوّن</option>
                    <option value="PREBUILT">تجميعة جاهزة</option>
                  </Select>
                  <FieldError message={state.fieldErrors?.type} />
                </div>
                <div>
                  <Label htmlFor="quantity">الكمية المتاحة في المخزون</Label>
                  <Input id="quantity" name="quantity" type="number" min="0" defaultValue={product?.quantity ?? 0} />
                  <FieldError message={state.fieldErrors?.quantity} />
                  {mode === "edit" ? (
                    <p className="mt-1 text-[10px] text-amber-300">
                      تعديل الكمية هنا يُسجَّل كحركة مخزون مع سبب تلقائي. استخدم صفحة المخزون لسبب مخصص.
                    </p>
                  ) : null}
                </div>
              </FormRow>
              <FormRow>
                <div>
                  <Label htmlFor="lowStockThreshold">حد التنبيه للمخزون</Label>
                  <Input
                    id="lowStockThreshold"
                    name="lowStockThreshold"
                    type="number"
                    min="0"
                    defaultValue={product?.lowStockThreshold ?? 3}
                  />
                  <FieldError message={state.fieldErrors?.lowStockThreshold} />
                </div>
                <div className="flex items-end pb-2">
                  <Checkbox name="isFeatured" label="إظهار في المختارات المميزة بالصفحة الرئيسية" defaultChecked={product?.isFeatured ?? false} />
                </div>
              </FormRow>
            </div>
          </section>

          <section className="surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-base">المواصفات الفنية *</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">مطلوبة — مواصفة واحدة على الأقل. تُستخدم في عرض المنتج وفي فحص توافق التجميعات.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setSpecs((current) => [...current, emptySpec()])}>
                <Plus className="h-3.5 w-3.5" />
                مواصفة مخصصة
              </Button>
            </div>

            {help ? (
              <div className="mt-3 flex gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] leading-6 text-amber-200/90">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {help}
              </div>
            ) : null}

            {presets.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {presets.map((preset) => {
                  const used = specs.some((spec) => spec.key === preset.key);
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      disabled={used}
                      onClick={() => addPreset(preset)}
                      className="rounded-lg border border-line bg-ink-900/60 px-2 py-1 text-[10px] font-bold text-slate-300 transition hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      + {preset.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              {specs.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-xs text-slate-500">
                  لا توجد مواصفات. أضف مواصفة من الاقتراحات أعلاه أو مواصفة مخصصة.
                </p>
              ) : null}

              {specs.map((spec, index) => (
                <div key={`${spec.key}-${index}`} className="rounded-xl border border-line bg-ink-900/40 p-3">
                  <div className="grid gap-2 sm:grid-cols-12">
                    <div className="sm:col-span-3">
                      <Label htmlFor={`spec-key-${index}`}>المفتاح</Label>
                      <Input
                        id={`spec-key-${index}`}
                        value={spec.key}
                        onChange={(event) => updateSpec(index, { key: event.target.value })}
                        dir="ltr"
                        placeholder="socket"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Label htmlFor={`spec-label-${index}`}>الاسم الظاهر</Label>
                      <Input
                        id={`spec-label-${index}`}
                        value={spec.label}
                        onChange={(event) => updateSpec(index, { label: event.target.value })}
                        placeholder="المقبس"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <Label htmlFor={`spec-value-${index}`}>القيمة</Label>
                      <Input
                        id={`spec-value-${index}`}
                        value={spec.value}
                        onChange={(event) => updateSpec(index, { value: event.target.value })}
                        placeholder="AM5"
                      />
                    </div>
                    <div className="flex items-end justify-end sm:col-span-2">
                      <button
                        type="button"
                        onClick={() => setSpecs((current) => current.filter((_, i) => i !== index))}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-slate-400 transition hover:border-rose-500/40 hover:text-rose-300"
                        aria-label="حذف المواصفة"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-4">
                    <div>
                      <Label htmlFor={`spec-type-${index}`}>النوع</Label>
                      <Select
                        id={`spec-type-${index}`}
                        value={spec.dataType}
                        onChange={(event) => updateSpec(index, { dataType: event.target.value as SpecRow["dataType"] })}
                      >
                        <option value="TEXT">نص</option>
                        <option value="NUMBER">رقم</option>
                        <option value="BOOLEAN">نعم/لا</option>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor={`spec-numeric-${index}`}>القيمة الرقمية</Label>
                      <Input
                        id={`spec-numeric-${index}`}
                        type="number"
                        step="0.001"
                        value={spec.numericValue ?? ""}
                        onChange={(event) => updateSpec(index, { numericValue: event.target.value === "" ? "" : Number(event.target.value) })}
                        disabled={spec.dataType !== "NUMBER"}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`spec-unit-${index}`}>الوحدة</Label>
                      <Input
                        id={`spec-unit-${index}`}
                        value={spec.unit ?? ""}
                        onChange={(event) => updateSpec(index, { unit: event.target.value })}
                        placeholder="mm"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`spec-group-${index}`}>المجموعة</Label>
                      <Input
                        id={`spec-group-${index}`}
                        value={spec.group ?? ""}
                        onChange={(event) => updateSpec(index, { group: event.target.value })}
                        placeholder="الأبعاد"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="surface p-5">
            <h2 className="text-base">الصور *</h2>
            <p className="mt-1 text-[11px] text-slate-500">مطلوبة — صورة واحدة على الأقل. JPG أو PNG أو WebP أو AVIF، بحد أقصى 5MB لكل صورة.</p>

            {remainingImages.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {remainingImages.map((image) => (
                  <div key={image.id} className="group relative overflow-hidden rounded-xl border border-line bg-ink-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt={image.alt ?? product?.nameAr ?? "صورة المنتج"} className="aspect-square w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setRemovedImages((current) => [...current, image.id])}
                      className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-lg bg-ink-950/80 text-rose-300 opacity-0 transition group-hover:opacity-100"
                      aria-label="إزالة الصورة"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-line px-3 py-6 text-center text-[11px] text-slate-500">
                لا توجد صور. أضف صورة واحدة على الأقل — الصور مطلوبة لحفظ المنتج.
              </p>
            )}

            {removedImages.length > 0 ? (
              <p className="mt-2 text-[10px] text-rose-300">{removedImages.length} صورة سيتم حذفها عند الحفظ.</p>
            ) : null}

            <label className="mt-3 flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-ink-900/60 px-4 py-5 text-center text-xs text-slate-400 transition hover:border-accent/40">
              <ImagePlus className="h-5 w-5 text-accent" />
              <span>اختيار صور جديدة (حتى 8 صور)</span>
              <input
                type="file"
                name="images"
                multiple
                required={mode === "create" && remainingImages.length === 0}
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="sr-only"
              />
            </label>
            <FieldError message={state.fieldErrors?.images} />
          </section>

          <section className="surface p-5">
            <h2 className="text-base">تحسين محركات البحث</h2>
            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="metaTitle">عنوان SEO</Label>
                <Input id="metaTitle" name="metaTitle" defaultValue={product?.metaTitle ?? ""} maxLength={160} />
                <FieldError message={state.fieldErrors?.metaTitle} />
              </div>
              <div>
                <Label htmlFor="metaDescription">وصف SEO</Label>
                <Textarea id="metaDescription" name="metaDescription" defaultValue={product?.metaDescription ?? ""} rows={3} maxLength={320} />
                <FieldError message={state.fieldErrors?.metaDescription} />
              </div>
            </div>
          </section>

          {product?.id ? (
            <section className="surface p-5 text-xs text-slate-400">
              <p className="text-sm font-bold text-white">ملخص سريع</p>
              <p className="mt-2">السعر الحالي: {formatPrice(product.price)}</p>
              <p className="mt-1">SKU: <span dir="ltr">{product.sku}</span></p>
              <Link href={`/product/${product.slug}`} target="_blank" className="mt-3 inline-flex font-bold text-accent hover:underline">
                عرض المنتج في المتجر
              </Link>
            </section>
          ) : null}

          <div className="sticky bottom-4">
            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {pending ? "جارٍ الحفظ…" : mode === "create" ? "إنشاء المنتج" : "حفظ التعديلات"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
