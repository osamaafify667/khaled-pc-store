"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { getRequestMeta, requireAdmin } from "@/server/auth";
import { recordAudit } from "@/server/audit";
import {
  brandSchema,
  categorySchema,
  couponSchema,
  fieldErrors,
  settingsSchema,
  shippingZoneSchema,
} from "@/lib/validation";

export type CatalogState = { ok?: boolean; error?: string; message?: string; fieldErrors?: Record<string, string> };

function revalidateStore() {
  revalidatePath("/", "layout");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/brands");
}

export async function saveCategoryAction(_prev: CatalogState, formData: FormData): Promise<CatalogState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const parsed = categorySchema.safeParse({
    nameAr: formData.get("nameAr"),
    nameEn: formData.get("nameEn"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    icon: formData.get("icon") || undefined,
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") || undefined,
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), error: parsed.error.errors[0]?.message };

  const conflict = await prisma.category.findFirst({
    where: { slug: parsed.data.slug, ...(id ? { id: { not: id } } : {}) },
    select: { id: true },
  });
  if (conflict) return { fieldErrors: { slug: "هذا الرابط مستخدم لتصنيف آخر" }, error: "الرابط مستخدم بالفعل" };

  const data = {
    nameAr: parsed.data.nameAr,
    nameEn: parsed.data.nameEn,
    slug: parsed.data.slug,
    description: parsed.data.description ?? null,
    icon: parsed.data.icon ?? null,
    sortOrder: parsed.data.sortOrder,
    isActive: Boolean(parsed.data.isActive),
  };

  const category = id
    ? await prisma.category.update({ where: { id }, data })
    : await prisma.category.create({ data });

  await recordAudit(prisma, {
    userId: admin.id,
    action: id ? "CATEGORY_UPDATED" : "CATEGORY_CREATED",
    entity: "Category",
    entityId: category.id,
    details: { name: category.nameAr, slug: category.slug },
  });
  revalidateStore();
  return { ok: true, message: id ? "تم تحديث التصنيف" : "تم إنشاء التصنيف" };
}

export async function archiveCategoryAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const restore = formData.get("restore") === "1";
  if (!id) return;
  await prisma.category.update({ where: { id }, data: { isActive: restore } });
  await recordAudit(prisma, {
    userId: admin.id,
    action: restore ? "CATEGORY_RESTORED" : "CATEGORY_ARCHIVED",
    entity: "Category",
    entityId: id,
  });
  revalidateStore();
}

export async function saveBrandAction(_prev: CatalogState, formData: FormData): Promise<CatalogState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const parsed = brandSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    logoUrl: formData.get("logoUrl") || undefined,
    isActive: formData.get("isActive") || undefined,
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), error: parsed.error.errors[0]?.message };

  const conflict = await prisma.brand.findFirst({
    where: {
      OR: [{ slug: parsed.data.slug }, { name: parsed.data.name }],
      ...(id ? { id: { not: id } } : {}),
    },
    select: { id: true },
  });
  if (conflict) return { fieldErrors: { name: "اسم الشركة أو الرابط مستخدم بالفعل" }, error: "الشركة موجودة بالفعل" };

  const data = {
    name: parsed.data.name,
    slug: parsed.data.slug,
    logoUrl: parsed.data.logoUrl || null,
    isActive: Boolean(parsed.data.isActive),
  };
  const brand = id ? await prisma.brand.update({ where: { id }, data }) : await prisma.brand.create({ data });
  await recordAudit(prisma, {
    userId: admin.id,
    action: id ? "BRAND_UPDATED" : "BRAND_CREATED",
    entity: "Brand",
    entityId: brand.id,
  });
  revalidateStore();
  return { ok: true, message: id ? "تم تحديث الشركة" : "تم إنشاء الشركة" };
}

export async function archiveBrandAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const restore = formData.get("restore") === "1";
  if (!id) return;
  await prisma.brand.update({ where: { id }, data: { isActive: restore } });
  await recordAudit(prisma, {
    userId: admin.id,
    action: restore ? "BRAND_RESTORED" : "BRAND_ARCHIVED",
    entity: "Brand",
    entityId: id,
  });
  revalidateStore();
}

export async function saveCouponAction(_prev: CatalogState, formData: FormData): Promise<CatalogState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const parsed = couponSchema.safeParse({
    code: formData.get("code"),
    type: formData.get("type"),
    value: formData.get("value"),
    minSubtotal: formData.get("minSubtotal") ?? 0,
    maxUses: formData.get("maxUses") || "",
    startsAt: formData.get("startsAt") || undefined,
    endsAt: formData.get("endsAt") || undefined,
    isActive: formData.get("isActive") || undefined,
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), error: parsed.error.errors[0]?.message };

  const data = parsed.data;
  if (data.type === "PERCENT" && data.value > 100) {
    return { fieldErrors: { value: "نسبة الخصم لا يمكن أن تتجاوز 100%" }, error: "نسبة غير صحيحة" };
  }
  const startsAt = data.startsAt ? new Date(data.startsAt) : null;
  const endsAt = data.endsAt ? new Date(data.endsAt) : null;
  if (startsAt && Number.isNaN(startsAt.getTime())) return { error: "تاريخ البداية غير صحيح" };
  if (endsAt && Number.isNaN(endsAt.getTime())) return { error: "تاريخ النهاية غير صحيح" };
  if (startsAt && endsAt && endsAt < startsAt) return { error: "تاريخ النهاية يجب أن يكون بعد البداية" };

  const conflict = await prisma.coupon.findFirst({
    where: { code: data.code, ...(id ? { id: { not: id } } : {}) },
    select: { id: true },
  });
  if (conflict) return { fieldErrors: { code: "هذا الكود مستخدم" }, error: "كود الخصم موجود بالفعل" };

  const payload = {
    code: data.code,
    type: data.type,
    value: data.value,
    minSubtotal: data.minSubtotal,
    maxUses: typeof data.maxUses === "number" ? data.maxUses : null,
    startsAt,
    endsAt,
    isActive: Boolean(data.isActive),
  };

  const coupon = id
    ? await prisma.coupon.update({ where: { id }, data: payload })
    : await prisma.coupon.create({ data: payload });

  await recordAudit(prisma, {
    userId: admin.id,
    action: id ? "COUPON_UPDATED" : "COUPON_CREATED",
    entity: "Coupon",
    entityId: coupon.id,
    details: { code: coupon.code, value: Number(coupon.value), type: coupon.type },
  });
  revalidatePath("/admin/coupons");
  return { ok: true, message: id ? "تم تحديث الكوبون" : "تم إنشاء الكوبون" };
}

export async function saveShippingZoneAction(_prev: CatalogState, formData: FormData): Promise<CatalogState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const parsed = shippingZoneSchema.safeParse({
    governorate: formData.get("governorate"),
    fee: formData.get("fee"),
    codAvailable: formData.get("codAvailable") || undefined,
    estimatedDays: formData.get("estimatedDays") || undefined,
    isActive: formData.get("isActive") || undefined,
    sortOrder: formData.get("sortOrder") ?? 0,
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), error: parsed.error.errors[0]?.message };

  const existing = await prisma.shippingZone.findUnique({ where: { governorate: parsed.data.governorate } });
  if (existing && existing.id !== id) {
    return { fieldErrors: { governorate: "توجد منطقة شحن لهذه المحافظة بالفعل" }, error: "المحافظة مضافة بالفعل" };
  }

  const payload = {
    governorate: parsed.data.governorate,
    fee: parsed.data.fee,
    codAvailable: Boolean(parsed.data.codAvailable),
    estimatedDays: parsed.data.estimatedDays ?? null,
    isActive: Boolean(parsed.data.isActive),
    sortOrder: parsed.data.sortOrder,
  };
  const zone = existing
    ? await prisma.shippingZone.update({ where: { id: existing.id }, data: payload })
    : await prisma.shippingZone.create({ data: payload });

  await recordAudit(prisma, {
    userId: admin.id,
    action: existing ? "SHIPPING_ZONE_UPDATED" : "SHIPPING_ZONE_CREATED",
    entity: "ShippingZone",
    entityId: zone.id,
    details: { governorate: zone.governorate, fee: Number(zone.fee) },
  });
  revalidatePath("/admin/shipping");
  revalidatePath("/checkout");
  return { ok: true, message: "تم حفظ منطقة الشحن" };
}

export async function deleteShippingZoneAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.shippingZone.delete({ where: { id } });
  revalidatePath("/admin/shipping");
}

export async function saveSettingsAction(_prev: CatalogState, formData: FormData): Promise<CatalogState> {
  const admin = await requireAdmin();
  const parsed = settingsSchema.safeParse({
    storeNameAr: formData.get("storeNameAr"),
    storeNameEn: formData.get("storeNameEn"),
    tagline: formData.get("tagline") || undefined,
    storeNote: formData.get("storeNote") || undefined,
    phone: formData.get("phone") || undefined,
    whatsapp: formData.get("whatsapp") || undefined,
    email: formData.get("email") || "",
    addressLine: formData.get("addressLine"),
    workingHours: formData.get("workingHours") || undefined,
    mapUrl: formData.get("mapUrl") || "",
    instagramUrl: formData.get("instagramUrl") || "",
    facebookUrl: formData.get("facebookUrl") || "",
    announcement: formData.get("announcement") || undefined,
    instapayEnabled: formData.get("instapayEnabled") || undefined,
    instapayHandle: formData.get("instapayHandle") || undefined,
    instapayName: formData.get("instapayName") || undefined,
    instapayInstructions: formData.get("instapayInstructions") || undefined,
    codEnabled: formData.get("codEnabled") || undefined,
    pickupEnabled: formData.get("pickupEnabled") || undefined,
    shippingFlatFee: formData.get("shippingFlatFee") ?? 0,
    freeShippingThreshold: formData.get("freeShippingThreshold") || "",
    lowStockThreshold: formData.get("lowStockThreshold") ?? 3,
    defaultWarrantyMonths: formData.get("defaultWarrantyMonths") ?? 12,
    metaTitle: formData.get("metaTitle") || undefined,
    metaDescription: formData.get("metaDescription") || undefined,
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), error: parsed.error.errors[0]?.message };

  const d = parsed.data;
  if (d.instapayEnabled && !d.instapayHandle?.trim()) {
    return { fieldErrors: { instapayHandle: "أدخل بيانات إنستاباي قبل تفعيلها" }, error: "بيانات إنستاباي مطلوبة" };
  }

  await prisma.storeSettings.upsert({
    where: { id: 1 },
    update: {
      storeNameAr: d.storeNameAr,
      storeNameEn: d.storeNameEn,
      tagline: d.tagline ?? "",
      storeNote: d.storeNote ?? null,
      phone: d.phone ?? null,
      whatsapp: d.whatsapp ?? null,
      email: d.email || null,
      addressLine: d.addressLine,
      workingHours: d.workingHours ?? null,
      mapUrl: d.mapUrl || null,
      instagramUrl: d.instagramUrl || null,
      facebookUrl: d.facebookUrl || null,
      announcement: d.announcement ?? null,
      instapayEnabled: Boolean(d.instapayEnabled),
      instapayHandle: d.instapayHandle?.trim() || null,
      instapayName: d.instapayName?.trim() || null,
      instapayInstructions: d.instapayInstructions?.trim() || null,
      codEnabled: Boolean(d.codEnabled),
      pickupEnabled: Boolean(d.pickupEnabled),
      shippingFlatFee: d.shippingFlatFee,
      freeShippingThreshold:
        typeof d.freeShippingThreshold === "number" ? d.freeShippingThreshold : null,
      lowStockThreshold: d.lowStockThreshold,
      defaultWarrantyMonths: d.defaultWarrantyMonths,
      metaTitle: d.metaTitle ?? null,
      metaDescription: d.metaDescription ?? null,
    },
    create: { id: 1 },
  });

  await recordAudit(prisma, {
    userId: admin.id,
    action: "SETTINGS_UPDATED",
    entity: "StoreSettings",
    entityId: "1",
    ip: (await getRequestMeta()).ip,
  });
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  return { ok: true, message: "تم حفظ إعدادات المتجر" };
}
