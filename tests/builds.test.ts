import { beforeEach, describe, expect, it } from "vitest";
import {
  deleteBuild,
  getBuildByPublicId,
  getCompatibilityOverrides,
  getUserBuilds,
  saveBuild,
  toBuildComponent,
  toBuilderProduct,
} from "@/server/builds";
import { evaluateBuild } from "@/server/compatibility";
import { createCustomer, createProduct, prisma, resetDatabase } from "./helpers/db";

beforeEach(async () => {
  await resetDatabase();
});

async function createCpu() {
  return createProduct({
    nameAr: "معالج اختبار",
    price: 5000,
    categorySlug: "cpu",
    specs: { socket: "LGA1700", chipsetSupport: "B760", integratedGraphics: false, tdp: 65 },
  });
}

async function createGpu() {
  return createProduct({
    nameAr: "كارت شاشة اختبار",
    price: 15000,
    categorySlug: "gpu",
    specs: { lengthMm: 280, tdp: 180, recommendedPsu: 600, powerConnectors: "8pin x1" },
  });
}

describe("حفظ التجميعات وإجمالي السعر", () => {
  it("يحفظ تجميعة عامة ويعيد حساب الإجمالي من أسعار المنتجات", async () => {
    const cpu = await createCpu();
    const gpu = await createGpu();

    const build = await saveBuild({
      name: "تجميعة الألعاب",
      items: [
        { productId: cpu.id, slot: "CPU", quantity: 1 },
        { productId: gpu.id, slot: "GPU", quantity: 1 },
      ],
    });

    expect(build.publicId).toBeTruthy();
    expect(build.items).toHaveLength(2);

    const loaded = await getBuildByPublicId(build.publicId);
    expect(loaded).not.toBeNull();

    const components = loaded!.items.map((item) =>
      toBuildComponent(toBuilderProduct(item.product), item.slot as "CPU" | "GPU"),
    );
    const result = evaluateBuild({
      CPU: components.find((component) => component.slot === "CPU"),
      GPU: components.find((component) => component.slot === "GPU"),
    });

    expect(result.total).toBe(20000);
    expect(result.hasAvailabilityIssue).toBe(false);
    expect(result.missingSlots).toContain("MOTHERBOARD");
  });

  it("يرفض تكرار نفس الخانة أو منتجًا من تصنيف خاطئ", async () => {
    const cpu = await createCpu();
    const gpu = await createGpu();

    await expect(
      saveBuild({
        name: "مكررة",
        items: [
          { productId: cpu.id, slot: "CPU", quantity: 1 },
          { productId: cpu.id, slot: "CPU", quantity: 1 },
        ],
      }),
    ).rejects.toMatchObject({ code: "INVALID_ITEM" });

    await expect(
      saveBuild({
        name: "خانة خاطئة",
        items: [{ productId: gpu.id, slot: "CPU", quantity: 1 }],
      }),
    ).rejects.toMatchObject({ code: "INVALID_ITEM" });
  });

  it("يرفض حفظ تجميعة فارغة أو منتجًا غير منشور", async () => {
    await expect(saveBuild({ name: "فارغة", items: [] })).rejects.toMatchObject({ code: "EMPTY" });

    const hidden = await createProduct({ status: "DRAFT", categorySlug: "cpu" });
    await expect(
      saveBuild({
        name: "مخفي",
        items: [{ productId: hidden.id, slot: "CPU", quantity: 1 }],
      }),
    ).rejects.toMatchObject({ code: "INVALID_ITEM" });
  });

  it("يحدّث التجميعة لنفس المالك ويحفظ المعرّف العام", async () => {
    const user = await createCustomer();
    const cpu = await createCpu();
    const gpu = await createGpu();

    const created = await saveBuild({
      userId: user.id,
      name: "تجميعة",
      items: [{ productId: cpu.id, slot: "CPU", quantity: 1 }],
    });

    const updated = await saveBuild({
      buildId: created.id,
      userId: user.id,
      name: "تجميعة محدثة",
      items: [{ productId: gpu.id, slot: "GPU", quantity: 1 }],
    });

    expect(updated.id).toBe(created.id);
    expect(updated.publicId).toBe(created.publicId);
    expect(updated.name).toBe("تجميعة محدثة");
    expect(updated.items).toHaveLength(1);
    expect(updated.items[0].slot).toBe("GPU");
  });

  it("يمنع مستخدمًا آخر من حذف تجميعة ليست له", async () => {
    const owner = await createCustomer();
    const stranger = await createCustomer();
    const cpu = await createCpu();

    const build = await saveBuild({
      userId: owner.id,
      name: "خاصة",
      items: [{ productId: cpu.id, slot: "CPU", quantity: 1 }],
    });

    await expect(deleteBuild(build.id, stranger.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await deleteBuild(build.id, owner.id);
    expect(await prisma.build.findUnique({ where: { id: build.id } })).toBeNull();
  });

  it("يعيد تجميعات المستخدم مرتبة", async () => {
    const user = await createCustomer();
    const cpu = await createCpu();

    await saveBuild({ userId: user.id, name: "الأولى", items: [{ productId: cpu.id, slot: "CPU", quantity: 1 }] });
    await new Promise((resolve) => setTimeout(resolve, 10));
    await saveBuild({ userId: user.id, name: "الثانية", items: [{ productId: cpu.id, slot: "CPU", quantity: 1 }] });

    const builds = await getUserBuilds(user.id);
    expect(builds).toHaveLength(2);
    expect(builds[0].name).toBe("الثانية");
  });
});

describe("قواعد التوافق من قاعدة البيانات", () => {
  it("يحوّل القواعد المعطلة والمعدلة إلى تجاوزات للمحرك", async () => {
    await prisma.compatibilityRule.create({
      data: {
        key: "cpu_socket",
        label: "مقبس المعالج",
        isActive: false,
      },
    });
    await prisma.compatibilityRule.create({
      data: {
        key: "psu_wattage",
        label: "قدرة المزود",
        severity: "ERROR",
        config: { headroomPercent: 50 },
      },
    });

    const overrides = await getCompatibilityOverrides();
    expect(overrides.cpu_socket?.isActive).toBe(false);
    expect(overrides.psu_wattage?.severity).toBe("ERROR");
    expect(overrides.psu_wattage?.config).toEqual({ headroomPercent: 50 });
  });
});
