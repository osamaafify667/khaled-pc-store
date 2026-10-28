import { MessageCircle } from "lucide-react";
import { toWhatsAppNumber } from "@/lib/phone";

/**
 * زر واتساب عائم يظهر في كل صفحات المتجر عندما يكون الرقم مضبوطًا من لوحة التحكم.
 * لا نعرض الزر إذا لم يُضف رقم، حتى لا نرسل العميل إلى رابط غير صالح.
 */
export function WhatsAppButton({ whatsapp }: { whatsapp: string | null }) {
  if (!whatsapp) return null;

  return (
    <a
      href={`https://wa.me/${toWhatsAppNumber(whatsapp)}?text=${encodeURIComponent("مرحبًا، أريد الاستفسار عن منتجات المتجر.")}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="تواصل معنا عبر واتساب"
      title="تواصل معنا عبر واتساب"
      className="fixed bottom-5 left-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-ink-950 shadow-[0_16px_40px_-12px_rgba(16,185,129,0.8)] transition hover:scale-105 hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 sm:h-12 sm:w-12"
    >
      <MessageCircle className="h-6 w-6 sm:h-5 sm:w-5" />
    </a>
  );
}
