export const SITE = {
  nameAr: "متجر خالد للكمبيوتر",
  nameEn: "KHALED PC STORE",
  shortName: "KHALED",
  tagline: "قطع كمبيوتر أصلية وتجميعات احترافية",
  city: "القاهرة",
  country: "مصر",
  defaultAddress: "مول البستان، وسط البلد، القاهرة، مصر",
  locale: "ar",
  dir: "rtl" as const,
} as const;

export const EGYPT_GOVERNORATES = [
  "القاهرة",
  "الجيزة",
  "الإسكندرية",
  "القليوبية",
  "الشرقية",
  "الدقهلية",
  "الغربية",
  "المنوفية",
  "البحيرة",
  "كفر الشيخ",
  "دمياط",
  "بورسعيد",
  "الإسماعيلية",
  "السويس",
  "شمال سيناء",
  "جنوب سيناء",
  "الفيوم",
  "بني سويف",
  "المنيا",
  "أسيوط",
  "سوهاج",
  "قنا",
  "الأقصر",
  "أسوان",
  "البحر الأحمر",
  "الوادي الجديد",
  "مطروح",
] as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "بانتظار التأكيد",
  CONFIRMED: "تم التأكيد",
  PROCESSING: "قيد التجهيز",
  SHIPPED: "تم الشحن",
  DELIVERED: "تم التسليم",
  CANCELLED: "ملغي",
};

export const ORDER_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  CONFIRMED: "bg-sky-500/10 text-sky-300 border-sky-500/30",
  PROCESSING: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
  SHIPPED: "bg-violet-500/10 text-violet-300 border-violet-500/30",
  DELIVERED: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  CANCELLED: "bg-rose-500/10 text-rose-300 border-rose-500/30",
};

export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "SHIPPED", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "بانتظار الدفع",
  UNDER_REVIEW: "بانتظار مراجعة التحويل",
  PAID: "مدفوع",
  REJECTED: "مرفوض",
  REFUNDED: "مسترد",
};

export const PAYMENT_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-slate-500/10 text-slate-300 border-slate-500/30",
  UNDER_REVIEW: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  PAID: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  REJECTED: "bg-rose-500/10 text-rose-300 border-rose-500/30",
  REFUNDED: "bg-sky-500/10 text-sky-300 border-sky-500/30",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH_ON_DELIVERY: "الدفع نقدًا عند الاستلام",
  PICKUP_CASH: "الدفع نقدًا عند الاستلام من المحل",
  INSTAPAY: "تحويل إنستاباي",
};

export const FULFILLMENT_LABELS: Record<string, string> = {
  DELIVERY: "توصيل للعنوان",
  PICKUP: "استلام من المحل",
};

export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "مسودة",
  ACTIVE: "منشور",
  ARCHIVED: "مؤرشف",
};

export const SLOT_LABELS: Record<string, string> = {
  CPU: "المعالج",
  MOTHERBOARD: "اللوحة الأم",
  RAM: "الرامات",
  GPU: "كارت الشاشة",
  STORAGE: "وحدة التخزين",
  PSU: "مزود الطاقة",
  CASE: "الكيسة",
  COOLER: "نظام التبريد",
  MONITOR: "الشاشة",
  ACCESSORY: "ملحقات",
};

export const BUILDER_SLOTS = [
  "CPU",
  "MOTHERBOARD",
  "RAM",
  "GPU",
  "STORAGE",
  "PSU",
  "CASE",
  "COOLER",
  "MONITOR",
] as const;

export type BuilderSlot = (typeof BUILDER_SLOTS)[number];

/** ربط خانة التجميعة بسلَغ التصنيفات في قاعدة البيانات */
export const SLOT_CATEGORY_SLUGS: Record<string, string> = {
  CPU: "cpu",
  MOTHERBOARD: "motherboards",
  RAM: "ram",
  GPU: "gpu",
  STORAGE: "storage",
  PSU: "psu",
  CASE: "cases",
  COOLER: "cooling",
  MONITOR: "monitors",
  ACCESSORY: "accessories",
};

export const DEFAULT_CATEGORIES = [
  { slug: "cpu", nameAr: "المعالجات", nameEn: "Processors", icon: "cpu", sortOrder: 1 },
  { slug: "motherboards", nameAr: "اللوحات الأم", nameEn: "Motherboards", icon: "circuit", sortOrder: 2 },
  { slug: "gpu", nameAr: "كروت الشاشة", nameEn: "Graphics Cards", icon: "gpu", sortOrder: 3 },
  { slug: "ram", nameAr: "الرامات", nameEn: "Memory", icon: "memory", sortOrder: 4 },
  { slug: "storage", nameAr: "وحدات التخزين", nameEn: "Storage", icon: "storage", sortOrder: 5 },
  { slug: "psu", nameAr: "مزودات الطاقة", nameEn: "Power Supplies", icon: "plug", sortOrder: 6 },
  { slug: "cases", nameAr: "الكيسات", nameEn: "Cases", icon: "case", sortOrder: 7 },
  { slug: "cooling", nameAr: "أنظمة التبريد", nameEn: "Cooling", icon: "fan", sortOrder: 8 },
  { slug: "monitors", nameAr: "الشاشات", nameEn: "Monitors", icon: "monitor", sortOrder: 9 },
  { slug: "peripherals", nameAr: "الكيبورد والماوس", nameEn: "Peripherals", icon: "keyboard", sortOrder: 10 },
  { slug: "prebuilt-pc", nameAr: "التجميعات الجاهزة", nameEn: "Prebuilt PCs", icon: "desktop", sortOrder: 11 },
  { slug: "accessories", nameAr: "الإكسسوارات", nameEn: "Accessories", icon: "headphones", sortOrder: 12 },
] as const;

export const WARRANTY_POLICY_MONTHS = 12;

export const PAGE_SIZE = 12;
export const ADMIN_PAGE_SIZE = 20;
export const MAX_CART_QUANTITY_PER_ITEM = 10;
