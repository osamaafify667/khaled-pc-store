import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StockBadge({
  available,
  threshold = 3,
  className,
}: {
  available: number;
  threshold?: number;
  className?: string;
}) {
  const base = cn("px-2 py-0.5 text-[10px]", className);
  if (available <= 0) return <Badge tone="danger" className={base}>غير متوفر</Badge>;
  if (available <= threshold) return <Badge tone="warning" className={base}>متبقي {available} فقط</Badge>;
  return <Badge tone="success" className={base}>متوفر</Badge>;
}
