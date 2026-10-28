import Link from "next/link";
import { Mail, MapPin, Phone, Clock } from "lucide-react";
import { Logo } from "./logo";
import type { Settings } from "@/server/settings";
import { toWhatsAppNumber } from "@/lib/phone";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

export function Footer({ settings }: { settings: Settings }) {
  const policyLinks = [
    { href: "/policies/warranty", label: "سياسة الضمان" },
    { href: "/policies/exchange", label: "الاستبدال" },
    { href: "/policies/returns", label: "الاسترجاع" },
    { href: "/policies/shipping", label: "الشحن والتوصيل" },
    { href: "/policies/privacy", label: "الخصوصية" },
    { href: "/policies/terms", label: "الشروط والأحكام" },
  ];

  const shopLinks = [
    { href: "/shop", label: "كل المنتجات" },
    { href: "/prebuilt", label: "تجميعات جاهزة" },
    { href: "/builder", label: "منشئ التجميعات" },
    { href: "/track", label: "تتبع الطلب" },
    { href: "/contact", label: "تواصل معنا" },
  ];

  return (
    <footer className="mt-16 border-t border-line bg-ink-900/60">
      <div className="container-x grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 text-sm leading-7 text-slate-400">
            {settings.tagline || "قطع كمبيوتر أصلية وتجميعات احترافية، بضمان وخدمة فنية من قلب القاهرة."}
          </p>
          <div className="mt-5 flex gap-2">
            {settings.instagramUrl ? (
              <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="إنستجرام" className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-slate-400 transition hover:border-accent/40 hover:text-accent">
                <InstagramIcon className="h-4 w-4" />
              </a>
            ) : null}
            {settings.facebookUrl ? (
              <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="فيسبوك" className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-slate-400 transition hover:border-accent/40 hover:text-accent">
                <FacebookIcon className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold text-white">تسوق</h3>
          <ul className="space-y-2.5">
            {shopLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="link-muted">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold text-white">السياسات</h3>
          <ul className="space-y-2.5">
            {policyLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="link-muted">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold text-white">بيانات المتجر</h3>
          <ul className="space-y-3 text-sm text-slate-400">
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span>{settings.addressLine}</span>
            </li>
            {settings.phone ? (
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-accent" />
                <a href={`tel:${settings.phone}`} className="transition hover:text-accent" dir="ltr">
                  {settings.phone}
                </a>
              </li>
            ) : null}
            {settings.whatsapp ? (
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-accent" />
                <a
                  href={`https://wa.me/${toWhatsAppNumber(settings.whatsapp)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:text-accent"
                >
                  واتساب
                </a>
              </li>
            ) : null}
            {settings.email ? (
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-accent" />
                <a href={`mailto:${settings.email}`} className="transition hover:text-accent" dir="ltr">
                  {settings.email}
                </a>
              </li>
            ) : null}
            {settings.workingHours ? (
              <li className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 shrink-0 text-accent" />
                <span>{settings.workingHours}</span>
              </li>
            ) : null}
          </ul>
          {settings.mapUrl ? (
            <a
              href={settings.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex text-xs font-bold text-accent hover:underline"
            >
              افتح الموقع على الخريطة
            </a>
          ) : null}
        </div>
      </div>

      <div className="border-t border-line py-5">
        <div className="container-x flex flex-col items-center justify-between gap-3 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} {settings.storeNameEn} · جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-3">
            <span>الدفع:</span>
            <span className="rounded border border-line px-2 py-1">نقدًا</span>
            {settings.instapayEnabled ? <span className="rounded border border-line px-2 py-1">إنستاباي</span> : null}
            <span className="text-slate-600">|</span>
            <span>استلام من المحل</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
