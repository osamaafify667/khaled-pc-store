import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  linkLabel = "عرض الكل",
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-7 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="max-w-2xl">
        {eyebrow ? <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.2em] text-accent">{eyebrow}</p> : null}
        <h2 className="text-2xl sm:text-3xl">{title}</h2>
        {description ? <p className="mt-2 text-sm leading-7 text-slate-400">{description}</p> : null}
      </div>
      {action}
      {href ? (
        <Link href={href} className="link-muted inline-flex shrink-0 items-center gap-1.5 font-semibold hover:text-accent">
          {linkLabel}
          <ArrowLeft className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

export function Section({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("py-10 sm:py-14", className)}>{children}</section>;
}
