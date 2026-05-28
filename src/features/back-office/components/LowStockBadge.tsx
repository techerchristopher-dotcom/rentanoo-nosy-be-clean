import { Badge } from "@/components/ui/badge";
import type { Part } from "../types";
import { isLowStock } from "../services/partsService";

export function LowStockBadge({ part }: { part: Part }) {
  if (!isLowStock(part)) return null;
  return (
    <Badge variant="destructive" className="text-xs">
      Stock bas ({part.quantity_on_hand}/{part.quantity_min})
    </Badge>
  );
}
