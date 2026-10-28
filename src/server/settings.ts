import { cache } from "react";
import { prisma } from "./db";
import { SITE } from "@/lib/constants";

export type Settings = {
  id: number;
  storeNameAr: string;
  storeNameEn: string;
  tagline: string;
  storeNote: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  addressLine: string;
  workingHours: string | null;
  mapUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  announcement: string | null;
  instapayEnabled: boolean;
  instapayHandle: string | null;
  instapayName: string | null;
  instapayInstructions: string | null;
  codEnabled: boolean;
  pickupEnabled: boolean;
  shippingFlatFee: number;
  freeShippingThreshold: number | null;
  lowStockThreshold: number;
  defaultWarrantyMonths: number;
  metaTitle: string | null;
  metaDescription: string | null;
  updatedAt: Date;
};

export const DEFAULT_SETTINGS: Settings = {
  id: 1,
  storeNameAr: SITE.nameAr,
  storeNameEn: SITE.nameEn,
  tagline: SITE.tagline,
  storeNote: null,
  phone: "+201220534625",
  whatsapp: "+201220534625",
  email: null,
  addressLine: SITE.defaultAddress,
  workingHours: null,
  mapUrl: null,
  instagramUrl: null,
  facebookUrl: null,
  announcement: null,
  instapayEnabled: false,
  instapayHandle: null,
  instapayName: null,
  instapayInstructions: null,
  codEnabled: true,
  pickupEnabled: true,
  shippingFlatFee: 0,
  freeShippingThreshold: null,
  lowStockThreshold: 3,
  defaultWarrantyMonths: 12,
  metaTitle: null,
  metaDescription: null,
  updatedAt: new Date(0),
};

/**
 * إعدادات المتجر تُدار بالكامل من لوحة التحكم.
 * لا نختلق رقم هاتف أو بيانات دفع: تظهر رسالة "غير مُعد" إذا لم تُضبط.
 */
export const getSettings = cache(async (): Promise<Settings> => {
  const row = await prisma.storeSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  return {
    ...row,
    shippingFlatFee: Number(row.shippingFlatFee),
    freeShippingThreshold: row.freeShippingThreshold === null ? null : Number(row.freeShippingThreshold),
  };
});
