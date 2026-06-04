import type { ReactNode } from "react";
import { DualPrice } from "@/components/currency/DualPrice";
import { cn } from "@/lib/utils";

/** Ligne prix client (€ puis Ar) — alignée à droite pour les récapitulatifs. */
export function ClientPriceRow({
  label,
  amountEur,
  className,
  labelClassName,
  bold = false,
}: {
  label: ReactNode;
  amountEur: number;
  className?: string;
  labelClassName?: string;
  bold?: boolean;
}) {
  return (
    <div className={cn("flex justify-between items-start gap-4", className)}>
      <span className={cn("text-sm text-muted-foreground", labelClassName)}>{label}</span>
      <DualPrice
        amountEur={amountEur}
        variant="client"
        className="items-end text-right shrink-0"
        primaryClassName={cn("tabular-nums", bold && "font-bold text-foreground")}
        secondaryClassName="text-xs"
      />
    </div>
  );
}

/** Ligne prix admin (Ar puis €) — alignée à droite. */
export function AdminPriceRow({
  label,
  amountEur,
  className,
  bold = false,
}: {
  label: ReactNode;
  amountEur: number;
  className?: string;
  bold?: boolean;
}) {
  return (
    <div className={cn("flex justify-between items-start gap-4", className)}>
      <span className="text-muted-foreground">{label}</span>
      <DualPrice
        amountEur={amountEur}
        variant="admin"
        className="items-end text-right shrink-0"
        primaryClassName={cn("tabular-nums", bold && "font-bold text-base")}
        secondaryClassName="text-xs"
      />
    </div>
  );
}
