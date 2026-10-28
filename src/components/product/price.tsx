import { formatPrice, discountPercent, cn } from "@/lib/utils";

export function Price({
  value,
  compareAt,
  size = "md",
  className,
  showDiscount = true,
}: {
  value: number | { toString(): string };
  compareAt?: number | { toString(): string } | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showDiscount?: boolean;
}) {
  const price = Number(value);
  const compare = compareAt === null || compareAt === undefined ? null : Number(compareAt);
  const percent = discountPercent(price, compare);

  const sizeClass = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
    xl: "text-3xl sm:text-4xl",
  }[size];

  return (
    <div className={cn("flex flex-wrap items-baseline gap-2", className)}>
      <span className={cn("font-extrabold text-white", sizeClass)}>{formatPrice(price)}</span>
      {compare && compare > price ? (
        <span className={cn("text-slate-500 line-through", size === "xl" ? "text-base" : "text-xs")}>
          {formatPrice(compare)}
        </span>
      ) : null}
      {showDiscount && percent ? (
        <span className="rounded-md bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-extrabold text-rose-300">
          -{percent}%
        </span>
      ) : null}
    </div>
  );
}
