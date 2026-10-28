"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ClipboardList,
  Cog,
  LayoutDashboard,
  Package,
  Percent,
  ScrollText,
  ShieldCheck,
  ShoppingBag,
  Tags,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const ADMIN_NAV = [
  { href: "/admin", label: "لوحة التحكم", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "الطلبات", icon: ShoppingBag },
  { href: "/admin/products", label: "المنتجات", icon: Package },
  { href: "/admin/inventory", label: "المخزون", icon: Warehouse },
  { href: "/admin/categories", label: "التصنيفات", icon: Tags },
  { href: "/admin/brands", label: "الشركات", icon: Boxes },
  { href: "/admin/coupons", label: "الكوبونات", icon: Percent },
  { href: "/admin/customers", label: "العملاء", icon: Users },
  { href: "/admin/shipping", label: "الشحن", icon: Truck },
  { href: "/admin/users", label: "المستخدمون", icon: ShieldCheck },
  { href: "/admin/settings", label: "الإعدادات", icon: Cog },
  { href: "/admin/audit", label: "سجل النشاط", icon: ScrollText },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="grid gap-1">
      {ADMIN_NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold transition",
              active ? "bg-accent/15 text-accent" : "text-slate-400 hover:bg-ink-800 hover:text-white",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminBreadcrumbTitle({ title }: { title: string }) {
  return <h1 className="text-xl font-extrabold text-white sm:text-2xl">{title}</h1>;
}

export function AdminTopLinks() {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Link href="/" className="rounded-lg border border-line px-3 py-2 font-bold text-slate-300 transition hover:border-accent/40 hover:text-accent">
        عرض المتجر
      </Link>
    </div>
  );
}

export function AdminStatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-emerald-400" /> مدفوع/مسلّم
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-amber-400" /> بانتظار إجراء
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-rose-400" /> ملغي/مرفوض
      </span>
    </div>
  );
}

export { ClipboardList };
