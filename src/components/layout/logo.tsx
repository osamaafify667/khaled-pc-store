import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/" aria-label="KHALED PC STORE — الصفحة الرئيسية" className={cn("group inline-flex items-center gap-2.5", className)}>
      <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-accent/30 bg-gradient-to-br from-ink-800 to-ink-900 shadow-[0_0_28px_-12px_rgba(46,230,168,0.6)]">
        <span className="text-lg font-black tracking-tighter text-accent">K</span>
        <span className="absolute -bottom-1 -left-1 h-4 w-4 rounded-full bg-sky-brand/20 blur-sm" />
      </span>
      <span className="leading-none">
        <span className="block text-lg font-black tracking-[0.16em] text-white transition group-hover:text-accent">
          KHALED<span className="text-accent">.</span>
        </span>
        {!compact ? (
          <span className="mt-1 block text-[9px] font-bold tracking-[0.32em] text-slate-500">PC STORE · القاهرة</span>
        ) : null}
      </span>
    </Link>
  );
}
