"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function QuantitySelector({
  name = "quantity",
  defaultValue = 1,
  min = 1,
  max = 10,
  onChange,
  className,
  size = "md",
}: {
  name?: string;
  defaultValue?: number;
  min?: number;
  max?: number;
  onChange?: (value: number) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const [value, setValue] = useState(defaultValue);

  const update = (next: number) => {
    const clamped = Math.min(Math.max(next, min), Math.max(max, min));
    setValue(clamped);
    onChange?.(clamped);
  };

  const height = size === "sm" ? "h-9" : "h-11";

  return (
    <div
      className={cn("inline-flex items-center rounded-xl border border-line bg-ink-900", height, className)}
      dir="ltr"
    >
      <button
        type="button"
        onClick={() => update(value + 1)}
        disabled={value >= max}
        aria-label="زيادة الكمية"
        className="flex h-full w-9 items-center justify-center text-slate-300 transition hover:text-accent disabled:opacity-30"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <input
        type="number"
        name={name}
        value={value}
        min={min}
        max={max}
        onChange={(event) => update(Number(event.target.value) || min)}
        className="h-full w-10 border-x border-line bg-transparent text-center text-sm font-bold text-white outline-none"
        aria-label="الكمية"
      />
      <button
        type="button"
        onClick={() => update(value - 1)}
        disabled={value <= min}
        aria-label="تقليل الكمية"
        className="flex h-full w-9 items-center justify-center text-slate-300 transition hover:text-accent disabled:opacity-30"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
