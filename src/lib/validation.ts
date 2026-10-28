import { z } from "zod";
import { EGYPT_GOVERNORATES } from "./constants";
import { isValidEgyptianPhone, normalizeEgyptianPhone } from "./phone";

const phoneSchema = z
  .string({ required_error: "رقم الهاتف مطلوب" })
  .min(8, "رقم الهاتف غير صحيح")
  .transform((value) => normalizeEgyptianPhone(value))
  .refine(isValidEgyptianPhone, "أدخل رقم هاتف مصري صحيح (مثال: 01012345678)");

const optionalText = (max: number, message = "النص طويل جدًا") =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((v) => (v ? v : undefined));

export const governorateSchema = z.enum(EGYPT_GOVERNORATES, {
  errorMap: () => ({ message: "اختر محافظة صحيحة" }),
});

export const checkoutSchema = z
  .object({
    fullName: z.string().trim().min(3, "الاسم الكامل مطلوب (3 أحرف على الأقل)").max(80),
    phone: phoneSchema,
    email: z.union([z.string().trim().email("البريد الإلكتروني غير صحيح"), z.literal("")]).optional(),
    fulfillmentType: z.enum(["DELIVERY", "PICKUP"]),
    paymentMethod: z.enum(["CASH_ON_DELIVERY", "PICKUP_CASH", "INSTAPAY"]),
    governorate: z.string().trim().optional(),
    city: optionalText(80),
    area: optionalText(80),
    street: optionalText(160),
    building: optionalText(80),
    addressNotes: optionalText(300),
    notes: optionalText(1000),
    acceptTerms: z.union([z.literal("on"), z.literal("true"), z.literal("1")], {
      errorMap: () => ({ message: "يجب الموافقة على الشروط والأحكام" }),
    }),
    saveAddress: z.union([z.literal("on"), z.literal("true"), z.literal("1")]).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.fulfillmentType === "DELIVERY") {
      if (!data.governorate || data.governorate.length < 2) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["governorate"], message: "المحافظة مطلوبة للتوصيل" });
      }
      if (!data.city) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["city"], message: "المدينة أو المركز مطلوب" });
      }
      if (!data.street) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["street"], message: "العنوان التفصيلي مطلوب" });
      }
      if (data.paymentMethod === "PICKUP_CASH") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["paymentMethod"], message: "الدفع عند الاستلام من المحل متاح مع الاستلام فقط" });
      }
    } else {
      if (data.paymentMethod === "CASH_ON_DELIVERY") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["paymentMethod"], message: "الدفع عند الاستلام متاح مع التوصيل فقط" });
      }
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const addressSchema = z.object({
  label: optionalText(40),
  recipient: z.string().trim().min(3, "اسم المستلم مطلوب").max(80),
  phone: phoneSchema,
  governorate: governorateSchema,
  city: z.string().trim().min(2, "المدينة مطلوبة").max(80),
  area: optionalText(80),
  street: z.string().trim().min(3, "العنوان مطلوب").max(200),
  building: optionalText(80),
  notes: optionalText(300),
  isDefault: z.union([z.literal("on"), z.literal("true"), z.literal("1")]).optional(),
});

export const profileSchema = z.object({
  name: z.string().trim().min(3, "الاسم مطلوب").max(80),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? normalizeEgyptianPhone(v) : undefined))
    .refine((v) => !v || isValidEgyptianPhone(v), "أدخل رقم هاتف مصري صحيح"),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "كلمة المرور الحالية مطلوبة"),
    newPassword: z
      .string()
      .min(8, "كلمة المرور يجب أن تتكون من 8 أحرف على الأقل")
      .max(100)
      .regex(/[A-Za-z]/, "يجب أن تحتوي كلمة المرور على حرف واحد على الأقل")
      .regex(/\d/, "يجب أن تحتوي كلمة المرور على رقم واحد على الأقل"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "كلمتا المرور غير متطابقتين",
  });

export const cartAddSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1, "الكمية يجب أن تكون 1 على الأقل").max(10),
});

export const cartUpdateSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(10),
});

const specInputSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, "مفتاح المواصفة مطلوب")
    .max(60)
    .regex(/^[a-zA-Z0-9_]+$/, "المفتاح يجب أن يكون بالإنجليزية بدون مسافات"),
  label: z.string().trim().min(1, "اسم المواصفة مطلوب").max(80),
  value: z.string().trim().min(1, "قيمة المواصفة مطلوبة").max(300),
  numericValue: z.union([z.coerce.number(), z.literal("")]).optional(),
  unit: optionalText(20),
  dataType: z.enum(["TEXT", "NUMBER", "BOOLEAN"]).default("TEXT"),
  group: optionalText(60),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export const productSchema = z.object({
  nameAr: z.string().trim().min(2, "اسم المنتج مطلوب").max(200),
  nameEn: optionalText(200),
  sku: z
    .string()
    .trim()
    .min(2, "كود المنتج مطلوب (SKU)")
    .max(60)
    .regex(/^[A-Za-z0-9._-]+$/, "SKU يمكن أن يحتوي على حروف وأرقام و - _ . فقط"),
  slug: z
    .string()
    .trim()
    .max(200)
    .regex(/^[a-z0-9-]*$/, "الرابط يمكن أن يحتوي على حروف إنجليزية صغيرة وأرقام و - فقط")
    .optional(),
  model: optionalText(100),
  categoryId: z.string().min(1, "التصنيف مطلوب"),
  brandId: optionalText(60),
  descriptionAr: optionalText(5000),
  price: z.coerce.number().gt(0, "السعر مطلوب ويجب أن يكون أكبر من صفر").max(10_000_000),
  compareAtPrice: z.union([z.coerce.number().min(0).max(10_000_000), z.literal("")]).optional(),
  warrantyMonths: z.coerce.number().int().min(0).max(120),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  type: z.enum(["COMPONENT", "PREBUILT"]),
  isFeatured: z.union([z.literal("on"), z.literal("true"), z.literal("1")]).optional(),
  hasBox: z.boolean().default(true),
  quantity: z.coerce.number().int().min(0, "الكمية لا يمكن أن تكون سالبة").max(1_000_000),
  lowStockThreshold: z.coerce.number().int().min(0).max(10_000).default(3),
  metaTitle: optionalText(160),
  metaDescription: optionalText(320),
  specs: z.array(specInputSchema).max(120).default([]),
});

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1),
  mode: z.enum(["ADD", "REMOVE", "SET"]),
  quantity: z.coerce.number().int().min(1, "أدخل كمية صحيحة").max(100_000),
  reason: z.string().trim().min(3, "سبب التعديل مطلوب").max(200),
});

export const orderTransitionSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
  note: optionalText(500),
  trackingNumber: optionalText(100),
  carrier: optionalText(80),
  collectCash: z.union([z.literal("on"), z.literal("true"), z.literal("1")]).optional(),
  cancelReason: optionalText(300),
});

export const paymentReviewSchema = z.object({
  paymentId: z.string().min(1),
  decision: z.enum(["APPROVE", "REJECT"]),
  reason: optionalText(300),
});

export const instapaySubmissionSchema = z.object({
  orderNumber: z.string().min(3),
  accessToken: z.string().min(8),
  reference: z.string().trim().min(4, "أدخل مرجع التحويل الظاهر في تطبيق إنستاباي").max(80),
});

export const couponSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, "كود الكوبون مطلوب")
    .max(40)
    .regex(/^[A-Z0-9_-]+$/, "الكود بالحروف الإنجليزية والأرقام فقط"),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.coerce.number().min(1, "قيمة الخصم مطلوبة").max(1_000_000),
  minSubtotal: z.coerce.number().min(0).max(10_000_000).default(0),
  maxUses: z.union([z.coerce.number().int().min(1).max(1_000_000), z.literal("")]).optional(),
  startsAt: optionalText(40),
  endsAt: optionalText(40),
  isActive: z.union([z.literal("on"), z.literal("true"), z.literal("1")]).optional(),
});

export const settingsSchema = z.object({
  storeNameAr: z.string().trim().min(2).max(120),
  storeNameEn: z.string().trim().min(2).max(120),
  tagline: z.string().trim().max(160).optional(),
  storeNote: optionalText(400),
  phone: optionalText(30),
  whatsapp: optionalText(30),
  email: z.union([z.string().trim().email("البريد غير صحيح"), z.literal("")]).optional(),
  addressLine: z.string().trim().min(3).max(200),
  workingHours: optionalText(120),
  mapUrl: z.union([z.string().trim().url("رابط الخريطة غير صحيح"), z.literal("")]).optional(),
  instagramUrl: z.union([z.string().trim().url("الرابط غير صحيح"), z.literal("")]).optional(),
  facebookUrl: z.union([z.string().trim().url("الرابط غير صحيح"), z.literal("")]).optional(),
  announcement: optionalText(200),
  instapayEnabled: z.union([z.literal("on"), z.literal("true"), z.literal("1")]).optional(),
  instapayHandle: optionalText(120),
  instapayName: optionalText(120),
  instapayInstructions: optionalText(1000),
  codEnabled: z.union([z.literal("on"), z.literal("true"), z.literal("1")]).optional(),
  pickupEnabled: z.union([z.literal("on"), z.literal("true"), z.literal("1")]).optional(),
  shippingFlatFee: z.coerce.number().min(0).max(10_000),
  freeShippingThreshold: z.union([z.coerce.number().min(0).max(10_000_000), z.literal("")]).optional(),
  lowStockThreshold: z.coerce.number().int().min(0).max(10_000),
  defaultWarrantyMonths: z.coerce.number().int().min(0).max(120),
  metaTitle: optionalText(160),
  metaDescription: optionalText(320),
});

export const shippingZoneSchema = z.object({
  governorate: governorateSchema,
  fee: z.coerce.number().min(0).max(10_000),
  codAvailable: z.union([z.literal("on"), z.literal("true"), z.literal("1")]).optional(),
  estimatedDays: optionalText(60),
  isActive: z.union([z.literal("on"), z.literal("true"), z.literal("1")]).optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export const categorySchema = z.object({
  nameAr: z.string().trim().min(2, "الاسم العربي مطلوب").max(100),
  nameEn: z.string().trim().min(2, "الاسم الإنجليزي مطلوب").max(100),
  slug: z
    .string()
    .trim()
    .min(2, "الرابط مطلوب")
    .max(100)
    .regex(/^[a-z0-9-]+$/, "الرابط بالحروف الإنجليزية والأرقام و - فقط"),
  description: optionalText(500),
  icon: optionalText(40),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isActive: z.union([z.literal("on"), z.literal("true"), z.literal("1")]).optional(),
});

export const brandSchema = z.object({
  name: z.string().trim().min(1, "اسم الشركة مطلوب").max(80),
  slug: z
    .string()
    .trim()
    .min(1, "الرابط مطلوب")
    .max(80)
    .regex(/^[a-z0-9-]+$/, "الرابط بالحروف الإنجليزية والأرقام و - فقط"),
  logoUrl: z.union([z.string().trim().url(), z.literal("")]).optional(),
  isActive: z.union([z.literal("on"), z.literal("true"), z.literal("1")]).optional(),
});

export const buildSaveSchema = z.object({
  buildId: optionalText(40),
  name: z.string().trim().min(2, "اسم التجميعة مطلوب").max(120),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        slot: z.enum(["CPU", "MOTHERBOARD", "RAM", "GPU", "STORAGE", "PSU", "CASE", "COOLER", "MONITOR", "ACCESSORY"]),
        quantity: z.coerce.number().int().min(1).max(10).default(1),
      }),
    )
    .min(1, "أضف قطعة واحدة على الأقل"),
});

export const trackingSchema = z.object({
  orderNumber: z.string().trim().min(4, "أدخل رقم الطلب").max(40),
  phone: phoneSchema,
});

export function formatZodError(error: z.ZodError): string {
  return error.errors[0]?.message ?? "بيانات غير صحيحة";
}

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.errors) {
    const key = issue.path.join(".") || "_form";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}

/** قراءة FormData بأمان مع تحويل القيم المتعددة */
export function formToObject(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$ACTION")) continue;
    if (key in result) {
      const current = result[key];
      result[key] = Array.isArray(current) ? [...current, value] : [current, value];
    } else {
      result[key] = value;
    }
  }
  return result;
}
