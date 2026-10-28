import { SITE } from "./constants";

/**
 * طبقة نصوص جاهزة للتعريب/الإنجليزية.
 * الواجهة عربية الآن، وكل النصوص المشتركة تمر من هنا حتى يمكن إضافة
 * `en` لاحقًا دون إعادة بناء المكونات. اتجاه الصفحة يُشتق من `locale`.
 */
export type Locale = "ar" | "en";

export const defaultLocale: Locale = "ar";

const ar = {
  brand: SITE.nameAr,
  brandLatin: SITE.nameEn,
  tagline: SITE.tagline,
  nav: {
    home: "الرئيسية",
    shop: "المتجر",
    categories: "التصنيفات",
    prebuilt: "تجميعات جاهزة",
    builder: "كوّن تجميعتك",
    track: "تتبع الطلب",
    contact: "تواصل معنا",
    account: "حسابي",
    cart: "السلة",
    login: "تسجيل الدخول",
    logout: "تسجيل الخروج",
    search: "ابحث عن منتج أو موديل أو شركة…",
  },
  actions: {
    addToCart: "أضف للسلة",
    added: "تمت الإضافة",
    buyNow: "اشترِ الآن",
    viewAll: "عرض الكل",
    details: "التفاصيل",
    save: "حفظ",
    cancel: "إلغاء",
    delete: "حذف",
    edit: "تعديل",
    continue: "متابعة",
    checkout: "إتمام الطلب",
    retry: "إعادة المحاولة",
    copy: "نسخ الرابط",
    print: "طباعة",
    search: "بحث",
  },
  common: {
    price: "السعر",
    total: "الإجمالي",
    subtotal: "المجموع الفرعي",
    shipping: "الشحن",
    discount: "الخصم",
    available: "متوفر",
    outOfStock: "غير متوفر",
    lowStock: "كمية محدودة",
    inStock: "متوفر في المخزون",
    quantity: "الكمية",
    free: "مجاني",
    egp: "ج.م",
    loading: "جارٍ التحميل…",
    noResults: "لا توجد نتائج مطابقة",
    empty: "لا توجد بيانات لعرضها بعد",
    optional: "اختياري",
    required: "مطلوب",
  },
  errors: {
    generic: "حدث خطأ غير متوقع. حاول مرة أخرى.",
    unauthorized: "يجب تسجيل الدخول للمتابعة.",
    forbidden: "ليس لديك صلاحية للوصول إلى هذه الصفحة.",
    notFound: "الصفحة المطلوبة غير موجودة.",
  },
} as const;

export type Messages = typeof ar;

const dictionaries: Record<Locale, Messages> = {
  ar,
  en: ar, // تُضاف النسخة الإنجليزية الكاملة دون تغيير بنية المكونات
};

export function getMessages(locale: Locale = defaultLocale): Messages {
  return dictionaries[locale];
}

export function directionFor(locale: Locale = defaultLocale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
