import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("surface flex flex-col items-center justify-center gap-3 px-6 py-14 text-center", className)}>
      {icon ? <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-800 text-accent">{icon}</div> : null}
      <h3 className="text-lg text-white">{title}</h3>
      {description ? <p className="max-w-md text-sm leading-7 text-slate-400">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
