import { describe, expect, it } from "vitest";
import {
  compatibilityScore,
  evaluateBuild,
  evaluateSelection,
  missingRequiredSlots,
  selectionFromComponents,
  summarizeStatus,
  totalForSelection,
  type BuildComponent,
  type BuildSelection,
} from "@/server/compatibility";
import { component } from "./helpers/db";

function compatibleSelection(): BuildSelection {
  return {
    CPU: component("CPU", {
      socket: "LGA1700",
      chipsetSupport: "B760, Z790",
      cpuFamily: "Raptor Lake",
      tdp: 65,
      integratedGraphics: false,
      minBiosVersion: "1.0",
    }, { price: 12000 }),
    MOTHERBOARD: component("MOTHERBOARD", {
      socket: "LGA1700",
      chipset: "B760",
      ramType: "DDR5",
      ramSlots: 4,
      maxRamCapacity: 128,
      maxRamSpeed: 6000,
      formFactor: "ATX",
      m2Slots: 2,
      sataPorts: 4,
      biosVersion: "1.2",
      biosSupportsCpuFamilies: "Raptor Lake, Raptor Lake Refresh",
    }, { price: 7000 }),
    RAM: component("RAM", {
      ramType: "DDR5",
      formFactor: "DIMM",
      modules: 2,
      capacityGB: 16,
      speed: 6000,
    }, { price: 4000 }),
    GPU: component("GPU", {
      lengthMm: 300,
      thicknessSlots: 2,
      tdp: 200,
      recommendedPsu: 650,
      powerConnectors: "8pin x2",
    }, { price: 20000 }),
    STORAGE: [
      component("STORAGE", { interface: "NVMe", formFactor: "M.2" }, { price: 3500 }),
    ],
    PSU: component("PSU", {
      wattage: 750,
      pcie8pin: 2,
      pcie12vhpwr: 0,
      pcie6pin: 0,
      cpu8pin: 1,
      formFactor: "ATX",
      lengthMm: 160,
    }, { price: 4500 }),
    CASE: component("CASE", {
      supportedFormFactors: "ATX, Micro-ATX, Mini-ITX",
      maxGpuLengthMm: 350,
      maxGpuThicknessSlots: 3,
      radiatorSupportMm: "240, 360",
      maxCoolerHeightMm: 160,
      driveBays35: 2,
      driveBays25: 2,
      supportedPsuFormFactors: "ATX",
      maxPsuLengthMm: 180,
    }, { price: 3000 }),
    COOLER: component("COOLER", {
      coolerType: "Air",
      heightMm: 150,
      socketSupport: "LGA1700, AM5",
    }, { price: 1500 }),
  };
}

describe("محرك التوافق — تجميعة متوافقة", () => {
  it("يعتبر التجميعة الكاملة متوافقة بلا أخطاء أو تحذيرات", () => {
    const report = evaluateSelection(compatibleSelection());

    expect(report.status).toBe("COMPATIBLE");
    expect(report.issues).toEqual([]);
    expect(report.counts).toEqual({ errors: 0, warnings: 0, unknowns: 0 });
  });

  it("يحسب الإجمالي من كل المكوّنات بما فيها التخزين", () => {
    const selection = compatibleSelection();

    expect(totalForSelection(selection)).toBe(55500);
  });

  it("لا يعتبر أي خانة ناقصة في التجميعة الكاملة", () => {
    expect(missingRequiredSlots(compatibleSelection())).toEqual([]);
  });

  it("يستنتج الخانات الناقصة ويعفى كارت الشاشة عند وجود رسوميات مدمجة", () => {
    const withIgpu: BuildSelection = {
      CPU: component("CPU", { integratedGraphics: true }),
    };

    const missing = missingRequiredSlots(withIgpu);
    expect(missing).not.toContain("GPU");
    expect(missing).toContain("MOTHERBOARD");
    expect(missing).toContain("STORAGE");
    expect(missing).toContain("PSU");
  });

  it("يُعيد تقريرًا كاملًا مع حالة توفّر المكوّنات", () => {
    const selection = compatibleSelection();
    selection.GPU = { ...selection.GPU!, available: false };

    const result = evaluateBuild(selection);
    expect(result.status).toBe("COMPATIBLE");
    expect(result.hasAvailabilityIssue).toBe(true);
    expect(result.missingSlots).toEqual([]);
    expect(result.total).toBe(55500);
  });
});

describe("محرك التوافق — أخطاء التوافق", () => {
  it("يرفض عدم تطابق مقبس المعالج", () => {
    const selection = compatibleSelection();
    selection.MOTHERBOARD = {
      ...selection.MOTHERBOARD!,
      specs: { ...selection.MOTHERBOARD!.specs, socket: "AM5" },
    };

    const report = evaluateSelection(selection);
    expect(report.status).toBe("INCOMPATIBLE");
    expect(report.issues.some((issue) => issue.ruleKey === "cpu_socket" && issue.severity === "ERROR")).toBe(true);
  });

  it("يرفض اختلاف جيل الرامات DDR", () => {
    const selection = compatibleSelection();
    selection.RAM = {
      ...selection.RAM!,
      specs: { ...selection.RAM!.specs, ramType: "DDR4" },
    };

    const report = evaluateSelection(selection);
    expect(report.status).toBe("INCOMPATIBLE");
    expect(report.issues.some((issue) => issue.ruleKey === "ram_type")).toBe(true);
  });

  it("يرفض تجاوز عدد وحدات الرامات للفتحات المتاحة", () => {
    const selection = compatibleSelection();
    selection.RAM = { ...selection.RAM!, specs: { ...selection.RAM!.specs, modules: 4 } };
    selection.MOTHERBOARD = { ...selection.MOTHERBOARD!, specs: { ...selection.MOTHERBOARD!.specs, ramSlots: 2 } };

    expect(evaluateSelection(selection).status).toBe("INCOMPATIBLE");
  });

  it("يرفض كارت شاشة أطول من المساحة المتاحة في الكيسة", () => {
    const selection = compatibleSelection();
    selection.GPU = { ...selection.GPU!, specs: { ...selection.GPU!.specs, lengthMm: 400 } };

    const report = evaluateSelection(selection);
    expect(report.status).toBe("INCOMPATIBLE");
    expect(report.issues.some((issue) => issue.ruleKey === "gpu_case_length" && issue.severity === "ERROR")).toBe(true);
  });

  it("ينبّه عندما تكون مساحة كارت الشاشة ضيقة جدًا", () => {
    const selection = compatibleSelection();
    selection.GPU = { ...selection.GPU!, specs: { ...selection.GPU!.specs, lengthMm: 345 } };

    const report = evaluateSelection(selection);
    expect(report.status).toBe("WARNING");
    expect(report.issues.some((issue) => issue.ruleKey === "gpu_case_length" && issue.severity === "WARNING")).toBe(true);
  });

  it("يرفض مقاس لوحة أم غير مدعوم في الكيسة", () => {
    const selection = compatibleSelection();
    selection.MOTHERBOARD = { ...selection.MOTHERBOARD!, specs: { ...selection.MOTHERBOARD!.specs, formFactor: "E-ATX" } };

    const report = evaluateSelection(selection);
    expect(report.status).toBe("INCOMPATIBLE");
    expect(report.issues.some((issue) => issue.ruleKey === "mb_case_form_factor")).toBe(true);
  });

  it("يرفض عدد أقراص M.2 أكبر من المنافذ", () => {
    const selection = compatibleSelection();
    selection.MOTHERBOARD = { ...selection.MOTHERBOARD!, specs: { ...selection.MOTHERBOARD!.specs, m2Slots: 1 } };
    selection.STORAGE = [
      component("STORAGE", { interface: "NVMe", formFactor: "M.2" }),
      component("STORAGE", { interface: "NVMe", formFactor: "M.2" }),
    ];

    const report = evaluateSelection(selection);
    expect(report.status).toBe("INCOMPATIBLE");
    expect(report.issues.some((issue) => issue.ruleKey === "storage_m2")).toBe(true);
  });

  it("يرفض مشتتًا أعلى من المساحة المتاحة", () => {
    const selection = compatibleSelection();
    selection.COOLER = { ...selection.COOLER!, specs: { ...selection.COOLER!.specs, heightMm: 180 } };

    expect(evaluateSelection(selection).status).toBe("INCOMPATIBLE");
  });

  it("يرفض رادياتير مائي بمقاس غير مدعوم", () => {
    const selection = compatibleSelection();
    selection.COOLER = {
      ...selection.COOLER!,
      specs: { ...selection.COOLER!.specs, coolerType: "AIO Liquid", radiatorSizeMm: 420 },
    };

    const report = evaluateSelection(selection);
    expect(report.status).toBe("INCOMPATIBLE");
    expect(report.issues.some((issue) => issue.ruleKey === "cooler_case_height")).toBe(true);
  });

  it("يرفض مزود طاقة أقل من الحمل التقديري", () => {
    const selection = compatibleSelection();
    selection.PSU = { ...selection.PSU!, specs: { ...selection.PSU!.specs, wattage: 300 } };

    const report = evaluateSelection(selection);
    expect(report.status).toBe("INCOMPATIBLE");
    expect(report.issues.some((issue) => issue.ruleKey === "psu_wattage" && issue.severity === "ERROR")).toBe(true);
  });

  it("ينبّه عندما تقل قدرة مزود الطاقة عن القدرة الموصى بها", () => {
    const selection = compatibleSelection();
    selection.PSU = { ...selection.PSU!, specs: { ...selection.PSU!.specs, wattage: 500 } };

    const report = evaluateSelection(selection);
    expect(report.status).toBe("WARNING");
    expect(report.issues.some((issue) => issue.ruleKey === "psu_wattage" && issue.severity === "WARNING")).toBe(true);
  });

  it("يرفض نقص موصلات 8-pin لكارت الشاشة", () => {
    const selection = compatibleSelection();
    selection.PSU = { ...selection.PSU!, specs: { ...selection.PSU!.specs, pcie8pin: 1 } };

    const report = evaluateSelection(selection);
    expect(report.status).toBe("INCOMPATIBLE");
    expect(report.issues.some((issue) => issue.ruleKey === "psu_gpu_connectors")).toBe(true);
  });

  it("يرفض مزود طاقة لا يدعم نوع الكيسة", () => {
    const selection = compatibleSelection();
    selection.PSU = { ...selection.PSU!, specs: { ...selection.PSU!.specs, formFactor: "SFX" } };

    const report = evaluateSelection(selection);
    expect(report.status).toBe("INCOMPATIBLE");
    expect(report.issues.some((issue) => issue.ruleKey === "psu_case_fit")).toBe(true);
  });
});

describe("نسبة التوافق المعروضة", () => {
  it("تعطي 100% للتجميعة المتوافقة تمامًا", () => {
    expect(compatibilityScore(evaluateSelection(compatibleSelection()))).toBe(100);
  });

  it("تخفض النسبة عند وجود تحذير ولا تجعلها صفرًا", () => {
    const selection = compatibleSelection();
    selection.GPU = { ...selection.GPU!, specs: { ...selection.GPU!.specs, lengthMm: 345 } };

    const score = compatibilityScore(evaluateSelection(selection));
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });

  it("تخفض النسبة أكثر عند وجود خطأ مقارنة بتحذير", () => {
    const warningSelection = compatibleSelection();
    warningSelection.PSU = { ...warningSelection.PSU!, specs: { ...warningSelection.PSU!.specs, wattage: 500 } };

    const errorSelection = compatibleSelection();
    errorSelection.PSU = { ...errorSelection.PSU!, specs: { ...errorSelection.PSU!.specs, wattage: 300 } };

    const warningScore = compatibilityScore(evaluateSelection(warningSelection));
    const errorScore = compatibilityScore(evaluateSelection(errorSelection));
    expect(errorScore).toBeLessThan(warningScore);
  });

  it("تخفض النسبة عند نقص البيانات ولا تنزل تحت الصفر", () => {
    const incomplete = evaluateBuild({ CPU: component("CPU", {}) });
    expect(compatibilityScore(incomplete)).toBeLessThan(100);
    expect(compatibilityScore(incomplete)).toBeGreaterThanOrEqual(0);

    const manyIssues = {
      status: "INCOMPATIBLE" as const,
      issues: [],
      counts: { errors: 10, warnings: 10, unknowns: 10 },
    };
    expect(compatibilityScore(manyIssues)).toBe(0);
  });
});

describe("محرك التوافق — البيانات غير الكافية والقواعد القابلة للتعديل", () => {
  it("لا يخمّن التوافق عند غياب مواصفات أساسية", () => {
    const selection = compatibleSelection();
    selection.CPU = { ...selection.CPU!, specs: {} };

    const report = evaluateSelection(selection);
    expect(report.status).toBe("INSUFFICIENT_DATA");
    expect(report.counts.unknowns).toBeGreaterThan(0);
    expect(report.counts.errors).toBe(0);
  });

  it("يعتبر غياب استهلاك كارت الشاشة بيانات غير كافية لقدرة المزود", () => {
    const selection = compatibleSelection();
    selection.GPU = {
      ...selection.GPU!,
      specs: { ...selection.GPU!.specs, tdp: undefined, recommendedPsu: undefined },
    };

    const report = evaluateSelection(selection);
    expect(report.status).toBe("INSUFFICIENT_DATA");
    expect(report.issues.some((issue) => issue.ruleKey === "psu_wattage" && issue.severity === "UNKNOWN")).toBe(true);
  });

  it("يستطيع تعطيل قاعدة من لوحة التحكم", () => {
    const selection = compatibleSelection();
    selection.MOTHERBOARD = { ...selection.MOTHERBOARD!, specs: { ...selection.MOTHERBOARD!.specs, socket: "AM5" } };

    const report = evaluateSelection(selection, {
      cpu_socket: { isActive: false },
    });

    expect(report.status).toBe("COMPATIBLE");
    expect(report.issues.some((issue) => issue.ruleKey === "cpu_socket")).toBe(false);
  });

  it("يستطيع تحويل خطأ إلى تحذير من لوحة التحكم", () => {
    const selection = compatibleSelection();
    selection.MOTHERBOARD = { ...selection.MOTHERBOARD!, specs: { ...selection.MOTHERBOARD!.specs, socket: "AM5" } };

    const report = evaluateSelection(selection, {
      cpu_socket: { severity: "WARNING" },
    });

    expect(report.status).toBe("WARNING");
    expect(report.issues.find((issue) => issue.ruleKey === "cpu_socket")?.severity).toBe("WARNING");
  });

  it("يستخدم نسبة هامش أمان قابلة للتعديل في حساب مزود الطاقة", () => {
    const selection = compatibleSelection();
    selection.PSU = { ...selection.PSU!, specs: { ...selection.PSU!.specs, wattage: 650 } };

    expect(evaluateSelection(selection).status).toBe("COMPATIBLE");
    expect(
      evaluateSelection(selection, { psu_wattage: { config: { headroomPercent: 120 } } }).status,
    ).toBe("WARNING");
  });
});

describe("أدوات مساعدة", () => {
  it("يبني الاختيار من قائمة مكوّنات ويجمع التخزين", () => {
    const components = compatibleSelection();
    const list: BuildComponent[] = [
      components.CPU!,
      components.MOTHERBOARD!,
      components.RAM!,
      components.GPU!,
      components.PSU!,
      components.CASE!,
      components.COOLER!,
      ...(components.STORAGE ?? []),
      ...(components.STORAGE ?? []),
    ];

    const selection = selectionFromComponents(list);
    expect(selection.STORAGE).toHaveLength(2);
    expect(selection.CPU?.productId).toBe(components.CPU?.productId);
  });

  it("يحوّل الحالة إلى وصف عربي مناسب للواجهة", () => {
    expect(summarizeStatus("COMPATIBLE")).toEqual({ label: "متوافق", tone: "success" });
    expect(summarizeStatus("WARNING")).toEqual({ label: "يحتاج مراجعة", tone: "warning" });
    expect(summarizeStatus("INCOMPATIBLE")).toEqual({ label: "غير متوافق", tone: "danger" });
    expect(summarizeStatus("INSUFFICIENT_DATA")).toEqual({ label: "بيانات غير كافية", tone: "neutral" });
  });
});
