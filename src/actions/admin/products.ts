"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { getRequestMeta, requireAdmin } from "@/server/auth";
import { recordAudit } from "@/server/audit";
import { adjustStock, InventoryError } from "@/server/inventory";
import { deleteLocalImage, saveImage, StorageError } from "@/server/storage";
import { parseCsv, rowsToObjects } from "@/lib/csv";
import { fieldErrors, formatZodError, productSchema, stockAdjustmentSchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";

export type AdminProductState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  productId?: string;
};

type SpecInput = {
  key: string;
  label: string;
  value: string;
  numericValue?: number | "";
  unit?: string;
  dataType: "TEXT" | "NUMBER" | "BOOLEAN";
  group?: string;
  sortOrder: number;
};

function parseSpecs(formData: FormData): SpecInput[] {
  const raw = String(formData.get("specsJson") ?? "[]");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseProductForm(formData: FormData) {
  return productSchema.safeParse({
    nameAr: formData.get("nameAr"),
    nameEn: formData.get("nameEn") || undefined,
    sku: formData.get("sku"),
    slug: formData.get("slug") || undefined,
    model: formData.get("model") || undefined,
    categoryId: formData.get("categoryId"),
    brandId: formData.get("brandId") || undefined,
    descriptionAr: formData.get("descriptionAr") || undefined,
    price: formData.get("price"),
    compareAtPrice: formData.get("compareAtPrice") || "",
    warrantyMonths: formData.get("warrantyMonths") ?? 0,
    status: formData.get("status"),
    type: formData.get("type"),
    isFeatured: formData.get("isFeatured") || undefined,
    hasBox: formData.get("hasBox") !== "false",
    quantity: formData.get("quantity") ?? 0,
    lowStockThreshold: formData.get("lowStockThreshold") ?? 3,
    metaTitle: formData.get("metaTitle") || undefined,
    metaDescription: formData.get("metaDescription") || undefined,
    specs: parseSpecs(formData),
  });
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = slugify(base);
  if (!slug) slug = `product-${Date.now().toString(36)}`;
  let candidate = slug;
  let counter = 1;
  while (await prisma.product.findFirst({ where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } })) {
    counter += 1;
    candidate = `${slug}-${counter}`;
  }
  return candidate;
}

function normalizeSpecs(specs: SpecInput[]) {
  const seen = new Set<string>();
  return specs
    .filter((spec) => spec.key.trim() && spec.label.trim() && spec.value.trim())
    .map((spec, index) => {
      let key = spec.key.trim();
      if (seen.has(key)) key = `${key}_${index}`;
      seen.add(key);
      return {
        key,
        label: spec.label.trim(),
        value: spec.value.trim(),
        numericValue:
          spec.dataType === "NUMBER" && spec.numericValue !== "" && spec.numericValue !== undefined
            ? Number(spec.numericValue)
            : null,
        unit: spec.unit?.trim() || null,
        dataType: spec.dataType,
        group: spec.group?.trim() || null,
        sortOrder: spec.sortOrder ?? index,
      };
    });
}

interface UploadedImage {
  url: string;
  key: string;
}

async function uploadNewImages(formData: FormData): Promise<UploadedImage[]> {
  const files = formData.getAll("images").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (files.length > 8) throw new StorageError("يمكن رفع 8 صور كحد أقصى في المرة الواحدة");
  const uploaded: UploadedImage[] = [];
  for (const file of files) {
    uploaded.push(await saveImage(file, "products"));
  }
  return uploaded;
}

function existingImagesPayload(formData: FormData): Array<{ id: string; sortOrder: number }> {
  try {
    const parsed = JSON.parse(String(formData.get("existingImages") ?? "[]"));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && typeof entry.id === "string")
      .map((entry, index) => ({ id: entry.id, sortOrder: Number(entry.sortOrder ?? index) }));
  } catch {
    return [];
  }
}

export async function createProductAction(_prev: AdminProductState, formData: FormData): Promise<AdminProductState> {
  const admin = await requireAdmin();
  const parsed = parseProductForm(formData);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), error: formatZodError(parsed.error) };
  const data = parsed.data;
  const specs = normalizeSpecs(data.specs as SpecInput[]);

  const [skuExists, category, brand] = await Promise.all([
    prisma.product.findUnique({ where: { sku: data.sku }, select: { id: true } }),
    prisma.category.findUnique({ where: { id: data.categoryId }, select: { id: true } }),
    data.brandId ? prisma.brand.findUnique({ where: { id: data.brandId }, select: { id: true } }) : Promise.resolve(null),
  ]);
  if (skuExists) return { fieldErrors: { sku: "هذا الكود (SKU) مستخدم بالفعل" }, error: "هذا الكود مستخدم بالفعل" };
  if (!category) return { fieldErrors: { categoryId: "التصنيف غير موجود" }, error: "التصنيف غير موجود" };
  if (data.brandId && !brand) return { fieldErrors: { brandId: "الشركة غير موجودة" }, error: "الشركة غير موجودة" };

  if (specs.length === 0) {
    return { fieldErrors: { specs: "مواصفة واحدة على الأقل مطلوبة" }, error: "أضف مواصفة فنية واحدة على الأقل (مثل المقبس أو القدرة) قبل الحفظ." };
  }

  let uploaded: UploadedImage[] = [];
  try {
    uploaded = await uploadNewImages(formData);
  } catch (error) {
    return { error: error instanceof StorageError ? error.message : "تعذر رفع الصور" };
  }

  if (uploaded.length === 0) {
    return { fieldErrors: { images: "صورة واحدة على الأقل مطلوبة" }, error: "أضف صورة واحدة على الأقل للمنتج قبل الحفظ." };
  }

  const slug = await uniqueSlug(data.slug || data.nameEn || data.sku);
  const meta = await getRequestMeta();

  try {
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          sku: data.sku,
          slug,
          nameAr: data.nameAr,
          nameEn: data.nameEn ?? null,
          model: data.model ?? null,
          descriptionAr: data.descriptionAr ?? null,
          price: data.price,
          compareAtPrice: data.compareAtPrice === "" || data.compareAtPrice === undefined ? null : data.compareAtPrice,
          warrantyMonths: data.warrantyMonths,
          status: data.status,
          type: data.type,
          isFeatured: Boolean(data.isFeatured),
          hasBox: data.hasBox,
          categoryId: data.categoryId,
          brandId: data.brandId ?? null,
          metaTitle: data.metaTitle ?? null,
          metaDescription: data.metaDescription ?? null,
          specs: { create: specs },
          images: {
            create: uploaded.map((image, index) => ({ url: image.url, sortOrder: index, alt: data.nameAr })),
          },
          inventory: {
            create: {
              quantity: data.quantity,
              lowStockThreshold: data.lowStockThreshold ?? 3,
            },
          },
        },
      });
      if (data.quantity > 0) {
        await tx.stockMovement.create({
          data: {
            productId: created.id,
            type: "RESTOCK",
            quantityChange: data.quantity,
            balanceAfter: data.quantity,
            reason: "رصيد افتتاحي عند إضافة المنتج",
            userId: admin.id,
          },
        });
      }
      await recordAudit(tx, {
        userId: admin.id,
        action: "PRODUCT_CREATED",
        entity: "Product",
        entityId: created.id,
        ip: meta.ip,
        details: { sku: created.sku, name: created.nameAr, price: data.price },
      });
      return created;
    });
    revalidatePath("/admin/products");
    revalidatePath("/shop");
    revalidatePath("/", "layout");
    redirect(`/admin/products/${product.id}?created=1`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    console.error("createProductAction", error);
    return { error: "تعذر إنشاء المنتج. راجع البيانات وحاول مرة أخرى." };
  }
}

export async function updateProductAction(_prev: AdminProductState, formData: FormData): Promise<AdminProductState> {
  const admin = await requireAdmin();
  const productId = String(formData.get("productId") ?? "");
  if (!productId) return { error: "المنتج غير موجود" };

  const parsed = parseProductForm(formData);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), error: formatZodError(parsed.error) };
  const data = parsed.data;
  const specs = normalizeSpecs(data.specs as SpecInput[]);

  const existing = await prisma.product.findUnique({
    where: { id: productId },
    include: { images: true },
  });
  if (!existing) return { error: "المنتج غير موجود" };

  const skuConflict = await prisma.product.findFirst({
    where: { sku: data.sku, id: { not: productId } },
    select: { id: true },
  });
  if (skuConflict) return { fieldErrors: { sku: "هذا الكود مستخدم لمنتج آخر" }, error: "هذا الكود مستخدم لمنتج آخر" };

  if (specs.length === 0) {
    return { fieldErrors: { specs: "مواصفة واحدة على الأقل مطلوبة" }, error: "أضف مواصفة فنية واحدة على الأقل (مثل المقبس أو القدرة) قبل الحفظ." };
  }

  let uploaded: UploadedImage[] = [];
  try {
    uploaded = await uploadNewImages(formData);
  } catch (error) {
    return { error: error instanceof StorageError ? error.message : "تعذر رفع الصور" };
  }

  const explicitRemoveIds = formData.getAll("removeImage").map(String);
  const orderPayload = existingImagesPayload(formData);
  const keptImageIds = new Set(orderPayload.map((item) => item.id));
  const removeImageIds = Array.from(
    new Set([
      ...explicitRemoveIds,
      ...existing.images.filter((image) => !keptImageIds.has(image.id)).map((image) => image.id),
    ]),
  );
  const remainingImageCount = existing.images.filter((image) => !removeImageIds.includes(image.id)).length + uploaded.length;

  if (remainingImageCount === 0) {
    return { fieldErrors: { images: "صورة واحدة على الأقل مطلوبة" }, error: "لا يمكن حفظ المنتج بدون صور. أضف صورة واحدة على الأقل." };
  }

  const slug = await uniqueSlug(data.slug || data.nameEn || data.sku, productId);
  const meta = await getRequestMeta();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: {
          sku: data.sku,
          slug,
          nameAr: data.nameAr,
          nameEn: data.nameEn ?? null,
          model: data.model ?? null,
          descriptionAr: data.descriptionAr ?? null,
          price: data.price,
          compareAtPrice: data.compareAtPrice === "" || data.compareAtPrice === undefined ? null : data.compareAtPrice,
          warrantyMonths: data.warrantyMonths,
          status: data.status,
          type: data.type,
          isFeatured: Boolean(data.isFeatured),
          hasBox: data.hasBox,
          categoryId: data.categoryId,
          brandId: data.brandId ?? null,
          metaTitle: data.metaTitle ?? null,
          metaDescription: data.metaDescription ?? null,
          specs: {
            deleteMany: {},
            create: specs,
          },
        },
      });

      await tx.productImage.deleteMany({
        where: { productId, id: { in: removeImageIds } },
      });

      for (const item of orderPayload) {
        await tx.productImage.updateMany({
          where: { id: item.id, productId },
          data: { sortOrder: item.sortOrder },
        });
      }

      if (uploaded.length > 0) {
        const maxOrder = Math.max(0, ...existing.images.map((image) => image.sortOrder));
        await tx.productImage.createMany({
          data: uploaded.map((image, index) => ({
            productId,
            url: image.url,
            alt: data.nameAr,
            sortOrder: maxOrder + index + 1,
          })),
        });
      }

      const inventory = await tx.inventory.findUnique({ where: { productId } });
      if (inventory) {
        await adjustStock({
          productId,
          mode: "SET",
          quantity: data.quantity,
          reason: "تعديل الكمية من صفحة المنتج",
          userId: admin.id,
          db: tx,
        });
        if (inventory.lowStockThreshold !== data.lowStockThreshold) {
          await tx.inventory.update({
            where: { productId },
            data: { lowStockThreshold: data.lowStockThreshold },
          });
        }
      } else {
        await tx.inventory.create({
          data: { productId, quantity: data.quantity, lowStockThreshold: data.lowStockThreshold },
        });
      }

      await recordAudit(tx, {
        userId: admin.id,
        action: "PRODUCT_UPDATED",
        entity: "Product",
        entityId: productId,
        ip: meta.ip,
        details: { sku: data.sku, name: data.nameAr, price: data.price },
      });
    });
  } catch (error) {
    if (error instanceof InventoryError) return { error: error.message };
    console.error("updateProductAction", error);
    return { error: "تعذر تحديث المنتج. حاول مرة أخرى." };
  }

  for (const id of removeImageIds) {
    const image = existing.images.find((entry) => entry.id === id);
    if (image) await deleteLocalImage(image.url);
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/shop");
  revalidatePath(`/product/${slug}`);
  revalidatePath("/", "layout");
  return { ok: true, message: "تم حفظ تعديلات المنتج", productId };
}

export async function archiveProductAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const productId = String(formData.get("productId") ?? "");
  const restore = formData.get("restore") === "1";
  if (!productId) return;
  const product = await prisma.product.update({
    where: { id: productId },
    data: { status: restore ? "ACTIVE" : "ARCHIVED" },
    select: { slug: true },
  });
  await recordAudit(prisma, {
    userId: admin.id,
    action: restore ? "PRODUCT_RESTORED" : "PRODUCT_ARCHIVED",
    entity: "Product",
    entityId: productId,
  });
  revalidatePath("/admin/products");
  revalidatePath(`/product/${product.slug}`);
  revalidatePath("/shop");
}

export async function adjustStockAction(_prev: AdminProductState, formData: FormData): Promise<AdminProductState> {
  const admin = await requireAdmin();
  const parsed = stockAdjustmentSchema.safeParse({
    productId: formData.get("productId"),
    mode: formData.get("mode"),
    quantity: formData.get("quantity"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "تحقق من البيانات" };

  try {
    const result = await adjustStock({ ...parsed.data, userId: admin.id });
    const product = await prisma.product.findUnique({
      where: { id: parsed.data.productId },
      select: { slug: true, nameAr: true },
    });
    await recordAudit(prisma, {
      userId: admin.id,
      action: "STOCK_ADJUSTED",
      entity: "Product",
      entityId: parsed.data.productId,
      details: { ...parsed.data, result },
    });
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/products");
    if (product) {
      revalidatePath(`/product/${product.slug}`);
      revalidatePath(`/admin/products/${parsed.data.productId}`);
    }
    revalidatePath("/shop");
    return { ok: true, message: `تم تحديث المخزون. المتاح الآن: ${result.available}` };
  } catch (error) {
    return { error: error instanceof InventoryError ? error.message : "تعذر تعديل المخزون" };
  }
}

export async function importProductsAction(_prev: AdminProductState, formData: FormData): Promise<AdminProductState> {
  const admin = await requireAdmin();
  const file = formData.get("csv");
  if (!(file instanceof File) || file.size === 0) return { error: "اختر ملف CSV" };
  if (file.size > 3 * 1024 * 1024) return { error: "حجم الملف يجب ألا يتجاوز 3 ميجابايت" };

  const rows = rowsToObjects(parseCsv(await file.text()));
  if (rows.length === 0) return { error: "الملف فارغ أو غير صالح" };
  if (rows.length > 500) return { error: "الحد الأقصى 500 صف في المرة الواحدة" };

  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));
  const brands = await prisma.brand.findMany({ select: { id: true, name: true } });
  const brandByName = new Map(brands.map((b) => [b.name.toLowerCase(), b.id]));

  let created = 0;
  const errors: string[] = [];

  for (const [index, row] of rows.entries()) {
    const line = index + 2;
    try {
      const categoryId = categoryBySlug.get(row.categorySlug ?? "");
      if (!categoryId) throw new Error("التصنيف غير موجود");
      const sku = (row.sku ?? "").trim();
      if (!sku) throw new Error("SKU مطلوب");
      const exists = await prisma.product.findUnique({ where: { sku }, select: { id: true } });
      if (exists) {
        errors.push(`سطر ${line}: SKU ${sku} موجود بالفعل وتم تجاوزه`);
        continue;
      }
      const parsed = productSchema.safeParse({
        nameAr: row.nameAr,
        nameEn: row.nameEn || undefined,
        sku,
        slug: row.slug || undefined,
        model: row.model || undefined,
        categoryId,
        brandId: row.brand ? brandByName.get(row.brand.toLowerCase()) : undefined,
        descriptionAr: row.descriptionAr || undefined,
        price: row.price,
        compareAtPrice: row.compareAtPrice || "",
        warrantyMonths: row.warrantyMonths || 0,
        status: row.status || "DRAFT",
        type: row.type || "COMPONENT",
        hasBox: !["false", "no", "0", "بدون", "بدون كرتونة"].includes((row.hasBox ?? "").trim().toLowerCase()),
        quantity: row.quantity || 0,
        lowStockThreshold: row.lowStockThreshold || 3,
        specs: [],
      });
      if (!parsed.success) throw new Error(parsed.error.errors[0]?.message);

      const data = parsed.data;
      const slug = await uniqueSlug(data.slug || data.nameEn || data.sku);
      await prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            sku: data.sku,
            slug,
            nameAr: data.nameAr,
            nameEn: data.nameEn ?? null,
            model: data.model ?? null,
            descriptionAr: data.descriptionAr ?? null,
            price: data.price,
            compareAtPrice: data.compareAtPrice === "" || data.compareAtPrice === undefined ? null : data.compareAtPrice,
            warrantyMonths: data.warrantyMonths,
            status: data.status,
            type: data.type,
            hasBox: data.hasBox,
            categoryId: data.categoryId,
            brandId: data.brandId ?? null,
            inventory: {
              create: { quantity: data.quantity, lowStockThreshold: data.lowStockThreshold },
            },
          },
        });
        if (data.quantity > 0) {
          await tx.stockMovement.create({
            data: {
              productId: product.id,
              type: "IMPORT",
              quantityChange: data.quantity,
              balanceAfter: data.quantity,
              reason: "استيراد منتجات من CSV",
              userId: admin.id,
            },
          });
        }
      });
      created += 1;
    } catch (error) {
      errors.push(`سطر ${line}: ${error instanceof Error ? error.message : "بيانات غير صحيحة"}`);
    }
  }

  await recordAudit(prisma, {
    userId: admin.id,
    action: "PRODUCTS_IMPORTED",
    entity: "Product",
    details: { created, skipped: errors.length },
  });
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  return {
    ok: created > 0,
    message: `تم إنشاء ${created} منتجًا${errors.length ? `، وتعذر ${errors.length} صفًا` : ""}. ${errors.slice(0, 4).join(" | ")}`,
    error: created === 0 ? "لم يتم إنشاء أي منتج. راجع تفاصيل الأخطاء." : undefined,
  };
}
