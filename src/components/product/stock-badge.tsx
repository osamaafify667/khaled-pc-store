import { Badge } from "@/components/ui/badge";

export function StockBadge({ available, threshold = 3 }: { available: number; threshold?: number }) {
  if (available <= 0) return <Badge tone="danger">غير متوفر</Badge>;
  if (available <= threshold) return <Badge tone="warning">متبقي {available} فقط</Badge>;
  return <Badge tone="success">متوفر</Badge>;
}
