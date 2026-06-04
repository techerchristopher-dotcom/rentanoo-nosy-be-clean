import { useExchangeRate } from "@/contexts/ExchangeRateContext";
import { cn } from "@/lib/utils";

type DualPriceProps = {
  /** Montant de référence en ariary (MGA). */
  amountMga: number;
  variant: "client" | "admin";
  className?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
  showFootnote?: boolean;
  inline?: boolean;
};

export function DualPrice({
  amountMga,
  variant,
  className,
  primaryClassName,
  secondaryClassName,
  showFootnote = false,
  inline = false,
}: DualPriceProps) {
  const { formatClient, formatAdmin, footnote } = useExchangeRate();
  const formatted = variant === "admin" ? formatAdmin(amountMga) : formatClient(amountMga);

  if (inline) {
    return (
      <span className={className}>
        {formatted.primary}{" "}
        <span className={cn("text-muted-foreground", secondaryClassName)}>({formatted.secondary})</span>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex flex-col", className)}>
      <span className={cn("font-medium tabular-nums", primaryClassName)}>{formatted.primary}</span>
      <span className={cn("text-sm text-muted-foreground tabular-nums", secondaryClassName)}>{formatted.secondary}</span>
      {showFootnote ? (
        <span className="text-[10px] text-muted-foreground/80 mt-0.5">{footnote}</span>
      ) : null}
    </span>
  );
}
