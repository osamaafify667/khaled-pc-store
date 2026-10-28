import Link from "next/link";
import { ChevronDown, Headphones, Search, ShieldCheck, ShoppingCart, Truck } from "lucide-react";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import type { Settings } from "@/server/settings";
import { formatNumber } from "@/lib/utils";

type CategoryLink = { slug: string; nameAr: string };

export function Header({
  settings,
  categories,
  cartCount,
}: {
  settings: Settings;
  categories: CategoryLink[];
  cartCount: number;
}) {
  const announcement =
    settings.announcement ||
    "قطع أصلية بضمان رسمي · استلام من المحل في مول البستان، وسط البلد";

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-gradient-to-l from-accent/15 via-accent/10 to-sky-brand/10 text-center text-[11px] font-semibold text-accent-soft sm:text-xs">
        <div className="container-x flex items-center justify-center gap-2 py-2">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span className="line-clamp-1">{announcement}</span>
        </div>
      </div>

      <div className="border-b border-line bg-ink-950/85 backdrop-blur-xl">
        <div className="container-x flex h-16 items-center justify-between gap-3 sm:h-[74px]">
          <div className="flex items-center gap-2">
            <MobileMenu categories={categories} />
            <Logo />
          </div>

          <form action="/shop" className="relative hidden max-w-xl flex-1 md:block">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              name="q"
              placeholder="ابحث بالاسم أو الموديل أو الشركة…"
              aria-label="البحث في المتجر"
              className="h-11 w-full rounded-xl border border-line bg-ink-850 pr-11 pl-24 text-sm text-white placeholder:text-slate-500 transition focus:border-accent/50 focus:ring-2 focus:ring-accent/10"
            />
            <button
              type="submit"
              className="absolute left-1.5 top-1/2 h-8 -translate-y-1/2 rounded-lg bg-accent px-4 text-xs font-bold text-ink-950 transition hover:bg-accent-soft"
            >
              بحث
            </button>
          </form>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/cart"
              className="relative flex h-11 items-center gap-2 rounded-xl border border-line bg-ink-850 px-3 text-slate-200 transition hover:border-accent/40 hover:text-accent"
              aria-label={`السلة، ${cartCount} قطعة`}
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="hidden text-xs font-bold sm:block">السلة</span>
              {cartCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-black text-ink-950">
                  {formatNumber(cartCount)}
                </span>
              ) : null}
            </Link>
          </div>
        </div>

        <nav className="border-t border-line/70">
          <div className="container-x flex items-center gap-1 overflow-x-auto py-2 no-scrollbar">
            <Link
              href="/shop"
              className="flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition hover:bg-ink-800 hover:text-accent"
            >
              كل المنتجات
              <ChevronDown className="h-3 w-3" />
            </Link>
            {categories.slice(0, 10).map((category) => (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-ink-800 hover:text-accent"
              >
                {category.nameAr}
              </Link>
            ))}
            <Link
              href="/builder"
              className="mr-auto shrink-0 rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent transition hover:bg-accent/20"
            >
              كوّن تجميعتك
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

export function TrustStrip() {
  const items = [
    { icon: ShieldCheck, title: "ضمان رسمي", text: "قطع أصلية بضمان معتمد" },
    { icon: Truck, title: "توصيل لكل المحافظات", text: "أسعار شحن واضحة" },
    { icon: Headphones, title: "دعم فني", text: "مساعدة في اختيار القطع" },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.title} className="flex items-center gap-3 rounded-2xl border border-line bg-ink-850/60 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <item.icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-white">{item.title}</p>
            <p className="text-xs text-slate-400">{item.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
