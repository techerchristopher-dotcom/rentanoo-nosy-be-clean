import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: {
    label: "En attente",
    className: "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-500/20 dark:text-amber-100",
  },
  pending_payment: {
    label: "En attente de paiement",
    className: "bg-violet-100 text-violet-900 border-violet-200 dark:bg-violet-500/20 dark:text-violet-100",
  },
  confirmed: {
    label: "Confirmée",
    className: "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-100",
  },
  active: {
    label: "En cours",
    className: "bg-sky-100 text-sky-900 border-sky-200 dark:bg-sky-500/20 dark:text-sky-100",
  },
  accepted: {
    label: "Acceptée",
    className: "bg-teal-100 text-teal-900 border-teal-200 dark:bg-teal-500/20 dark:text-teal-100",
  },
  completed: {
    label: "Terminée",
    className: "bg-muted text-muted-foreground border-border",
  },
  cancelled: {
    label: "Annulée",
    className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-500/20 dark:text-red-100",
  },
  terminated: {
    label: "Résiliée",
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
};

type BookingStatusBadgeProps = {
  status: string;
  className?: string;
};

export function BookingStatusBadge({ status, className }: BookingStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
  };

  return (
    <Badge variant="outline" className={cn("font-medium", config.className, className)}>
      {config.label}
    </Badge>
  );
}
