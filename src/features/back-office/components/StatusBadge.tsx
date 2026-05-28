import type { OperationalStatus } from "../types";
import { OPERATIONAL_STATUS_LABELS } from "../types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<OperationalStatus, string> = {
  available: "bg-green-100 text-green-800 border-green-200",
  rented: "bg-blue-100 text-blue-800 border-blue-200",
  reserved: "bg-purple-100 text-purple-800 border-purple-200",
  maintenance: "bg-amber-100 text-amber-800 border-amber-200",
  broken: "bg-red-100 text-red-800 border-red-200",
  accident: "bg-orange-100 text-orange-800 border-orange-200",
  retired: "bg-gray-100 text-gray-600 border-gray-200",
};

type StatusBadgeProps = {
  status: OperationalStatus;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn(STATUS_COLORS[status], className)}>
      {OPERATIONAL_STATUS_LABELS[status]}
    </Badge>
  );
}
