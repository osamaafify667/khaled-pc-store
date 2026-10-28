import { Check, Circle, XCircle } from "lucide-react";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { cn, formatDateTimeShort } from "@/lib/utils";

const STEPS = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export function OrderTimeline({
  status,
  dates,
  cancelledAt,
}: {
  status: string;
  dates: Partial<Record<(typeof STEPS)[number], Date | null>>;
  cancelledAt?: Date | null;
}) {
  if (status === "CANCELLED") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-rose-500/25 bg-rose-500/5 p-4">
        <XCircle className="h-5 w-5 text-rose-400" />
        <div>
          <p className="text-sm font-bold text-rose-200">تم إلغاء الطلب</p>
          {cancelledAt ? <p className="mt-0.5 text-[11px] text-rose-300/80">{formatDateTimeShort(cancelledAt)}</p> : null}
        </div>
      </div>
    );
  }

  const currentIndex = STEPS.indexOf(status as (typeof STEPS)[number]);

  return (
    <ol className="grid gap-4 sm:grid-cols-5">
      {STEPS.map((step, index) => {
        const done = index <= currentIndex;
        const active = index === currentIndex;
        return (
          <li key={step} className="relative flex gap-3 sm:block">
            {index < STEPS.length - 1 ? (
              <span
                className={cn(
                  "absolute right-4 top-8 hidden h-0.5 w-[calc(100%-1rem)] sm:block",
                  index < currentIndex ? "bg-accent/50" : "bg-line",
                )}
              />
            ) : null}
            <div className="relative z-10 flex items-center gap-2 sm:flex-col sm:items-start">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                  done ? "border-accent/50 bg-accent/15 text-accent" : "border-line bg-ink-900 text-slate-600",
                  active && "ring-2 ring-accent/20",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
              </span>
              <div className="sm:mt-2">
                <p className={cn("text-[11px] font-bold", done ? "text-slate-200" : "text-slate-500")}>
                  {ORDER_STATUS_LABELS[step]}
                </p>
                {dates[step] ? (
                  <p className="mt-0.5 text-[10px] text-slate-500">{formatDateTimeShort(dates[step]!)}</p>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
