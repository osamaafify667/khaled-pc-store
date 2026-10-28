"use server";

import { revalidatePath } from "next/cache";
import { getRequestMeta } from "@/server/auth";
import { submitInstapayProof, OrderError } from "@/server/orders";
import { saveImage, StorageError } from "@/server/storage";
import { instapaySubmissionSchema } from "@/lib/validation";

export type PaymentProofState = { ok?: boolean; error?: string; message?: string };

export async function submitInstapayProofAction(
  _prev: PaymentProofState,
  formData: FormData,
): Promise<PaymentProofState> {
  const parsed = instapaySubmissionSchema.safeParse({
    orderNumber: formData.get("orderNumber"),
    accessToken: formData.get("accessToken"),
    reference: formData.get("reference"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "تحقق من البيانات" };
  }

  const proof = formData.get("proof");
  let proofUrl: string | null = null;
  if (proof instanceof File && proof.size > 0) {
    try {
      const uploaded = await saveImage(proof, "payments");
      proofUrl = uploaded.url;
    } catch (error) {
      return { error: error instanceof StorageError ? error.message : "تعذر رفع إثبات التحويل" };
    }
  }

  const meta = await getRequestMeta();
  try {
    await submitInstapayProof({
      orderNumber: parsed.data.orderNumber,
      accessToken: parsed.data.accessToken,
      reference: parsed.data.reference,
      proofUrl,
      ip: meta.ip,
    });
    revalidatePath(`/order/success/${parsed.data.orderNumber}`);
    return {
      ok: true,
      message: "تم إرسال بيانات التحويل. سيتم مراجعتها يدويًا قبل اعتماد الدفع.",
    };
  } catch (error) {
    if (error instanceof OrderError) return { error: error.message };
    console.error("submitInstapayProofAction", error);
    return { error: "تعذر إرسال بيانات التحويل. حاول مرة أخرى." };
  }
}
