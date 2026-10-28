"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

type CategoryLink = { slug: string; nameAr: string };

export function MobileMenu({ categories }: { categories: CategoryLink[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="فتح القائمة"
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-line text-slate-300 transition hover:border-accent/40 hover:text-accent lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div
        className={cn(
          "fixed inset-0 z-50 bg-ink-950/80 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-[86%] max-w-sm overflow-y-auto border-l border-line bg-ink-900 p-5 transition-transform duration-300 lg:hidden",
          open ? "translate-x-0" : "translate-x-full",
        )}
        aria-label="قائمة التنقل"
      >
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="إغلاق القائمة"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action="/shop" className="relative mb-6" onSubmit={() => setOpen(false)}>
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            name="q"
            placeholder="ابحث عن منتج أو موديل…"
            className="field pr-10"
            aria-label="البحث في المتجر"
          />
        </form>

        <nav className="space-y-1">
          {[
            { href: "/", label: "الرئيسية" },
            { href: "/shop", label: "كل المنتجات" },
            { href: "/prebuilt", label: "تجميعات جاهزة" },
            { href: "/builder", label: "كوّن تجميعتك" },
            { href: "/track", label: "تتبع الطلب" },
            { href: "/contact", label: "تواصل معنا" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-ink-800 hover:text-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="my-5 divider" />
        <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-slate-500">التصنيفات</p>
        <nav className="grid grid-cols-2 gap-1">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-ink-800 hover:text-accent"
            >
              {category.nameAr}
            </Link>
          ))}
        </nav>

        <div className="my-5 divider" />
        <div className="grid grid-cols-2 gap-2">
          <Link href="/track" onClick={() => setOpen(false)} className="rounded-xl border border-line px-3 py-3 text-center text-sm font-semibold text-slate-200">
            تتبع الطلب
          </Link>
          <Link href="/cart" onClick={() => setOpen(false)} className="rounded-xl bg-accent px-3 py-3 text-center text-sm font-bold text-ink-950">
            السلة
          </Link>
        </div>
      </aside>
    </>
  );
}
