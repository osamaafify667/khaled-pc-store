import Link from "next/link";
import { ChevronLeft, Home } from "lucide-react";

export function Breadcrumbs({ items }: { items: Array<{ href?: string; label: string }> }) {
  return (
    <nav aria-label="مسار التنقل" className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
      <Link href="/" className="flex items-center gap-1 transition hover:text-accent">
        <Home className="h-3.5 w-3.5" />
        الرئيسية
      </Link>
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-1.5">
          <ChevronLeft className="h-3.5 w-3.5 text-slate-600" />
          {item.href ? (
            <Link href={item.href} className="transition hover:text-accent">
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-400">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
