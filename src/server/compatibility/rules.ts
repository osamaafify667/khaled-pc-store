import { booleanValue, countConnectors, includesNormalized, list, normalize, numberValue, text } from "./specs";
import type {
  BuildComponent,
  BuildSelection,
  BuildSlot,
  CompatibilityIssue,
  CompatibilityStatus,
  SpecMap,
} from "./types";

export interface RuleContext {
  selection: BuildSelection;
  config: Record<string, number | string | boolean>;
}

interface RuleDefinition {
  key: string;
  label: string;
  description: string;
  check: (ctx: RuleContext) => CompatibilityIssue[];
}

const issue = (
  ruleKey: string,
  severity: CompatibilityIssue["severity"],
  message: string,
  slots: BuildSlot[],
  hint?: string,
): CompatibilityIssue => ({ ruleKey, severity, message, slots, hint });

const missing = (ruleKey: string, message: string, slots: BuildSlot[], hint?: string) =>
  issue(ruleKey, "UNKNOWN", message, slots, hint);

/** يقارن إصدارات BIOS الرقمية مثل 1.2.3 */
function versionLessThan(a: string, b: string): boolean | null {
  const parse = (v: string) => v.split(/[.\-_\s]+/).map((part) => Number(part)).filter((n) => Number.isFinite(n));
  const left = parse(a);
  const right = parse(b);
  if (left.length === 0 || right.length === 0) return null;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    const x = left[i] ?? 0;
    const y = right[i] ?? 0;
    if (x < y) return true;
    if (x > y) return false;
  }
  return false;
}

function requiredSlots(selection: BuildSelection): BuildSlot[] {
  const cpu = selection.CPU;
  const hasIgpu = cpu ? booleanValue(cpu, "integratedGraphics") === true : false;
  const required: BuildSlot[] = ["CPU", "MOTHERBOARD", "RAM", "STORAGE", "PSU", "CASE", "COOLER"];
  if (!hasIgpu) required.push("GPU");
  return required;
}

export const RULES: RuleDefinition[] = [
  {
    key: "cpu_socket",
    label: "توافق مقبس المعالج مع اللوحة الأم",
    description: "يجب أن يتطابق مقبس المعالج مع مقبس اللوحة الأم.",
    check: ({ selection }) => {
      const { CPU, MOTHERBOARD } = selection;
      if (!CPU || !MOTHERBOARD) return [];
      const cpuSocket = text(CPU, "socket");
      const mbSocket = text(MOTHERBOARD, "socket");
      if (!cpuSocket || !mbSocket) {
        return [missing("cpu_socket", "لا تتوفر بيانات مقبس المعالج أو اللوحة الأم للتأكد من التوافق.", ["CPU", "MOTHERBOARD"])];
      }
      if (normalize(cpuSocket) !== normalize(mbSocket)) {
        return [
          issue(
            "cpu_socket",
            "ERROR",
            `مقبس المعالج (${cpuSocket}) لا يتوافق مع مقبس اللوحة الأم (${mbSocket}).`,
            ["CPU", "MOTHERBOARD"],
            "اختر لوحة أم بنفس مقبس المعالج.",
          ),
        ];
      }
      return [];
    },
  },
  {
    key: "cpu_chipset",
    label: "دعم مجموعة الشرائح للمعالج",
    description: "يتحقق من أن شريحة اللوحة الأم ضمن الشرائح المدعومة للمعالج.",
    check: ({ selection }) => {
      const { CPU, MOTHERBOARD } = selection;
      if (!CPU || !MOTHERBOARD) return [];
      const supported = list(CPU, "chipsetSupport");
      const chipset = text(MOTHERBOARD, "chipset");
      if (!chipset || supported.length === 0) {
        return [
          missing(
            "cpu_chipset",
            "لم يتم التحقق من دعم مجموعة الشرائح للمعالج لعدم توفر هذه المواصفة.",
            ["CPU", "MOTHERBOARD"],
            "راجع الموقع الرسمي للوحة الأم قبل الشراء.",
          ),
        ];
      }
      if (!includesNormalized(supported, chipset)) {
        return [
          issue(
            "cpu_chipset",
            "ERROR",
            `شريحة اللوحة الأم (${chipset}) غير مدرجة ضمن الشرائح المدعومة لهذا المعالج.`,
            ["CPU", "MOTHERBOARD"],
            "تأكد من دعم المعالج للشريحة من صفحة الشركة المصنعة.",
          ),
        ];
      }
      return [];
    },
  },
  {
    key: "cpu_bios",
    label: "إصدار BIOS ودعم المعالج",
    description: "ينبّه إذا كان المعالج يحتاج إصدار BIOS أحدث أو عائلة غير مذكورة في دعم اللوحة.",
    check: ({ selection }) => {
      const { CPU, MOTHERBOARD } = selection;
      if (!CPU || !MOTHERBOARD) return [];
      const issues: CompatibilityIssue[] = [];
      const biosVersion = text(MOTHERBOARD, "biosVersion");
      const minBios = text(CPU, "minBiosVersion");
      if (minBios && biosVersion) {
        const older = versionLessThan(biosVersion, minBios);
        if (older === null) {
          issues.push(
            missing("cpu_bios", "تعذر مقارنة إصدار BIOS المطلوب مع إصدار اللوحة الأم.", ["CPU", "MOTHERBOARD"]),
          );
        } else if (older) {
          issues.push(
            issue(
              "cpu_bios",
              "WARNING",
              `قد يحتاج المعالج إلى تحديث BIOS (المطلوب ${minBios} والإصدار المذكور ${biosVersion}).`,
              ["CPU", "MOTHERBOARD"],
              "حدّث BIOS قبل تركيب المعالج أو راجع البائع.",
            ),
          );
        }
      }
      const family = text(CPU, "cpuFamily");
      const biosFamilies = list(MOTHERBOARD, "biosSupportsCpuFamilies");
      if (family && biosFamilies.length > 0 && !includesNormalized(biosFamilies, family)) {
        issues.push(
          issue(
            "cpu_bios",
            "WARNING",
            `عائلة المعالج (${family}) غير مذكورة ضمن عائلات المعالجات المدعومة في BIOS اللوحة الأم.`,
            ["CPU", "MOTHERBOARD"],
            "قد تحتاج اللوحة إلى تحديث BIOS من الشركة المصنعة.",
          ),
        );
      }
      return issues;
    },
  },
  {
    key: "ram_type",
    label: "نوع الرامات DDR",
    description: "يجب تطابق DDR4/DDR5 بين الرامات واللوحة الأم.",
    check: ({ selection }) => {
      const { RAM, MOTHERBOARD } = selection;
      if (!RAM || !MOTHERBOARD) return [];
      const ramType = text(RAM, "ramType");
      const mbType = text(MOTHERBOARD, "ramType");
      if (!ramType || !mbType) {
        return [missing("ram_type", "لا تتوفر بيانات نوع الرامات أو نوع الذاكرة المدعوم في اللوحة الأم.", ["RAM", "MOTHERBOARD"])];
      }
      if (normalize(ramType) !== normalize(mbType)) {
        return [
          issue(
            "ram_type",
            "ERROR",
            `الرامات من نوع ${ramType} بينما اللوحة الأم تدعم ${mbType}.`,
            ["RAM", "MOTHERBOARD"],
            "اختر رامات من نفس الجيل الذي تدعمه اللوحة.",
          ),
        ];
      }
      return [];
    },
  },
  {
    key: "ram_form_factor",
    label: "حجم وحدات الرامات",
    description: "يتحقق من أن الرامات DIMM مكتبية وليست SODIMM للابتوب.",
    check: ({ selection }) => {
      const { RAM, MOTHERBOARD } = selection;
      if (!RAM || !MOTHERBOARD) return [];
      const ramForm = text(RAM, "formFactor");
      if (!ramForm) return [];
      if (normalize(ramForm).includes("sodimm")) {
        return [
          issue(
            "ram_form_factor",
            "ERROR",
            "الرامات من نوع SODIMM (لابتوب) ولا تصلح للوحة أم مكتبية.",
            ["RAM", "MOTHERBOARD"],
            "اختر رامات DIMM مكتبية.",
          ),
        ];
      }
      return [];
    },
  },
  {
    key: "ram_slots",
    label: "عدد فتحات الرامات",
    description: "عدد وحدات الرامات في الطقم يجب ألا يتجاوز فتحات اللوحة.",
    check: ({ selection }) => {
      const { RAM, MOTHERBOARD } = selection;
      if (!RAM || !MOTHERBOARD) return [];
      const modules = numberValue(RAM, "modules");
      const slots = numberValue(MOTHERBOARD, "ramSlots");
      if (modules === null || slots === null) {
        return [missing("ram_slots", "لا تتوفر بيانات عدد وحدات الرامات أو عدد الفتحات للتأكد من التوافق.", ["RAM", "MOTHERBOARD"])];
      }
      if (modules > slots) {
        return [
          issue(
            "ram_slots",
            "ERROR",
            `طقم الرامات يحتوي ${modules} وحدات بينما اللوحة الأم بها ${slots} فتحات فقط.`,
            ["RAM", "MOTHERBOARD"],
          ),
        ];
      }
      return [];
    },
  },
  {
    key: "ram_capacity",
    label: "السعة القصوى للرامات",
    description: "السعة الكلية للطقم يجب ألا تتجاوز الحد الأقصى للوحة الأم.",
    check: ({ selection }) => {
      const { RAM, MOTHERBOARD } = selection;
      if (!RAM || !MOTHERBOARD) return [];
      const perModule = numberValue(RAM, "capacityGB");
      const modules = numberValue(RAM, "modules");
      const max = numberValue(MOTHERBOARD, "maxRamCapacity");
      if (perModule === null || modules === null || max === null) {
        return [missing("ram_capacity", "لا تتوفر بيانات سعة الرامات أو السعة القصوى للوحة الأم.", ["RAM", "MOTHERBOARD"])];
      }
      const total = perModule * modules;
      if (total > max) {
        return [
          issue(
            "ram_capacity",
            "ERROR",
            `سعة الرامات الكلية (${total}GB) تتجاوز الحد الأقصى للوحة الأم (${max}GB).`,
            ["RAM", "MOTHERBOARD"],
          ),
        ];
      }
      return [];
    },
  },
  {
    key: "ram_speed",
    label: "سرعة الرامات",
    description: "تنبيه عند تجاوز الرامات للسرعة المدعومة رسميًا.",
    check: ({ selection }) => {
      const { RAM, MOTHERBOARD } = selection;
      if (!RAM || !MOTHERBOARD) return [];
      const speed = numberValue(RAM, "speed");
      const max = numberValue(MOTHERBOARD, "maxRamSpeed");
      if (speed === null || max === null) return [];
      if (speed > max) {
        return [
          issue(
            "ram_speed",
            "WARNING",
            `سرعة الرامات (${speed}MHz) أعلى من السرعة المدعومة للوحة (${max}MHz)، وقد تعمل بسرعة أقل.`,
            ["RAM", "MOTHERBOARD"],
            "يمكن تشغيلها عادة بعد تفعيل XMP/EXPO لكن ليس مضمونًا.",
          ),
        ];
      }
      return [];
    },
  },
  {
    key: "mb_case_form_factor",
    label: "مقاس اللوحة الأم والكيسة",
    description: "يجب أن تدعم الكيسة مقاس اللوحة الأم.",
    check: ({ selection }) => {
      const { MOTHERBOARD, CASE } = selection;
      if (!MOTHERBOARD || !CASE) return [];
      const mbForm = text(MOTHERBOARD, "formFactor");
      const supported = list(CASE, "supportedFormFactors");
      if (!mbForm || supported.length === 0) {
        return [missing("mb_case_form_factor", "لا تتوفر بيانات مقاس اللوحة الأم أو المقاسات المدعومة للكيسة.", ["MOTHERBOARD", "CASE"])];
      }
      if (!includesNormalized(supported, mbForm)) {
        return [
          issue(
            "mb_case_form_factor",
            "ERROR",
            `الكيسة لا تدعم مقاس اللوحة الأم (${mbForm}). المقاسات المدعومة: ${supported.join("، ")}.`,
            ["MOTHERBOARD", "CASE"],
          ),
        ];
      }
      return [];
    },
  },
  {
    key: "gpu_case_length",
    label: "طول كارت الشاشة داخل الكيسة",
    description: "يتحقق من المساحة المتاحة لطول كارت الشاشة.",
    check: ({ selection }) => {
      const { GPU, CASE } = selection;
      if (!GPU || !CASE) return [];
      const length = numberValue(GPU, "lengthMm");
      const max = numberValue(CASE, "maxGpuLengthMm");
      if (length === null || max === null) {
        return [
          missing(
            "gpu_case_length",
            "لا تتوفر بيانات طول كارت الشاشة أو أقصى طول تدعمه الكيسة.",
            ["GPU", "CASE"],
            "راجع أبعاد الكارت والكيسة من صفحات الشركة المصنعة.",
          ),
        ];
      }
      if (length > max) {
        return [
          issue(
            "gpu_case_length",
            "ERROR",
            `طول كارت الشاشة (${length}mm) أكبر من المساحة المتاحة في الكيسة (${max}mm).`,
            ["GPU", "CASE"],
          ),
        ];
      }
      if (max - length <= 10) {
        return [
          issue(
            "gpu_case_length",
            "WARNING",
            `المساحة بين كارت الشاشة والكيسة ضيقة جدًا (${Math.round(max - length)}mm فقط).`,
            ["GPU", "CASE"],
            "قد تتعارض مع الكابلات أو مراوح التهوية.",
          ),
        ];
      }
      return [];
    },
  },
  {
    key: "gpu_case_thickness",
    label: "سُمك كارت الشاشة",
    description: "يتحقق من عدد الفتحات التي يشغلها الكارت داخل الكيسة.",
    check: ({ selection }) => {
      const { GPU, CASE } = selection;
      if (!GPU || !CASE) return [];
      const thickness = numberValue(GPU, "thicknessSlots");
      const max = numberValue(CASE, "maxGpuThicknessSlots");
      if (thickness === null || max === null) return [];
      if (thickness > max) {
        return [
          issue(
            "gpu_case_thickness",
            "ERROR",
            `سُمك كارت الشاشة (${thickness} فتحة) أكبر من المساحة المتاحة في الكيسة (${max} فتحة).`,
            ["GPU", "CASE"],
          ),
        ];
      }
      return [];
    },
  },
  {
    key: "cooler_case_height",
    label: "ارتفاع المشتت / حجم الرادياتير",
    description: "يتحقق من مساحة التبريد داخل الكيسة.",
    check: ({ selection }) => {
      const { COOLER, CASE } = selection;
      if (!COOLER || !CASE) return [];
      const issues: CompatibilityIssue[] = [];
      const coolerType = text(COOLER, "coolerType");
      const isAio = coolerType ? /aio|liquid|مائي/i.test(coolerType) : false;
      if (isAio) {
        const radiator = numberValue(COOLER, "radiatorSizeMm");
        const supported = list(CASE, "radiatorSupportMm").map((v) => Number(v)).filter((n) => Number.isFinite(n));
        if (radiator === null) {
          issues.push(missing("cooler_case_height", "لا يتوفر مقاس رادياتير التبريد المائي.", ["COOLER", "CASE"]));
        } else if (supported.length === 0) {
          issues.push(missing("cooler_case_height", "لا تتوفر بيانات دعم الكيسة لأحجام الرادياتير.", ["COOLER", "CASE"]));
        } else if (!supported.includes(radiator)) {
          issues.push(
            issue(
              "cooler_case_height",
              "ERROR",
              `الكيسة لا تدعم رادياتير بمقاس ${radiator}mm. المقاسات المدعومة: ${supported.join("، ")}mm.`,
              ["COOLER", "CASE"],
            ),
          );
        }
      } else {
        const height = numberValue(COOLER, "heightMm");
        const max = numberValue(CASE, "maxCoolerHeightMm");
        if (height === null || max === null) {
          issues.push(missing("cooler_case_height", "لا يتوفر ارتفاع المشتت أو أقصى ارتفاع تدعمه الكيسة.", ["COOLER", "CASE"]));
        } else if (height > max) {
          issues.push(
            issue(
              "cooler_case_height",
              "ERROR",
              `ارتفاع المشتت (${height}mm) أكبر من المساحة المتاحة في الكيسة (${max}mm).`,
              ["COOLER", "CASE"],
            ),
          );
        }
      }
      return issues;
    },
  },
  {
    key: "cooler_socket",
    label: "دعم المشتت لمقبس المعالج",
    description: "يجب أن يدعم المشتت مقبس المعالج المختار.",
    check: ({ selection }) => {
      const { COOLER, CPU } = selection;
      if (!COOLER || !CPU) return [];
      const socket = text(CPU, "socket");
      const supported = list(COOLER, "socketSupport");
      if (!socket || supported.length === 0) {
        return [missing("cooler_socket", "لا تتوفر بيانات مقبس المعالج أو المقابس المدعومة للمشتت.", ["COOLER", "CPU"])];
      }
      if (!includesNormalized(supported, socket)) {
        return [
          issue(
            "cooler_socket",
            "ERROR",
            `المشتت لا يذكر دعم مقبس المعالج (${socket}).`,
            ["COOLER", "CPU"],
            "تأكد من توفر كتيب التركيب المناسب للمقبس.",
          ),
        ];
      }
      return [];
    },
  },
  {
    key: "storage_m2",
    label: "منافذ M.2 للتخزين",
    description: "عدد أقراص NVMe يجب ألا يتجاوز منافذ M.2 في اللوحة.",
    check: ({ selection }) => {
      const { MOTHERBOARD } = selection;
      const storages = selection.STORAGE ?? [];
      if (!MOTHERBOARD || storages.length === 0) return [];
      const m2Drives = storages.filter((s) => {
        const iface = text(s, "interface");
        const form = text(s, "formFactor");
        return (iface && /nvme|m\.?2|pcie/i.test(iface)) || (form && /m\.?2/i.test(form));
      });
      if (m2Drives.length === 0) return [];
      const slots = numberValue(MOTHERBOARD, "m2Slots");
      if (slots === null) {
        return [missing("storage_m2", "لا يتوفر عدد منافذ M.2 في اللوحة الأم للتأكد من توافق التخزين.", ["MOTHERBOARD", "STORAGE"])];
      }
      if (m2Drives.length > slots) {
        return [
          issue(
            "storage_m2",
            "ERROR",
            `اخترت ${m2Drives.length} أقراص M.2 بينما اللوحة بها ${slots} منافذ M.2 فقط.`,
            ["MOTHERBOARD", "STORAGE"],
          ),
        ];
      }
      return [];
    },
  },
  {
    key: "storage_sata",
    label: "منافذ SATA للتخزين",
    description: "عدد أقراص SATA يجب ألا يتجاوز منافذ SATA في اللوحة.",
    check: ({ selection }) => {
      const { MOTHERBOARD } = selection;
      const storages = selection.STORAGE ?? [];
      if (!MOTHERBOARD || storages.length === 0) return [];
      const sataDrives = storages.filter((s) => {
        const iface = text(s, "interface");
        return iface ? /sata/i.test(iface) : false;
      });
      if (sataDrives.length === 0) return [];
      const ports = numberValue(MOTHERBOARD, "sataPorts");
      if (ports === null) {
        return [missing("storage_sata", "لا يتوفر عدد منافذ SATA في اللوحة الأم للتأكد من توافق التخزين.", ["MOTHERBOARD", "STORAGE"])];
      }
      if (sataDrives.length > ports) {
        return [
          issue(
            "storage_sata",
            "ERROR",
            `اخترت ${sataDrives.length} أقراص SATA بينما اللوحة بها ${ports} منافذ SATA فقط.`,
            ["MOTHERBOARD", "STORAGE"],
          ),
        ];
      }
      return [];
    },
  },
  {
    key: "storage_bays",
    label: "أماكن تركيب التخزين في الكيسة",
    description: "يتحقق من توفر أماكن 3.5 أو 2.5 بوصة داخل الكيسة.",
    check: ({ selection }) => {
      const { CASE } = selection;
      const storages = selection.STORAGE ?? [];
      if (!CASE || storages.length === 0) return [];
      const fifteen = storages.filter((s) => {
        const form = text(s, "formFactor");
        return form ? /3\.5|3,5|35/i.test(form) : false;
      }).length;
      const twentyFive = storages.filter((s) => {
        const form = text(s, "formFactor");
        return form ? /2\.5|2,5/i.test(form) : false;
      }).length;
      const issues: CompatibilityIssue[] = [];
      if (fifteen > 0) {
        const bays = numberValue(CASE, "driveBays35");
        if (bays === null) {
          issues.push(missing("storage_bays", "لا يتوفر عدد أماكن 3.5 بوصة في الكيسة.", ["CASE", "STORAGE"]));
        } else if (fifteen > bays) {
          issues.push(
            issue("storage_bays", "ERROR", `اخترت ${fifteen} أقراص 3.5 بوصة بينما الكيسة بها ${bays} أماكن فقط.`, ["CASE", "STORAGE"]),
          );
        }
      }
      if (twentyFive > 0) {
        const bays = numberValue(CASE, "driveBays25");
        if (bays === null) {
          issues.push(missing("storage_bays", "لا يتوفر عدد أماكن 2.5 بوصة في الكيسة.", ["CASE", "STORAGE"]));
        } else if (twentyFive > bays) {
          issues.push(
            issue("storage_bays", "ERROR", `اخترت ${twentyFive} أقراص 2.5 بوصة بينما الكيسة بها ${bays} أماكن فقط.`, ["CASE", "STORAGE"]),
          );
        }
      }
      return issues;
    },
  },
  {
    key: "psu_wattage",
    label: "قدرة مزود الطاقة",
    description: "تحسب الحمل التقديري وتقارنه بقدرة مزود الطاقة مع هامش أمان.",
    check: ({ selection, config }) => {
      const { CPU, GPU, PSU } = selection;
      if (!PSU) return [];
      const psuWatt = numberValue(PSU, "wattage");
      if (psuWatt === null) {
        return [missing("psu_wattage", "لا تتوفر قدرة مزود الطاقة للتأكد من كفايتها.", ["PSU"])];
      }
      const cpuTdp = CPU ? numberValue(CPU, "tdp") : 0;
      const gpuTdp = GPU ? numberValue(GPU, "tdp") : 0;
      const recommendedPsu = GPU ? numberValue(GPU, "recommendedPsu") : null;
      const unknownLoad = (CPU ? cpuTdp === null : false) || (GPU ? gpuTdp === null : false);
      const estimatedLoad = (cpuTdp ?? 0) + (gpuTdp ?? 0) + 100;
      const headroom = Number(config.headroomPercent ?? 30);
      const computedRecommendation = Math.ceil((estimatedLoad * (1 + headroom / 100)) / 50) * 50;
      const recommended = Math.max(computedRecommendation, recommendedPsu ?? 0);

      if (psuWatt < estimatedLoad && !unknownLoad) {
        return [
          issue(
            "psu_wattage",
            "ERROR",
            `قدرة مزود الطاقة (${psuWatt}W) أقل من الحمل التقديري للتجميعة (${estimatedLoad}W تقريبًا).`,
            ["PSU", "CPU", "GPU"],
            "اختر مزود طاقة بقدرة أعلى من الشركة المصنعة.",
          ),
        ];
      }
      if (unknownLoad || recommendedPsu === null) {
        return [
          missing(
            "psu_wattage",
            "لا تتوفر بيانات استهلاك المعالج أو كارت الشاشة لحساب قدرة مزود الطاقة بدقة.",
            ["PSU", "CPU", "GPU"],
            "اعتمد على القدرة الموصى بها من الشركة المصنعة.",
          ),
        ];
      }
      if (psuWatt < recommended) {
        return [
          issue(
            "psu_wattage",
            "WARNING",
            `قدرة مزود الطاقة (${psuWatt}W) أقل من القدرة الموصى بها (${recommended}W) مع هامش أمان.`,
            ["PSU", "CPU", "GPU"],
            "قد يعمل النظام لكن بدون هامش كافٍ للتحديثات أو ذروة الاستهلاك.",
          ),
        ];
      }
      return [];
    },
  },
  {
    key: "psu_gpu_connectors",
    label: "موصلات طاقة كارت الشاشة",
    description: "يتحقق من توفر موصلات PCIe اللازمة للكارت في مزود الطاقة.",
    check: ({ selection }) => {
      const { GPU, PSU } = selection;
      if (!GPU || !PSU) return [];
      const required12 = countConnectors(GPU, "powerConnectors", /12vhpwr|12v-2x6/i);
      const required8 = countConnectors(GPU, "powerConnectors", /8\s*pin/i);
      const required6 = countConnectors(GPU, "powerConnectors", /6\s*pin/i);
      if (required12 === null && required8 === null && required6 === null) {
        return [missing("psu_gpu_connectors", "لا تتوفر بيانات موصلات الطاقة المطلوبة لكارت الشاشة.", ["GPU", "PSU"])];
      }
      const available8 = numberValue(PSU, "pcie8pin");
      const available12 = numberValue(PSU, "pcie12vhpwr");
      const available6 = numberValue(PSU, "pcie6pin");
      if (available8 === null && available12 === null && available6 === null) {
        return [missing("psu_gpu_connectors", "لا تتوفر بيانات موصلات PCIe في مزود الطاقة.", ["GPU", "PSU"])];
      }
      const issues: CompatibilityIssue[] = [];
      if ((required12 ?? 0) > (available12 ?? 0)) {
        issues.push(
          issue(
            "psu_gpu_connectors",
            "ERROR",
            "كارت الشاشة يحتاج موصل 12VHPWR غير متوفر في مزود الطاقة.",
            ["GPU", "PSU"],
            "استخدم مزود طاقة حديث يدعم 12VHPWR أو الكابل المرفق رسميًا من الشركة المصنعة للكارت.",
          ),
        );
      }
      if ((required8 ?? 0) > (available8 ?? 0)) {
        issues.push(
          issue(
            "psu_gpu_connectors",
            "ERROR",
            `كارت الشاشة يحتاج ${required8} موصل 8-pin بينما مزود الطاقة يوفر ${available8 ?? 0}.`,
            ["GPU", "PSU"],
          ),
        );
      }
      if ((required6 ?? 0) > (available6 ?? 0)) {
        issues.push(
          issue(
            "psu_gpu_connectors",
            "WARNING",
            `كارت الشاشة يحتاج ${required6} موصل 6-pin بينما مزود الطاقة يوفر ${available6 ?? 0}؛ قد تحتاج محولًا.`,
            ["GPU", "PSU"],
          ),
        );
      }
      return issues;
    },
  },
  {
    key: "psu_cpu_connectors",
    label: "موصل طاقة المعالج",
    description: "يتحقق من وجود موصل EPS للوحة الأم.",
    check: ({ selection }) => {
      const { CPU, PSU } = selection;
      if (!CPU || !PSU) return [];
      const available = numberValue(PSU, "cpu8pin");
      if (available === null) {
        return [missing("psu_cpu_connectors", "لا تتوفر بيانات موصلات طاقة المعالج (EPS) في مزود الطاقة.", ["PSU", "CPU"])];
      }
      if (available < 1) {
        return [
          issue(
            "psu_cpu_connectors",
            "WARNING",
            "مزود الطاقة لا يذكر موصل EPS 8-pin لتغذية المعالج.",
            ["PSU", "CPU"],
            "تأكد من وجود كابل CPU 4+4 pin.",
          ),
        ];
      }
      return [];
    },
  },
  {
    key: "psu_case_fit",
    label: "مقاس ومزود الطاقة والكيسة",
    description: "يتحقق من نوع ومقاس مزود الطاقة داخل الكيسة.",
    check: ({ selection }) => {
      const { PSU, CASE } = selection;
      if (!PSU || !CASE) return [];
      const psuForm = text(PSU, "formFactor");
      const supported = list(CASE, "supportedPsuFormFactors");
      const psuLength = numberValue(PSU, "lengthMm");
      const maxLength = numberValue(CASE, "maxPsuLengthMm");
      const issues: CompatibilityIssue[] = [];
      if (psuForm && supported.length > 0 && !includesNormalized(supported, psuForm)) {
        issues.push(
          issue(
            "psu_case_fit",
            "ERROR",
            `نوع مزود الطاقة (${psuForm}) غير مدعوم في الكيسة. المدعوم: ${supported.join("، ")}.`,
            ["PSU", "CASE"],
          ),
        );
      }
      if (psuLength !== null && maxLength !== null && psuLength > maxLength) {
        issues.push(
          issue(
            "psu_case_fit",
            "ERROR",
            `طول مزود الطاقة (${psuLength}mm) أكبر من المساحة المتاحة في الكيسة (${maxLength}mm).`,
            ["PSU", "CASE"],
          ),
        );
      }
      return issues;
    },
  },
];

export function statusFromIssues(issues: CompatibilityIssue[]): CompatibilityStatus {
  if (issues.some((i) => i.severity === "ERROR")) return "INCOMPATIBLE";
  if (issues.some((i) => i.severity === "UNKNOWN")) return "INSUFFICIENT_DATA";
  if (issues.some((i) => i.severity === "WARNING")) return "WARNING";
  return "COMPATIBLE";
}

export const RULE_DEFINITIONS = RULES.map(({ key, label, description }) => ({ key, label, description }));

export function missingRequiredSlots(selection: BuildSelection): BuildSlot[] {
  return requiredSlots(selection).filter((slot) => {
    if (slot === "STORAGE") return (selection.STORAGE ?? []).length === 0;
    return !selection[slot];
  });
}

export function totalForSelection(selection: BuildSelection): number {
  const all: BuildComponent[] = [
    selection.CPU,
    selection.MOTHERBOARD,
    selection.RAM,
    selection.GPU,
    selection.PSU,
    selection.CASE,
    selection.COOLER,
    selection.MONITOR,
    ...(selection.STORAGE ?? []),
    ...(selection.ACCESSORY ?? []),
  ].filter((item): item is BuildComponent => Boolean(item));
  return Math.round(all.reduce((sum, item) => sum + item.price, 0) * 100) / 100;
}

export function specSummary(specs: SpecMap, keys: string[]): string[] {
  return keys
    .map((key) => {
      const value = specs[key];
      if (value === undefined || value === null || value === "") return null;
      return `${key}: ${String(value)}`;
    })
    .filter((v): v is string => Boolean(v));
}
