import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  totalPages,
  hrefFor,
  className,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i += 1) pages.push(i);

  return (
    <nav className={cn("mt-8 flex flex-wrap items-center justify-center gap-2", className)} aria-label="ترقيم الصفحات">
      <Link
        href={hrefFor(Math.max(1, page - 1))}
        aria-disabled={page === 1}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl border border-line text-slate-300 transition hover:border-accent/40 hover:text-accent",
          page === 1 && "pointer-events-none opacity-40",
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
      {start > 1 ? (
        <>
          <PageLink page={1} current={page} hrefFor={hrefFor} />
          {start > 2 ? <span className="px-1 text-slate-500">…</span> : null}
        </>
      ) : null}
      {pages.map((item) => (
        <PageLink key={item} page={item} current={page} hrefFor={hrefFor} />
      ))}
      {end < totalPages ? (
        <>
          {end < totalPages - 1 ? <span className="px-1 text-slate-500">…</span> : null}
          <PageLink page={totalPages} current={page} hrefFor={hrefFor} />
        </>
      ) : null}
      <Link
        href={hrefFor(Math.min(totalPages, page + 1))}
        aria-disabled={page === totalPages}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl border border-line text-slate-300 transition hover:border-accent/40 hover:text-accent",
          page === totalPages && "pointer-events-none opacity-40",
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
    </nav>
  );
}

function PageLink({
  page,
  current,
  hrefFor,
}: {
  page: number;
  current: number;
  hrefFor: (page: number) => string;
}) {
  return (
    <Link
      href={hrefFor(page)}
      aria-current={page === current ? "page" : undefined}
      className={cn(
        "flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition",
        page === current
          ? "border-accent/40 bg-accent/15 text-accent"
          : "border-line text-slate-300 hover:border-accent/30 hover:text-accent",
      )}
    >
      {page}
    </Link>
  );
}
