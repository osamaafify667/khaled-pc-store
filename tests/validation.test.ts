import { describe, expect, it } from "vitest";
import type { ZodError } from "zod";
import {
  checkoutSchema,
  fieldErrors,
  formToObject,
  trackingSchema,
} from "@/lib/validation";
import { isValidEgyptianPhone, normalizeEgyptianPhone, toWhatsAppNumber } from "@/lib/phone";

function validCheckout(overrides: Record<string, unknown> = {}) {
  return {
    fullName: "أحمد محمد",
    phone: "01012345678",
    email: "ahmed@example.com",
    fulfillmentType: "DELIVERY",
    paymentMethod: "CASH_ON_DELIVERY",
    governorate: "القاهرة",
    city: "القاهرة",
    area: "وسط البلد",
    street: "شارع طلعت حرب",
    building: "12",
    notes: "",
    acceptTerms: "on",
    ...overrides,
  };
}

const field = (error: ZodError, name: string) => fieldErrors(error)[name];

describe("التحقق من بيانات إتمام الطلب", () => {
  it("يقبل طلب توصيل صحيحًا ويوحّد رقم الهاتف", () => {
    const parsed = checkoutSchema.safeParse(validCheckout({ phone: "+20 101 234 5678" }));
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.phone).toBe("01012345678");
      expect(parsed.data.fulfillmentType).toBe("DELIVERY");
    }
  });

  it("يقبل الاستلام من المحل دون عنوان", () => {
    const parsed = checkoutSchema.safeParse(
      validCheckout({
        fulfillmentType: "PICKUP",
        paymentMethod: "PICKUP_CASH",
        governorate: undefined,
        city: undefined,
        street: undefined,
      }),
    );
    expect(parsed.success).toBe(true);
  });

  it("يرفض رقم هاتف غير مصري", () => {
    for (const phone of ["0123456789", "+1 555 123 4567", "abc"]) {
      const parsed = checkoutSchema.safeParse(validCheckout({ phone }));
      expect(parsed.success).toBe(false);
      if (!parsed.success) expect(fieldErrors(parsed.error).phone).toContain("هاتف");
    }
  });

  it("يرفض الاسم القصير والبريد غير الصحيح", () => {
    const parsed = checkoutSchema.safeParse(validCheckout({ fullName: "أح", email: "not-an-email" }));
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(field(parsed.error, "fullName")).toBeTruthy();
      expect(field(parsed.error, "email")).toBeTruthy();
    }
  });

  it("يرفض الطلب دون الموافقة على الشروط", () => {
    const parsed = checkoutSchema.safeParse(validCheckout({ acceptTerms: undefined }));
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(field(parsed.error, "acceptTerms")).toBeTruthy();
  });

  it("يطلب المحافظة والمدينة والعنوان عند التوصيل", () => {
    const parsed = checkoutSchema.safeParse(
      validCheckout({ governorate: "", city: "", street: "" }),
    );
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const errors = fieldErrors(parsed.error);
      expect(errors.governorate).toBeTruthy();
      expect(errors.city).toBeTruthy();
      expect(errors.street).toBeTruthy();
    }
  });

  it("يمنع خلط طرق الدفع مع نوع الاستلام", () => {
    const pickupCod = checkoutSchema.safeParse(
      validCheckout({ fulfillmentType: "PICKUP", paymentMethod: "CASH_ON_DELIVERY" }),
    );
    expect(pickupCod.success).toBe(false);
    if (!pickupCod.success) expect(field(pickupCod.error, "paymentMethod")).toBeTruthy();

    const deliveryPickupCash = checkoutSchema.safeParse(
      validCheckout({ fulfillmentType: "DELIVERY", paymentMethod: "PICKUP_CASH" }),
    );
    expect(deliveryPickupCash.success).toBe(false);
    if (!deliveryPickupCash.success) expect(field(deliveryPickupCash.error, "paymentMethod")).toBeTruthy();
  });
});

describe("تتبع الطلب", () => {
  it("يقبل رقم طلب وهاتفًا صحيحين ويوحّد الهاتف", () => {
    const parsed = trackingSchema.safeParse({
      orderNumber: "KPS-261027-ABCDEF",
      phone: "00201012345678",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.phone).toBe("01012345678");
  });

  it("يرفض رقم طلب قصيرًا أو هاتفًا خاطئًا", () => {
    expect(trackingSchema.safeParse({ orderNumber: "12", phone: "01012345678" }).success).toBe(false);
    expect(trackingSchema.safeParse({ orderNumber: "KPS-261027-ABCDEF", phone: "12345" }).success).toBe(false);
  });
});

describe("أدوات الهاتف والنماذج", () => {
  it("يوحّد صيغ الهاتف المصري المعروفة", () => {
    expect(normalizeEgyptianPhone("+201012345678")).toBe("01012345678");
    expect(normalizeEgyptianPhone("00201012345678")).toBe("01012345678");
    expect(normalizeEgyptianPhone("201012345678")).toBe("01012345678");
    expect(normalizeEgyptianPhone("010 1234 5678")).toBe("01012345678");
    expect(isValidEgyptianPhone("01012345678")).toBe(true);
    expect(isValidEgyptianPhone("01212345678")).toBe(true);
    expect(isValidEgyptianPhone("01112345678")).toBe(true);
    expect(isValidEgyptianPhone("01512345678")).toBe(true);
    expect(isValidEgyptianPhone("01612345678")).toBe(false);
    expect(toWhatsAppNumber("01012345678")).toBe("201012345678");
  });

  it("يحوّل FormData إلى كائن ويجمع القيم المتكررة ويتجاهل حقول Next", () => {
    const data = new FormData();
    data.set("name", "خالد");
    data.append("images", "one");
    data.append("images", "two");
    data.set("$ACTION_ID_abc", "ignored");

    const object = formToObject(data);
    expect(object.name).toBe("خالد");
    expect(object.images).toEqual(["one", "two"]);
    expect(object).not.toHaveProperty("$ACTION_ID_abc");
  });
});
