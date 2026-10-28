"use server";

import { saveBuild, BuildError } from "@/server/builds";
import { buildSaveSchema } from "@/lib/validation";

export type BuildActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  buildId?: string;
  publicId?: string;
  url?: string;
};

export async function saveBuildAction(_prev: BuildActionState, formData: FormData): Promise<BuildActionState> {
  let items: unknown;
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { error: "بيانات التجميعة غير صحيحة" };
  }

  const parsed = buildSaveSchema.safeParse({
    buildId: formData.get("buildId") || undefined,
    name: formData.get("name"),
    items,
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "تحقق من بيانات التجميعة" };

  try {
    const build = await saveBuild({
      userId: null,
      name: parsed.data.name,
      items: parsed.data.items,
    });
    return {
      ok: true,
      message: "تم حفظ التجميعة. يمكنك مشاركة الرابط أو إضافتها للسلة.",
      buildId: build.id,
      publicId: build.publicId,
      url: `/builds/${build.publicId}`,
    };
  } catch (error) {
    return { error: error instanceof BuildError ? error.message : "تعذر حفظ التجميعة" };
  }
}
