import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { DEFAULT_CATEGORIES } from "../src/lib/constants";

const prisma = new PrismaClient();
const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
) => Promise<Buffer>;

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password.normalize("NFKC"), salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

type SeedSpec = {
  key: string;
  label: string;
  value: string;
  type?: "TEXT" | "NUMBER" | "BOOLEAN";
  numeric?: number;
  unit?: string;
  group?: string;
};

type SeedProduct = {
  sku: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  model?: string;
  categorySlug: string;
  brand: string;
  price: number;
  compareAtPrice?: number;
  quantity: number;
  warrantyMonths?: number;
  featured?: boolean;
  type?: "COMPONENT" | "PREBUILT";
  descriptionAr: string;
  specs: SeedSpec[];
  image?: number;
};

const BRANDS = [
  "Intel",
  "AMD",
  "NVIDIA",
  "ASUS",
  "MSI",
  "Gigabyte",
  "Corsair",
  "Kingston",
  "Samsung",
  "Western Digital",
  "Seasonic",
  "DeepCool",
  "Lian Li",
  "Cooler Master",
  "LG",
  "Logitech",
];

const spec = (
  key: string,
  label: string,
  value: string,
  extra: Partial<SeedSpec> = {},
): SeedSpec => ({ key, label, value, ...extra });

const PRODUCTS: SeedProduct[] = [
  // ------------------------------- المعالجات -------------------------------
  {
    sku: "CPU-INT-I5-14400F",
    slug: "intel-core-i5-14400f",
    nameAr: "معالج Intel Core i5-14400F — 10 أنوية",
    nameEn: "Intel Core i5-14400F",
    model: "i5-14400F",
    categorySlug: "cpu",
    brand: "Intel",
    price: 12500,
    compareAtPrice: 13900,
    quantity: 12,
    featured: true,
    descriptionAr:
      "معالج Intel Core i5-14400F بعشرة أنوية (6 أداء + 4 كفاءة) و16 خيطًا. خيار ممتاز للألعاب والاستخدام اليومي مع كارت شاشة منفصل. مقبس LGA1700 ويعمل مع لوحات B760 وZ790.",
    specs: [
      spec("socket", "المقبس", "LGA1700"),
      spec("chipsetSupport", "الشرائح المدعومة", "B760, Z790, H770, B660, Z690"),
      spec("cpuFamily", "عائلة المعالج", "Raptor Lake", { group: "المعالج" }),
      spec("cores", "عدد الأنوية", "10", { type: "NUMBER", numeric: 10 }),
      spec("threads", "عدد الخيوط", "16", { type: "NUMBER", numeric: 16 }),
      spec("tdp", "الاستهلاك الحراري", "65", { type: "NUMBER", numeric: 65, unit: "W" }),
      spec("integratedGraphics", "رسوميات مدمجة", "لا", { type: "BOOLEAN", value: "false" }),
      spec("minBiosVersion", "أقل إصدار BIOS", "1.0"),
    ],
  },
  {
    sku: "CPU-INT-I7-14700K",
    slug: "intel-core-i7-14700k",
    nameAr: "معالج Intel Core i7-14700K — 20 نوية",
    nameEn: "Intel Core i7-14700K",
    model: "i7-14700K",
    categorySlug: "cpu",
    brand: "Intel",
    price: 27500,
    compareAtPrice: 29800,
    quantity: 6,
    featured: true,
    descriptionAr:
      "معالج i7-14700K بعشرين نوية و28 خيطًا، بترددات عالية وأداء احترافي للألعاب والتحرير. يحتاج تبريدًا جيدًا ولوحة Z790 للاستفادة الكاملة من كسر السرعة.",
    specs: [
      spec("socket", "المقبس", "LGA1700"),
      spec("chipsetSupport", "الشرائح المدعومة", "Z790, B760, Z690, H770"),
      spec("cpuFamily", "عائلة المعالج", "Raptor Lake Refresh"),
      spec("cores", "عدد الأنوية", "20", { type: "NUMBER", numeric: 20 }),
      spec("threads", "عدد الخيوط", "28", { type: "NUMBER", numeric: 28 }),
      spec("tdp", "الاستهلاك الحراري", "125", { type: "NUMBER", numeric: 125, unit: "W" }),
      spec("integratedGraphics", "رسوميات مدمجة", "نعم", { type: "BOOLEAN", value: "true" }),
      spec("minBiosVersion", "أقل إصدار BIOS", "1.2"),
    ],
  },
  {
    sku: "CPU-AMD-R5-7600",
    slug: "amd-ryzen-5-7600",
    nameAr: "معالج AMD Ryzen 5 7600 — 6 أنوية",
    nameEn: "AMD Ryzen 5 7600",
    model: "Ryzen 5 7600",
    categorySlug: "cpu",
    brand: "AMD",
    price: 14500,
    quantity: 9,
    featured: true,
    descriptionAr:
      "معالج Ryzen 5 7600 بستة أنوية و12 خيطًا على منصة AM5. كفاءة عالية في الطاقة وأداء قوي للألعاب، مع رسوميات مدمجة تسمح بتشغيل الجهاز قبل شراء كارت شاشة.",
    specs: [
      spec("socket", "المقبس", "AM5"),
      spec("chipsetSupport", "الشرائح المدعومة", "B650, X670, A620, X670E, B650E"),
      spec("cpuFamily", "عائلة المعالج", "Zen 4"),
      spec("cores", "عدد الأنوية", "6", { type: "NUMBER", numeric: 6 }),
      spec("threads", "عدد الخيوط", "12", { type: "NUMBER", numeric: 12 }),
      spec("tdp", "الاستهلاك الحراري", "65", { type: "NUMBER", numeric: 65, unit: "W" }),
      spec("integratedGraphics", "رسوميات مدمجة", "نعم", { type: "BOOLEAN", value: "true" }),
      spec("minBiosVersion", "أقل إصدار BIOS", "1.0"),
    ],
  },
  {
    sku: "CPU-AMD-R7-7800X3D",
    slug: "amd-ryzen-7-7800x3d",
    nameAr: "معالج AMD Ryzen 7 7800X3D — 8 أنوية",
    nameEn: "AMD Ryzen 7 7800X3D",
    model: "Ryzen 7 7800X3D",
    categorySlug: "cpu",
    brand: "AMD",
    price: 32000,
    compareAtPrice: 34500,
    quantity: 4,
    descriptionAr:
      "من أقوى معالجات الألعاب بفضل ذاكرة 3D V-Cache بسعة 96 ميجابايت. ثمانية أنوية على منصة AM5 مع كفاءة طاقة ممتازة.",
    specs: [
      spec("socket", "المقبس", "AM5"),
      spec("chipsetSupport", "الشرائح المدعومة", "B650, X670, X670E, B650E"),
      spec("cpuFamily", "عائلة المعالج", "Zen 4"),
      spec("cores", "عدد الأنوية", "8", { type: "NUMBER", numeric: 8 }),
      spec("threads", "عدد الخيوط", "16", { type: "NUMBER", numeric: 16 }),
      spec("tdp", "الاستهلاك الحراري", "120", { type: "NUMBER", numeric: 120, unit: "W" }),
      spec("integratedGraphics", "رسوميات مدمجة", "نعم", { type: "BOOLEAN", value: "true" }),
      spec("minBiosVersion", "أقل إصدار BIOS", "1.1"),
    ],
  },

  // ------------------------------- اللوحات الأم -------------------------------
  {
    sku: "MB-ASUS-B760M-D5",
    slug: "asus-prime-b760m-a-ddr5",
    nameAr: "لوحة أم ASUS Prime B760M-A — DDR5",
    nameEn: "ASUS Prime B760M-A DDR5",
    model: "B760M-A",
    categorySlug: "motherboards",
    brand: "ASUS",
    price: 8500,
    quantity: 8,
    featured: true,
    descriptionAr:
      "لوحة أم micro-ATX بمقبس LGA1700 وشريحة B760، تدعم ذاكرة DDR5 حتى 128 جيجابايت ومنفذي M.2. مناسبة لتجميعات الألعاب متوسطة الحجم.",
    specs: [
      spec("socket", "المقبس", "LGA1700"),
      spec("chipset", "مجموعة الشرائح", "B760"),
      spec("ramType", "نوع الذاكرة", "DDR5"),
      spec("ramSlots", "عدد فتحات الرامات", "4", { type: "NUMBER", numeric: 4 }),
      spec("maxRamCapacity", "أقصى سعة رامات", "128", { type: "NUMBER", numeric: 128, unit: "GB" }),
      spec("maxRamSpeed", "أقصى سرعة رامات", "7200", { type: "NUMBER", numeric: 7200, unit: "MHz" }),
      spec("formFactor", "مقاس اللوحة", "mATX"),
      spec("m2Slots", "منافذ M.2", "2", { type: "NUMBER", numeric: 2 }),
      spec("sataPorts", "منافذ SATA", "4", { type: "NUMBER", numeric: 4 }),
      spec("biosVersion", "إصدار BIOS", "1.4"),
      spec("biosSupportsCpuFamilies", "عائلات المعالجات المدعومة", "Raptor Lake, Raptor Lake Refresh"),
    ],
  },
  {
    sku: "MB-MSI-Z790-D5",
    slug: "msi-pro-z790-a-ddr5",
    nameAr: "لوحة أم MSI PRO Z790-A — DDR5",
    nameEn: "MSI PRO Z790-A DDR5",
    model: "Z790-A",
    categorySlug: "motherboards",
    brand: "MSI",
    price: 15500,
    quantity: 5,
    descriptionAr:
      "لوحة ATX كاملة بشريحة Z790 ودعم كسر السرعة، أربعة منافذ M.2 وستة منافذ SATA، مع مراحل تغذية قوية للمعالجات عالية الأداء.",
    specs: [
      spec("socket", "المقبس", "LGA1700"),
      spec("chipset", "مجموعة الشرائح", "Z790"),
      spec("ramType", "نوع الذاكرة", "DDR5"),
      spec("ramSlots", "عدد فتحات الرامات", "4", { type: "NUMBER", numeric: 4 }),
      spec("maxRamCapacity", "أقصى سعة رامات", "128", { type: "NUMBER", numeric: 128, unit: "GB" }),
      spec("maxRamSpeed", "أقصى سرعة رامات", "7800", { type: "NUMBER", numeric: 7800, unit: "MHz" }),
      spec("formFactor", "مقاس اللوحة", "ATX"),
      spec("m2Slots", "منافذ M.2", "4", { type: "NUMBER", numeric: 4 }),
      spec("sataPorts", "منافذ SATA", "6", { type: "NUMBER", numeric: 6 }),
      spec("biosVersion", "إصدار BIOS", "1.5"),
      spec("biosSupportsCpuFamilies", "عائلات المعالجات المدعومة", "Raptor Lake, Raptor Lake Refresh"),
    ],
  },
  {
    sku: "MB-ASUS-B650M-D5",
    slug: "asus-prime-b650m-a-ddr5",
    nameAr: "لوحة أم ASUS Prime B650M-A — AM5",
    nameEn: "ASUS Prime B650M-A DDR5",
    model: "B650M-A",
    categorySlug: "motherboards",
    brand: "ASUS",
    price: 9500,
    quantity: 7,
    featured: true,
    descriptionAr:
      "لوحة micro-ATX لمنصة AM5 بشريحة B650، تدعم معالجات Ryzen 7000/8000 وذاكرة DDR5 حتى 128 جيجابايت، مع منفذي M.2.",
    specs: [
      spec("socket", "المقبس", "AM5"),
      spec("chipset", "مجموعة الشرائح", "B650"),
      spec("ramType", "نوع الذاكرة", "DDR5"),
      spec("ramSlots", "عدد فتحات الرامات", "4", { type: "NUMBER", numeric: 4 }),
      spec("maxRamCapacity", "أقصى سعة رامات", "128", { type: "NUMBER", numeric: 128, unit: "GB" }),
      spec("maxRamSpeed", "أقصى سرعة رامات", "6400", { type: "NUMBER", numeric: 6400, unit: "MHz" }),
      spec("formFactor", "مقاس اللوحة", "mATX"),
      spec("m2Slots", "منافذ M.2", "2", { type: "NUMBER", numeric: 2 }),
      spec("sataPorts", "منافذ SATA", "4", { type: "NUMBER", numeric: 4 }),
      spec("biosVersion", "إصدار BIOS", "1.1"),
      spec("biosSupportsCpuFamilies", "عائلات المعالجات المدعومة", "Zen 4"),
    ],
  },
  {
    sku: "MB-GIG-X670E",
    slug: "gigabyte-x670e-aorus-elite",
    nameAr: "لوحة أم Gigabyte X670E AORUS Elite — AM5",
    nameEn: "Gigabyte X670E AORUS Elite",
    model: "X670E AORUS Elite",
    categorySlug: "motherboards",
    brand: "Gigabyte",
    price: 18500,
    quantity: 3,
    descriptionAr:
      "لوحة ATX رائدة لمنصة AM5 بشريحة X670E، دعم PCIe 5.0 وأربعة منافذ M.2 ومراحل تغذية قوية. للمحترفين وصناع المحتوى.",
    specs: [
      spec("socket", "المقبس", "AM5"),
      spec("chipset", "مجموعة الشرائح", "X670E"),
      spec("ramType", "نوع الذاكرة", "DDR5"),
      spec("ramSlots", "عدد فتحات الرامات", "4", { type: "NUMBER", numeric: 4 }),
      spec("maxRamCapacity", "أقصى سعة رامات", "192", { type: "NUMBER", numeric: 192, unit: "GB" }),
      spec("maxRamSpeed", "أقصى سرعة رامات", "8000", { type: "NUMBER", numeric: 8000, unit: "MHz" }),
      spec("formFactor", "مقاس اللوحة", "ATX"),
      spec("m2Slots", "منافذ M.2", "4", { type: "NUMBER", numeric: 4 }),
      spec("sataPorts", "منافذ SATA", "6", { type: "NUMBER", numeric: 6 }),
      spec("biosVersion", "إصدار BIOS", "1.2"),
      spec("biosSupportsCpuFamilies", "عائلات المعالجات المدعومة", "Zen 4"),
    ],
  },

  // ------------------------------- الرامات -------------------------------
  {
    sku: "RAM-KING-16-6000",
    slug: "kingston-fury-16gb-ddr5-6000",
    nameAr: "رامات Kingston Fury Beast 16GB DDR5 6000",
    nameEn: "Kingston Fury Beast 16GB DDR5 6000",
    model: "KF560C36BBE-16",
    categorySlug: "ram",
    brand: "Kingston",
    price: 4200,
    quantity: 15,
    descriptionAr: "وحدة رامات DDR5 بسعة 16 جيجابايت وسرعة 6000 ميجاهرتز، بتصميم تبريد منخفض الارتفاع.",
    specs: [
      spec("ramType", "نوع الذاكرة", "DDR5"),
      spec("modules", "عدد الوحدات", "1", { type: "NUMBER", numeric: 1 }),
      spec("capacityGB", "سعة الوحدة", "16", { type: "NUMBER", numeric: 16, unit: "GB" }),
      spec("speed", "السرعة", "6000", { type: "NUMBER", numeric: 6000, unit: "MHz" }),
      spec("formFactor", "المقاس", "DIMM"),
    ],
  },
  {
    sku: "RAM-KING-32-6000",
    slug: "kingston-fury-32gb-ddr5-6000",
    nameAr: "طقم رامات Kingston Fury 32GB (2×16) DDR5 6000",
    nameEn: "Kingston Fury 32GB (2x16) DDR5 6000",
    model: "KF560C36BBEK2-32",
    categorySlug: "ram",
    brand: "Kingston",
    price: 7800,
    compareAtPrice: 8400,
    quantity: 10,
    featured: true,
    descriptionAr: "طقم من وحدتين بسعة 32 جيجابايت إجمالًا وسرعة 6000 ميجاهرتز، مثالي للألعاب والتحرير.",
    specs: [
      spec("ramType", "نوع الذاكرة", "DDR5"),
      spec("modules", "عدد الوحدات", "2", { type: "NUMBER", numeric: 2 }),
      spec("capacityGB", "سعة الوحدة", "16", { type: "NUMBER", numeric: 16, unit: "GB" }),
      spec("speed", "السرعة", "6000", { type: "NUMBER", numeric: 6000, unit: "MHz" }),
      spec("formFactor", "المقاس", "DIMM"),
    ],
  },
  {
    sku: "RAM-COR-16-3200",
    slug: "corsair-vengeance-16gb-ddr4-3200",
    nameAr: "طقم رامات Corsair Vengeance 16GB (2×8) DDR4 3200",
    nameEn: "Corsair Vengeance 16GB (2x8) DDR4 3200",
    model: "CMK16GX4M2E3200C16",
    categorySlug: "ram",
    brand: "Corsair",
    price: 2800,
    quantity: 11,
    descriptionAr: "طقم DDR4 كلاسيكي بسعة 16 جيجابايت وسرعة 3200 ميجاهرتز للمنصات الأقدم.",
    specs: [
      spec("ramType", "نوع الذاكرة", "DDR4"),
      spec("modules", "عدد الوحدات", "2", { type: "NUMBER", numeric: 2 }),
      spec("capacityGB", "سعة الوحدة", "8", { type: "NUMBER", numeric: 8, unit: "GB" }),
      spec("speed", "السرعة", "3200", { type: "NUMBER", numeric: 3200, unit: "MHz" }),
      spec("formFactor", "المقاس", "DIMM"),
    ],
  },

  // ------------------------------- كروت الشاشة -------------------------------
  {
    sku: "GPU-ASUS-RTX4060-8G",
    slug: "asus-dual-rtx-4060-8gb",
    nameAr: "كارت شاشة ASUS Dual GeForce RTX 4060 8GB",
    nameEn: "ASUS Dual GeForce RTX 4060 8GB",
    model: "DUAL-RTX4060-8G",
    categorySlug: "gpu",
    brand: "ASUS",
    price: 19500,
    compareAtPrice: 21500,
    quantity: 7,
    featured: true,
    descriptionAr:
      "كارت شاشة اقتصادي للألعاب بدقة 1080p مع تقنيات DLSS 3 وتوليد الإطارات. مروحتان وطول 200 مم يناسب أغلب الكيسات.",
    specs: [
      spec("lengthMm", "الطول", "200", { type: "NUMBER", numeric: 200, unit: "mm" }),
      spec("thicknessSlots", "السُمك", "2", { type: "NUMBER", numeric: 2, unit: "slot" }),
      spec("tdp", "استهلاك الطاقة", "115", { type: "NUMBER", numeric: 115, unit: "W" }),
      spec("recommendedPsu", "مزود الطاقة الموصى به", "450", { type: "NUMBER", numeric: 450, unit: "W" }),
      spec("powerConnectors", "موصلات الطاقة", "8-pin x1"),
      spec("vram", "ذاكرة الكارت", "8", { type: "NUMBER", numeric: 8, unit: "GB" }),
    ],
  },
  {
    sku: "GPU-MSI-RTX4070S-12G",
    slug: "msi-ventus-rtx-4070-super-12gb",
    nameAr: "كارت شاشة MSI Ventus 3X RTX 4070 Super 12GB",
    nameEn: "MSI Ventus 3X RTX 4070 Super 12GB",
    model: "RTX 4070 SUPER VENTUS 3X",
    categorySlug: "gpu",
    brand: "MSI",
    price: 38500,
    compareAtPrice: 41000,
    quantity: 4,
    featured: true,
    descriptionAr:
      "كارت شاشة قوي للألعاب بدقة 1440p مع 12 جيجابايت GDDR6X وثلاث مراوح. يقدم أداءً ممتازًا مع تقنيات DLSS 3.5.",
    specs: [
      spec("lengthMm", "الطول", "308", { type: "NUMBER", numeric: 308, unit: "mm" }),
      spec("thicknessSlots", "السُمك", "3", { type: "NUMBER", numeric: 3, unit: "slot" }),
      spec("tdp", "استهلاك الطاقة", "220", { type: "NUMBER", numeric: 220, unit: "W" }),
      spec("recommendedPsu", "مزود الطاقة الموصى به", "650", { type: "NUMBER", numeric: 650, unit: "W" }),
      spec("powerConnectors", "موصلات الطاقة", "8-pin x1"),
      spec("vram", "ذاكرة الكارت", "12", { type: "NUMBER", numeric: 12, unit: "GB" }),
    ],
  },
  {
    sku: "GPU-GIG-RX7800XT-16G",
    slug: "gigabyte-radeon-rx-7800-xt-16gb",
    nameAr: "كارت شاشة Gigabyte Radeon RX 7800 XT 16GB",
    nameEn: "Gigabyte Radeon RX 7800 XT 16GB",
    model: "GV-R78XTGAMING OC-16GD",
    categorySlug: "gpu",
    brand: "Gigabyte",
    price: 34000,
    quantity: 5,
    descriptionAr:
      "كارت شاشة بذاكرة 16 جيجابايت مناسب لـ1440p، بثلاث مراوح وتبريد قوي. يحتاج موصلي 8-pin ومزود طاقة 700 واط على الأقل.",
    specs: [
      spec("lengthMm", "الطول", "320", { type: "NUMBER", numeric: 320, unit: "mm" }),
      spec("thicknessSlots", "السُمك", "3", { type: "NUMBER", numeric: 3, unit: "slot" }),
      spec("tdp", "استهلاك الطاقة", "263", { type: "NUMBER", numeric: 263, unit: "W" }),
      spec("recommendedPsu", "مزود الطاقة الموصى به", "700", { type: "NUMBER", numeric: 700, unit: "W" }),
      spec("powerConnectors", "موصلات الطاقة", "8-pin x2"),
      spec("vram", "ذاكرة الكارت", "16", { type: "NUMBER", numeric: 16, unit: "GB" }),
    ],
  },

  // ------------------------------- مزودات الطاقة -------------------------------
  {
    sku: "PSU-COR-650-BRONZE",
    slug: "corsair-cv650-650w-bronze",
    nameAr: "مزود طاقة Corsair CV650 — 650W Bronze",
    nameEn: "Corsair CV650 650W Bronze",
    model: "CV650",
    categorySlug: "psu",
    brand: "Corsair",
    price: 3200,
    quantity: 10,
    descriptionAr: "مزود طاقة 650 واط بشهادة 80 PLUS Bronze وموصلي PCIe 8-pin، مناسب للتجميعات الاقتصادية.",
    specs: [
      spec("wattage", "القدرة", "650", { type: "NUMBER", numeric: 650, unit: "W" }),
      spec("efficiency", "الكفاءة", "80 PLUS Bronze"),
      spec("pcie8pin", "موصلات PCIe 8-pin", "2", { type: "NUMBER", numeric: 2 }),
      spec("pcie12vhpwr", "موصل 12VHPWR", "0", { type: "NUMBER", numeric: 0 }),
      spec("pcie6pin", "موصلات PCIe 6-pin", "0", { type: "NUMBER", numeric: 0 }),
      spec("cpu8pin", "موصلات CPU 8-pin", "1", { type: "NUMBER", numeric: 1 }),
      spec("formFactor", "النوع", "ATX"),
      spec("lengthMm", "الطول", "140", { type: "NUMBER", numeric: 140, unit: "mm" }),
    ],
  },
  {
    sku: "PSU-SEA-750-GOLD",
    slug: "seasonic-focus-gx-750-750w-gold",
    nameAr: "مزود طاقة Seasonic Focus GX-750 — 750W Gold",
    nameEn: "Seasonic Focus GX-750 750W Gold",
    model: "Focus GX-750",
    categorySlug: "psu",
    brand: "Seasonic",
    price: 4800,
    compareAtPrice: 5200,
    quantity: 6,
    featured: true,
    descriptionAr:
      "مزود طاقة 750 واط بشهادة 80 PLUS Gold وتصميم وحدات كامل، أربعة موصلات PCIe 8-pin ومروحة هادئة.",
    specs: [
      spec("wattage", "القدرة", "750", { type: "NUMBER", numeric: 750, unit: "W" }),
      spec("efficiency", "الكفاءة", "80 PLUS Gold"),
      spec("pcie8pin", "موصلات PCIe 8-pin", "4", { type: "NUMBER", numeric: 4 }),
      spec("pcie12vhpwr", "موصل 12VHPWR", "0", { type: "NUMBER", numeric: 0 }),
      spec("pcie6pin", "موصلات PCIe 6-pin", "0", { type: "NUMBER", numeric: 0 }),
      spec("cpu8pin", "موصلات CPU 8-pin", "2", { type: "NUMBER", numeric: 2 }),
      spec("formFactor", "النوع", "ATX"),
      spec("lengthMm", "الطول", "140", { type: "NUMBER", numeric: 140, unit: "mm" }),
    ],
  },
  {
    sku: "PSU-COR-850-GOLD",
    slug: "corsair-rm850e-850w-gold",
    nameAr: "مزود طاقة Corsair RM850e — 850W Gold",
    nameEn: "Corsair RM850e 850W Gold",
    model: "RM850e",
    categorySlug: "psu",
    brand: "Corsair",
    price: 6200,
    quantity: 4,
    descriptionAr:
      "مزود طاقة 850 واط بشهادة Gold وموصل 12VHPWR، مناسب لكروت الشاشة الحديثة والتجميعات عالية الأداء.",
    specs: [
      spec("wattage", "القدرة", "850", { type: "NUMBER", numeric: 850, unit: "W" }),
      spec("efficiency", "الكفاءة", "80 PLUS Gold"),
      spec("pcie8pin", "موصلات PCIe 8-pin", "4", { type: "NUMBER", numeric: 4 }),
      spec("pcie12vhpwr", "موصل 12VHPWR", "1", { type: "NUMBER", numeric: 1 }),
      spec("pcie6pin", "موصلات PCIe 6-pin", "0", { type: "NUMBER", numeric: 0 }),
      spec("cpu8pin", "موصلات CPU 8-pin", "2", { type: "NUMBER", numeric: 2 }),
      spec("formFactor", "النوع", "ATX"),
      spec("lengthMm", "الطول", "150", { type: "NUMBER", numeric: 150, unit: "mm" }),
    ],
  },

  // ------------------------------- الكيسات -------------------------------
  {
    sku: "CASE-DEEP-MATX",
    slug: "deepcool-matrexx-40-matx",
    nameAr: "كيسة DeepCool MATREXX 40 — mATX",
    nameEn: "DeepCool MATREXX 40 mATX",
    model: "MATREXX 40",
    categorySlug: "cases",
    brand: "DeepCool",
    price: 2200,
    quantity: 9,
    descriptionAr:
      "كيسة مدمجة تدعم لوحات mATX وMini-ITX، بزجاج جانبي وتهوية أمامية. مناسبة للتجميعات الاقتصادية.",
    specs: [
      spec("supportedFormFactors", "المقاسات المدعومة", "mATX, Mini-ITX"),
      spec("maxGpuLengthMm", "أقصى طول كارت شاشة", "320", { type: "NUMBER", numeric: 320, unit: "mm" }),
      spec("maxGpuThicknessSlots", "أقصى سُمك كارت", "3", { type: "NUMBER", numeric: 3, unit: "slot" }),
      spec("maxCoolerHeightMm", "أقصى ارتفاع مشتت", "160", { type: "NUMBER", numeric: 160, unit: "mm" }),
      spec("radiatorSupportMm", "أحجام الرادياتير", "120, 240"),
      spec("driveBays35", "أماكن 3.5 بوصة", "2", { type: "NUMBER", numeric: 2 }),
      spec("driveBays25", "أماكن 2.5 بوصة", "2", { type: "NUMBER", numeric: 2 }),
      spec("supportedPsuFormFactors", "أنواع مزود الطاقة", "ATX"),
      spec("maxPsuLengthMm", "أقصى طول مزود طاقة", "160", { type: "NUMBER", numeric: 160, unit: "mm" }),
    ],
  },
  {
    sku: "CASE-LIAN-ATX",
    slug: "lian-li-lancool-216-atx",
    nameAr: "كيسة Lian Li Lancool 216 — ATX",
    nameEn: "Lian Li Lancool 216 ATX",
    model: "Lancool 216",
    categorySlug: "cases",
    brand: "Lian Li",
    price: 5500,
    compareAtPrice: 6000,
    quantity: 5,
    featured: true,
    descriptionAr:
      "كيسة ATX بتهوية استثنائية ومروحتين أماميتين 160 مم. تدعم كروت الشاشة الطويلة ورادياتير حتى 360 مم.",
    specs: [
      spec("supportedFormFactors", "المقاسات المدعومة", "ATX, mATX, Mini-ITX"),
      spec("maxGpuLengthMm", "أقصى طول كارت شاشة", "400", { type: "NUMBER", numeric: 400, unit: "mm" }),
      spec("maxGpuThicknessSlots", "أقصى سُمك كارت", "4", { type: "NUMBER", numeric: 4, unit: "slot" }),
      spec("maxCoolerHeightMm", "أقصى ارتفاع مشتت", "170", { type: "NUMBER", numeric: 170, unit: "mm" }),
      spec("radiatorSupportMm", "أحجام الرادياتير", "240, 280, 360"),
      spec("driveBays35", "أماكن 3.5 بوصة", "2", { type: "NUMBER", numeric: 2 }),
      spec("driveBays25", "أماكن 2.5 بوصة", "4", { type: "NUMBER", numeric: 4 }),
      spec("supportedPsuFormFactors", "أنواع مزود الطاقة", "ATX"),
      spec("maxPsuLengthMm", "أقصى طول مزود طاقة", "210", { type: "NUMBER", numeric: 210, unit: "mm" }),
    ],
  },

  // ------------------------------- التبريد -------------------------------
  {
    sku: "COOL-DEEP-AK400",
    slug: "deepcool-ak400-air-cooler",
    nameAr: "مشتت هواء DeepCool AK400",
    nameEn: "DeepCool AK400 Air Cooler",
    model: "AK400",
    categorySlug: "cooling",
    brand: "DeepCool",
    price: 1800,
    quantity: 12,
    descriptionAr: "مشتت هواء بأربعة أنابيب حرارية ومروحة 120 مم، يدعم مقابس LGA1700 وAM5 وAM4 بارتفاع 155 مم.",
    specs: [
      spec("coolerType", "نوع التبريد", "Air"),
      spec("heightMm", "الارتفاع", "155", { type: "NUMBER", numeric: 155, unit: "mm" }),
      spec("socketSupport", "المقابس المدعومة", "LGA1700, AM5, AM4"),
      spec("fanSize", "مقاس المروحة", "120", { type: "NUMBER", numeric: 120, unit: "mm" }),
    ],
  },
  {
    sku: "COOL-CM-ML240",
    slug: "cooler-master-ml240l-aio",
    nameAr: "تبريد مائي Cooler Master ML240L — 240mm",
    nameEn: "Cooler Master ML240L AIO 240mm",
    model: "ML240L V2",
    categorySlug: "cooling",
    brand: "Cooler Master",
    price: 3500,
    quantity: 7,
    featured: true,
    descriptionAr: "تبريد مائي مغلق برادياتير 240 مم ومروحتين، يدعم مقابس Intel LGA1700 وAMD AM5.",
    specs: [
      spec("coolerType", "نوع التبريد", "AIO Liquid"),
      spec("radiatorSizeMm", "مقاس الرادياتير", "240", { type: "NUMBER", numeric: 240, unit: "mm" }),
      spec("socketSupport", "المقابس المدعومة", "LGA1700, LGA1200, AM5, AM4"),
    ],
  },

  // ------------------------------- التخزين -------------------------------
  {
    sku: "SSD-SAM-980-1TB",
    slug: "samsung-980-1tb-nvme",
    nameAr: "قرص Samsung 980 NVMe — 1TB",
    nameEn: "Samsung 980 NVMe 1TB",
    model: "MZ-V8V1T0BW",
    categorySlug: "storage",
    brand: "Samsung",
    price: 3800,
    compareAtPrice: 4200,
    quantity: 14,
    featured: true,
    descriptionAr: "قرص SSD من نوع NVMe M.2 بسعة 1 تيرابايت وسرعة قراءة تصل إلى 3500 ميجابايت/ث.",
    specs: [
      spec("interface", "الواجهة", "NVMe PCIe 3.0"),
      spec("formFactor", "المقاس", "M.2 2280"),
      spec("capacityGB", "السعة", "1000", { type: "NUMBER", numeric: 1000, unit: "GB" }),
      spec("readSpeed", "سرعة القراءة", "3500", { type: "NUMBER", numeric: 3500, unit: "MB/s" }),
    ],
  },
  {
    sku: "SSD-WD-SN850X-2TB",
    slug: "wd-black-sn850x-2tb-nvme",
    nameAr: "قرص WD Black SN850X NVMe — 2TB",
    nameEn: "WD Black SN850X NVMe 2TB",
    model: "WDS200T2X0E",
    categorySlug: "storage",
    brand: "Western Digital",
    price: 7200,
    quantity: 6,
    descriptionAr: "قرص NVMe Gen4 عالي الأداء بسعة 2 تيرابايت، مناسب للألعاب والتحرير الثقيل.",
    specs: [
      spec("interface", "الواجهة", "NVMe PCIe 4.0"),
      spec("formFactor", "المقاس", "M.2 2280"),
      spec("capacityGB", "السعة", "2000", { type: "NUMBER", numeric: 2000, unit: "GB" }),
      spec("readSpeed", "سرعة القراءة", "7300", { type: "NUMBER", numeric: 7300, unit: "MB/s" }),
    ],
  },
  {
    sku: "SSD-SAM-870-1TB",
    slug: "samsung-870-evo-1tb-sata",
    nameAr: "قرص Samsung 870 EVO SATA — 1TB",
    nameEn: "Samsung 870 EVO SATA 1TB",
    model: "MZ-77E1T0B",
    categorySlug: "storage",
    brand: "Samsung",
    price: 3400,
    quantity: 8,
    descriptionAr: "قرص SSD بوصلة SATA II بسعة 1 تيرابايت، مناسب كقرص إضافي للألعاب والملفات.",
    specs: [
      spec("interface", "الواجهة", "SATA III"),
      spec("formFactor", "المقاس", "2.5"),
      spec("capacityGB", "السعة", "1000", { type: "NUMBER", numeric: 1000, unit: "GB" }),
      spec("readSpeed", "سرعة القراءة", "560", { type: "NUMBER", numeric: 560, unit: "MB/s" }),
    ],
  },
  {
    sku: "HDD-WD-BLUE-4TB",
    slug: "wd-blue-4tb-hdd",
    nameAr: "قرص WD Blue HDD — 4TB",
    nameEn: "WD Blue 4TB HDD",
    model: "WD40EZAX",
    categorySlug: "storage",
    brand: "Western Digital",
    price: 4500,
    quantity: 5,
    descriptionAr: "قرص تخزين تقليدي بسعة 4 تيرابايت بوصلة SATA، مناسب لأرشيف الملفات والألعاب.",
    specs: [
      spec("interface", "الواجهة", "SATA III"),
      spec("formFactor", "المقاس", "3.5"),
      spec("capacityGB", "السعة", "4000", { type: "NUMBER", numeric: 4000, unit: "GB" }),
      spec("rpm", "سرعة الدوران", "5400", { type: "NUMBER", numeric: 5400, unit: "RPM" }),
    ],
  },

  // ------------------------------- الشاشات -------------------------------
  {
    sku: "MON-LG-27-1440",
    slug: "lg-ultragear-27-1440p-165hz",
    nameAr: "شاشة LG UltraGear 27 — 1440p 165Hz",
    nameEn: "LG UltraGear 27 1440p 165Hz",
    model: "27GP850",
    categorySlug: "monitors",
    brand: "LG",
    price: 14500,
    compareAtPrice: 16000,
    quantity: 4,
    featured: true,
    descriptionAr: "شاشة ألعاب 27 بوصة بدقة 1440p ومعدل تحديث 165 هرتز وزمن استجابة 1ms.",
    specs: [
      spec("sizeInch", "المقاس", "27", { type: "NUMBER", numeric: 27, unit: "inch" }),
      spec("resolution", "الدقة", "2560×1440"),
      spec("refreshRate", "معدل التحديث", "165", { type: "NUMBER", numeric: 165, unit: "Hz" }),
      spec("panel", "نوع اللوحة", "IPS"),
    ],
  },
  {
    sku: "MON-SAM-32-165",
    slug: "samsung-odyssey-g5-32-165hz",
    nameAr: "شاشة Samsung Odyssey G5 — 32 بوصة 165Hz",
    nameEn: "Samsung Odyssey G5 32 165Hz",
    model: "LS32CG552",
    categorySlug: "monitors",
    brand: "Samsung",
    price: 17500,
    quantity: 3,
    descriptionAr: "شاشة منحنية 32 بوصة بدقة 1440p ومعدل تحديث 165 هرتز، تجربة غامرة للألعاب.",
    specs: [
      spec("sizeInch", "المقاس", "32", { type: "NUMBER", numeric: 32, unit: "inch" }),
      spec("resolution", "الدقة", "2560×1440"),
      spec("refreshRate", "معدل التحديث", "165", { type: "NUMBER", numeric: 165, unit: "Hz" }),
      spec("panel", "نوع اللوحة", "VA"),
    ],
  },

  // ------------------------------- الملحقات -------------------------------
  {
    sku: "PER-LOG-G502",
    slug: "logitech-g502-hero",
    nameAr: "ماوس Logitech G502 Hero للألعاب",
    nameEn: "Logitech G502 Hero",
    model: "G502 Hero",
    categorySlug: "peripherals",
    brand: "Logitech",
    price: 2400,
    quantity: 13,
    descriptionAr: "ماوس ألعاب بدقة 25600 DPI وأحد عشر زرًا قابلًا للبرمجة وأوزان قابلة للتعديل.",
    specs: [
      spec("dpi", "الحساسية", "25600", { type: "NUMBER", numeric: 25600, unit: "DPI" }),
      spec("connection", "الاتصال", "USB"),
    ],
  },
  {
    sku: "ACC-LOG-K120",
    slug: "logitech-k120-keyboard",
    nameAr: "كيبورد Logitech K120",
    nameEn: "Logitech K120 Keyboard",
    model: "K120",
    categorySlug: "accessories",
    brand: "Logitech",
    price: 650,
    quantity: 20,
    descriptionAr: "كيبورد مكتبي بسيط وموثوق، مقاوم للماء ومناسب للاستخدام اليومي.",
    specs: [spec("connection", "الاتصال", "USB"), spec("layout", "التخطيط", "عربي/إنجليزي")],
  },

  // ------------------------------- تجميعات جاهزة -------------------------------
  {
    sku: "PC-KPS-STARTER",
    slug: "prebuilt-starter-rtx4060",
    nameAr: "تجميعة خالد Starter — i5-14400F + RTX 4060",
    nameEn: "Khaled Starter PC — i5-14400F + RTX 4060",
    model: "KPS-STARTER",
    categorySlug: "prebuilt-pc",
    brand: "ASUS",
    price: 48000,
    compareAtPrice: 51500,
    quantity: 3,
    featured: true,
    type: "PREBUILT",
    descriptionAr:
      "تجميعة ألعاب متكاملة بدقة 1080p: معالج i5-14400F، رامات 16GB DDR5، كارت RTX 4060، قرص NVMe 1TB، ومزود طاقة 650 واط. مجمّعة ومختبرة داخل المحل.",
    specs: [
      spec("cpu", "المعالج", "Intel Core i5-14400F"),
      spec("gpu", "كارت الشاشة", "ASUS RTX 4060 8GB"),
      spec("ram", "الرامات", "16GB DDR5 6000"),
      spec("storage", "التخزين", "1TB NVMe"),
      spec("motherboard", "اللوحة الأم", "ASUS B760M-A DDR5"),
      spec("psu", "مزود الطاقة", "Corsair CV650"),
      spec("case", "الكيسة", "DeepCool MATREXX 40"),
      spec("cooler", "التبريد", "DeepCool AK400"),
    ],
  },
  {
    sku: "PC-KPS-GAMING",
    slug: "prebuilt-gaming-rtx4070s",
    nameAr: "تجميعة خالد Gaming Pro — i7-14700K + RTX 4070 Super",
    nameEn: "Khaled Gaming Pro — i7-14700K + RTX 4070 Super",
    model: "KPS-GAMING",
    categorySlug: "prebuilt-pc",
    brand: "MSI",
    price: 105000,
    compareAtPrice: 112000,
    quantity: 2,
    featured: true,
    type: "PREBUILT",
    descriptionAr:
      "تجميعة احترافية لـ1440p والألعاب الثقيلة: i7-14700K، RTX 4070 Super، رامات 32GB DDR5، قرص NVMe 2TB، وتبريد مائي 240mm.",
    specs: [
      spec("cpu", "المعالج", "Intel Core i7-14700K"),
      spec("gpu", "كارت الشاشة", "MSI RTX 4070 Super 12GB"),
      spec("ram", "الرامات", "32GB DDR5 6000"),
      spec("storage", "التخزين", "2TB NVMe Gen4"),
      spec("motherboard", "اللوحة الأم", "MSI PRO Z790-A"),
      spec("psu", "مزود الطاقة", "Corsair RM850e"),
      spec("case", "الكيسة", "Lian Li Lancool 216"),
      spec("cooler", "التبريد", "Cooler Master ML240L"),
    ],
  },
  {
    sku: "PC-KPS-AMD",
    slug: "prebuilt-amd-7800x3d-rx7800xt",
    nameAr: "تجميعة خالد AMD Elite — Ryzen 7 7800X3D + RX 7800 XT",
    nameEn: "Khaled AMD Elite — Ryzen 7 7800X3D + RX 7800 XT",
    model: "KPS-AMD",
    categorySlug: "prebuilt-pc",
    brand: "AMD",
    price: 92000,
    quantity: 2,
    featured: true,
    type: "PREBUILT",
    descriptionAr:
      "تجميعة ألعاب على منصة AM5 بمعالج 7800X3D الأسرع في الألعاب، وكارت RX 7800 XT بذاكرة 16GB، ورامات DDR5 32GB.",
    specs: [
      spec("cpu", "المعالج", "AMD Ryzen 7 7800X3D"),
      spec("gpu", "كارت الشاشة", "Gigabyte RX 7800 XT 16GB"),
      spec("ram", "الرامات", "32GB DDR5 6000"),
      spec("storage", "التخزين", "2TB NVMe Gen4"),
      spec("motherboard", "اللوحة الأم", "ASUS B650M-A"),
      spec("psu", "مزود الطاقة", "Seasonic Focus GX-750"),
      spec("case", "الكيسة", "Lian Li Lancool 216"),
      spec("cooler", "التبريد", "Cooler Master ML240L"),
    ],
  },
];

const SHIPPING_ZONES = [
  { governorate: "القاهرة", fee: 50, estimatedDays: "1–2 يوم عمل" },
  { governorate: "الجيزة", fee: 60, estimatedDays: "1–2 يوم عمل" },
  { governorate: "الإسكندرية", fee: 80, estimatedDays: "2–3 أيام عمل" },
  { governorate: "القليوبية", fee: 70, estimatedDays: "2–3 أيام عمل" },
  { governorate: "الشرقية", fee: 80, estimatedDays: "2–3 أيام عمل" },
  { governorate: "الدقهلية", fee: 85, estimatedDays: "2–4 أيام عمل" },
];

async function seedUsers() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "";
  const adminName = process.env.ADMIN_NAME ?? "مدير المتجر";

  if (adminEmail && adminPassword) {
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        email: adminEmail,
        name: adminName,
        passwordHash: await hashPassword(adminPassword),
        role: "ADMIN",
      },
    });
    console.log(`✔ حساب المدير جاهز: ${adminEmail}`);
  } else {
    console.warn("⚠ لم يتم إنشاء حساب مدير: اضبط ADMIN_EMAIL وADMIN_PASSWORD ثم شغّل npm run admin:create");
  }

  if (process.env.SEED_DEMO_DATA === "true") {
    console.log("ℹ لا يتم إنشاء حسابات عملاء: المتجر يعمل بالشراء كزائر بدون تسجيل دخول.");
  }
}

async function seedCategoriesAndBrands() {
  for (const category of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: {
        slug: category.slug,
        nameAr: category.nameAr,
        nameEn: category.nameEn,
        icon: category.icon,
        sortOrder: category.sortOrder,
      },
    });
  }

  for (const name of BRANDS) {
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    await prisma.brand.upsert({
      where: { slug },
      update: {},
      create: { name, slug },
    });
  }
}

async function seedProducts() {
  if (process.env.SEED_DEMO_DATA !== "true") {
    console.log("ℹ SEED_DEMO_DATA غير مفعّل: تم تخطي المنتجات التجريبية.");
    return;
  }

  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  const brands = await prisma.brand.findMany({ select: { id: true, name: true } });
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category.id]));
  const brandByName = new Map(brands.map((brand) => [brand.name, brand.id]));

  let created = 0;
  for (const product of PRODUCTS) {
    const existing = await prisma.product.findUnique({ where: { sku: product.sku }, select: { id: true } });
    if (existing) continue;

    const categoryId = categoryBySlug.get(product.categorySlug);
    if (!categoryId) {
      console.warn(`⚠ تصنيف غير موجود للمنتج ${product.sku}: ${product.categorySlug}`);
      continue;
    }

    const specs = product.specs.map((entry, index) => ({
      key: entry.key,
      label: entry.label,
      value: entry.value,
      numericValue: entry.type === "NUMBER" ? (entry.numeric ?? Number(entry.value)) : null,
      unit: entry.unit ?? null,
      dataType: (entry.type ?? "TEXT") as "TEXT" | "NUMBER" | "BOOLEAN",
      group: entry.group ?? null,
      sortOrder: index,
    }));

    await prisma.product.create({
      data: {
        sku: product.sku,
        slug: product.slug,
        nameAr: product.nameAr,
        nameEn: product.nameEn,
        model: product.model ?? null,
        descriptionAr: product.descriptionAr,
        price: product.price,
        compareAtPrice: product.compareAtPrice ?? null,
        warrantyMonths: product.warrantyMonths ?? 12,
        status: "ACTIVE",
        type: product.type ?? "COMPONENT",
        isFeatured: Boolean(product.featured),
        categoryId,
        brandId: brandByName.get(product.brand) ?? null,
        images: {
          create: [
            {
              url: `/images/placeholder-${product.image ?? ((created % 4) + 1)}.png`,
              alt: product.nameAr,
              sortOrder: 0,
            },
          ],
        },
        specs: { create: specs },
        inventory: {
          create: {
            quantity: product.quantity,
            lowStockThreshold: product.quantity <= 4 ? 3 : 2,
          },
        },
      },
    });
    created += 1;
  }

  console.log(`✔ منتجات تجريبية: ${created} جديدة (${PRODUCTS.length - created} موجودة بالفعل)`);
}

async function seedStoreSettings() {
  await prisma.storeSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      phone: "+201220534625",
      whatsapp: "+201220534625",
      shippingFlatFee: 70,
      freeShippingThreshold: 25000,
      codEnabled: true,
      pickupEnabled: true,
      instapayEnabled: false,
      instapayInstructions:
        "حوّل المبلغ إلى حساب إنستاباي الخاص بالمتجر ثم أرسل رقم عملية التحويل من صفحة الطلب. لا يتم اعتبار الطلب مدفوعًا إلا بعد مراجعة الإدارة.",
      lowStockThreshold: 3,
      defaultWarrantyMonths: 12,
    },
  });

  for (const [index, zone] of SHIPPING_ZONES.entries()) {
    await prisma.shippingZone.upsert({
      where: { governorate: zone.governorate },
      update: {},
      create: {
        governorate: zone.governorate,
        fee: zone.fee,
        estimatedDays: zone.estimatedDays,
        sortOrder: index,
        isActive: true,
        codAvailable: true,
      },
    });
  }

  if (process.env.SEED_DEMO_DATA === "true") {
    await prisma.coupon.upsert({
      where: { code: "WELCOME10" },
      update: {},
      create: {
        code: "WELCOME10",
        type: "PERCENT",
        value: 10,
        minSubtotal: 5000,
        maxUses: 100,
        isActive: true,
      },
    });
  }
}

async function seedCompatibilityRules() {
  const rules: Array<{ key: string; label: string; description: string }> = [
    { key: "cpu_socket", label: "توافق مقبس المعالج مع اللوحة الأم", description: "يطابق مقبس المعالج مع مقبس اللوحة." },
    { key: "cpu_chipset", label: "دعم مجموعة الشرائح للمعالج", description: "يتحقق من أن الشريحة ضمن المدعوم للمعالج." },
    { key: "cpu_bios", label: "إصدار BIOS ودعم المعالج", description: "ينبّه عند الحاجة لتحديث BIOS." },
    { key: "ram_type", label: "نوع الرامات DDR", description: "يطابق DDR4/DDR5." },
    { key: "ram_slots", label: "عدد فتحات الرامات", description: "عدد الوحدات مقابل الفتحات." },
    { key: "ram_capacity", label: "السعة القصوى للرامات", description: "السعة الكلية مقابل الحد الأقصى." },
    { key: "mb_case_form_factor", label: "مقاس اللوحة الأم والكيسة", description: "مقاس اللوحة مقابل دعم الكيسة." },
    { key: "gpu_case_length", label: "طول كارت الشاشة داخل الكيسة", description: "الطول مقابل المساحة." },
    { key: "cooler_case_height", label: "ارتفاع المشتت / حجم الرادياتير", description: "مساحة التبريد داخل الكيسة." },
    { key: "psu_wattage", label: "قدرة مزود الطاقة", description: "الحمل التقديري مقابل قدرة المزود." },
    { key: "psu_gpu_connectors", label: "موصلات طاقة كارت الشاشة", description: "موصلات PCIe المطلوبة." },
    { key: "psu_case_fit", label: "مقاس ومزود الطاقة والكيسة", description: "نوع وطول المزود داخل الكيسة." },
  ];
  for (const rule of rules) {
    await prisma.compatibilityRule.upsert({
      where: { key: rule.key },
      update: {},
      create: { ...rule, severity: "WARNING", isActive: true },
    });
  }
}

async function main() {
  console.log("🌱 بدء تهيئة البيانات…");
  await seedUsers();
  await seedCategoriesAndBrands();
  await seedProducts();
  await seedStoreSettings();
  await seedCompatibilityRules();
  console.log("✅ اكتملت التهيئة.");
}

main()
  .catch((error) => {
    console.error("❌ فشلت التهيئة:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
