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
      className="fixed bottom-4 left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-ink-950 shadow-[0_16px_40px_-12px_rgba(16,185,129,0.8)] transition hover:scale-105 hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 sm:bottom-5 sm:left-5"
    >
      <MessageCircle className="h-5 w-5" />
    </a>
  );
}
