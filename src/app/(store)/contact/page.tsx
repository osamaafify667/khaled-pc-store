import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { getSettings } from "@/server/settings";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ContactForm } from "@/components/store/contact-form";
import { buttonClasses } from "@/components/ui/button";
import { toWhatsAppNumber } from "@/lib/phone";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "تواصل معنا",
  description: "بيانات التواصل مع متجر خالد للكمبيوتر في مول البستان، وسط البلد، القاهرة — هاتف وواتساب ومواعيد العمل.",
};

export default async function ContactPage() {
  const settings = await getSettings();

  const channels = [
    {
      icon: MapPin,
      title: "عنوان المحل",
      value: settings.addressLine,
      href: settings.mapUrl || undefined,
      linkLabel: settings.mapUrl ? "افتح الخريطة" : undefined,
    },
    {
      icon: Phone,
      title: "الهاتف",
      value: settings.phone || "لم يُضف رقم هاتف بعد",
      href: settings.phone ? `tel:${settings.phone}` : undefined,
      linkLabel: settings.phone ? "اتصل الآن" : undefined,
      ltr: true,
    },
    {
      icon: MessageCircle,
      title: "واتساب",
      value: settings.whatsapp || "لم يُضف رقم واتساب بعد",
      href: settings.whatsapp ? `https://wa.me/${toWhatsAppNumber(settings.whatsapp)}` : undefined,
      linkLabel: settings.whatsapp ? "ابدأ محادثة" : undefined,
      ltr: true,
    },
    {
      icon: Mail,
      title: "البريد الإلكتروني",
      value: settings.email || "لم يُضف بريد إلكتروني بعد",
      href: settings.email ? `mailto:${settings.email}` : undefined,
      linkLabel: settings.email ? "أرسل بريدًا" : undefined,
      ltr: true,
    },
    {
      icon: Clock,
      title: "مواعيد العمل",
      value: settings.workingHours || "تُعلن مواعيد العمل من إدارة المتجر.",
    },
  ];

  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[{ label: "تواصل معنا" }]} />

      <div className="mt-5 max-w-2xl">
        <h1 className="text-3xl">تواصل معنا</h1>
        <p className="mt-2 text-sm leading-7 text-slate-400">
          فريق {settings.storeNameAr} يساعدك في اختيار القطع المناسبة، مراجعة توافق التجميعة، ومتابعة الطلبات.
          زورنا في المحل أو تواصل معنا مباشرة.
        </p>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          {channels.map((channel) => (
            <div key={channel.title} className="surface flex items-start gap-4 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <channel.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] text-slate-500">{channel.title}</p>
                <p className="mt-0.5 text-sm font-bold text-white" dir={"ltr" in channel && channel.ltr ? "ltr" : undefined}>
                  {channel.value}
                </p>
                {channel.href && channel.linkLabel ? (
                  <a
                    href={channel.href}
                    target={channel.href.startsWith("http") ? "_blank" : undefined}
                    rel={channel.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="mt-1.5 inline-flex text-xs font-bold text-accent hover:underline"
                  >
                    {channel.linkLabel}
                  </a>
                ) : null}
              </div>
            </div>
          ))}

          <div className="surface p-4">
            <p className="text-sm font-bold text-white">قبل التواصل بخصوص طلب</p>
            <p className="mt-1 text-xs leading-6 text-slate-400">
              جهّز رقم الطلب (يبدأ بـ KPS-) ورقم الهاتف المستخدم. يمكنك أيضًا عرض حالة الطلب مباشرة من صفحة التتبع.
            </p>
            <Link href="/track" className={buttonClasses("outline", "sm", "mt-3")}>
              تتبع الطلب
            </Link>
          </div>
        </div>

        <div className="surface h-fit p-5">
          <div className="mb-4">
            <h2 className="text-base">أرسل رسالة سريعة</h2>
            <p className="mt-1 text-xs text-slate-400">اكتب رسالتك وسيتم فتح واتساب لإرسالها إلى المتجر.</p>
          </div>
          <ContactForm whatsapp={settings.whatsapp} storeName={settings.storeNameAr} />
        </div>
      </div>
    </div>
  );
}
