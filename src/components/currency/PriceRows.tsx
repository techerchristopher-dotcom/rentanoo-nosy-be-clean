import type { ReactNode } from "react";
import { DualPrice } from "@/components/currency/DualPrice";
import { cn } from "@/lib/utils";

/** Ligne prix client (€ variable puis Ar fixe) — alignée à droite pour les récapitulatifs. */
export function ClientPriceRow({
  label,
  amountMga,
  className,
  labelClassName,
  bold = false,
}: {
  label: ReactNode;
  amountMga: number;
  className?: string;
  labelClassName?: string;
  bold?: boolean;
}) {
  return (
    <div className={cn("flex justify-between items-start gap-4", className)}>
      <span className={cn("text-sm text-muted-foreground", labelClassName)}>{label}</span>
      <DualPrice
        amountMga={amountMga}
        variant="client"
        className="items-end text-right shrink-0"
        primaryClassName={cn("tabular-nums", bold && "font-bold text-foreground")}
        secondaryClassName="text-xs"
      />
    </div>
  );
}

/** Ligne prix admin (Ar fixe puis ≈ €) — alignée à droite. */
export function AdminPriceRow({
  label,
  amountMga,
  className,
  bold = false,
}: {
  label: ReactNode;
  amountMga: number;
  className?: string;
  bold?: boolean;
}) {
  return (
    <div className={cn("flex justify-between items-start gap-4", className)}>
      <span className="text-muted-foreground">{label}</span>
      <DualPrice
        amountMga={amountMga}
        variant="admin"
        className="items-end text-right shrink-0"
        primaryClassName={cn("tabular-nums", bold && "font-bold text-base")}
        secondaryClassName="text-xs"
      />
    </div>
  );
}
